const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("node:fs/promises");
const path = require("node:path");

const defaultProductTaxonomy = [
	["Minecraft Plugins", "minecraft-plugins"],
	["Server Packs", "server-packs"],
	["Mod Packs", "mod-packs"],
	["Discord Bots", "discord-bots"],
	["Other Source Code", "other-source-code"],
];

function getSeedAdminConfig(env = process.env) {
	// No credential fallbacks: a well-known default admin login is a backdoor.
	if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
		throw new Error(
			"Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running db:seed",
		);
	}
	return {
		id: env.ADMIN_ID || "admin_001",
		name: env.ADMIN_NAME || "admin",
		email: String(env.ADMIN_EMAIL).trim().toLowerCase(),
		password: env.ADMIN_PASSWORD,
	};
}

async function seedAdmin(client, config = getSeedAdminConfig()) {
	const hashedPassword = await bcrypt.hash(config.password, 10);

	return client.user.upsert({
		where: { email: config.email },
		update: {
			name: config.name,
			password: hashedPassword,
			role: "admin",
			isSuspended: false,
		},
		create: {
			id: config.id,
			name: config.name,
			email: config.email,
			password: hashedPassword,
			image: "",
			cart: "{}",
			role: "admin",
			isSuspended: false,
		},
	});
}

async function seedProductTaxonomy(client, entries = defaultProductTaxonomy) {
	for (const [name, slug] of entries) {
		await client.productGroup.upsert({
			where: { slug },
			update: { name, isActive: true },
			create: { name, slug, isActive: true },
		});
	}

	for (const [name, slug] of entries) {
		await client.productCategory.upsert({
			where: { slug },
			update: { name, isActive: true },
			create: { name, slug, isActive: true },
		});
	}
}

async function seedDefaultSettings(client, env = process.env) {
	const defaults = [
		["site_public_url", env.NEXTAUTH_URL || "http://localhost:3001"],
		["site_currency_symbol", env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$"],
		["storage_backend", env.STORAGE_BACKEND || "local"],
	];
	if (env.PASSWORD_RESET_FROM) {
		defaults.push(["password_reset_from", env.PASSWORD_RESET_FROM]);
	}

	for (const [key, value] of defaults) {
		await client.siteSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}
}

async function ensureDemoDownloadFile() {
	const relativePath = path.join("seed", "wicked-survival-starter.txt");
	const absolutePath = path.join(process.cwd(), "storage", "private", "uploads", relativePath);
	await fs.mkdir(path.dirname(absolutePath), { recursive: true });
	await fs.writeFile(
		absolutePath,
		[
			"Wicked Survival Starter Pack",
			"",
			"This seed file proves private digital delivery storage is wired.",
			"Replace it with the real ZIP before selling this product.",
		].join("\n"),
	);
	return `private://uploads/${relativePath.replaceAll(path.sep, "/")}`;
}

/* [Decision Log]
- 목적: 초기 설치 직후 공개 스토어와 공개 상품이 없어 쇼핑몰이 빈 화면처럼 보이는 문제를 줄인다.
- 대안 분석: (1) 문서로만 안내하면 안전하지만 매번 수동 데이터 입력이 필요하다. (2) 마이그레이션에 샘플 데이터를 넣으면 운영 DB에도 의도치 않은 데이터가 고정된다. (3) seed에서 승인 스토어/상품을 upsert하면 개발/스테이징에서 반복 실행 가능하고 운영에서는 seed 실행 여부로 통제할 수 있다.
- 선택 근거: seed upsert가 현재 프로젝트의 `npm run db:seed` 흐름과 맞고, 결제 로직을 건드리지 않으면서 즉시 확인 가능한 공개 상품 상태를 만든다.
*/
async function seedDemoStorefront(client, env = process.env) {
	if (String(env.SEED_DEMO_DATA || "true").toLowerCase() === "false") return null;

	const sellerPassword = await bcrypt.hash(env.SEED_SELLER_PASSWORD || "seller1234", 10);
	const seller = await client.user.upsert({
		where: { email: "seller@teamwicked.local" },
		update: {
			name: "Wicked Seller",
			password: sellerPassword,
			role: "seller",
			isSuspended: false,
		},
		create: {
			id: "seed_seller_001",
			name: "Wicked Seller",
			email: "seller@teamwicked.local",
			password: sellerPassword,
			image: "",
			cart: "{}",
			role: "seller",
			isSuspended: false,
		},
	});
	const store = await client.store.upsert({
		where: { userId: seller.id },
		update: {
			name: "Wicked Digital",
			description: "Ready-to-launch Minecraft plugins, source bundles, and setup files.",
			username: "wicked-digital",
			address: "Seoul, KR",
			status: "approved",
			isActive: true,
			logo: "/seed-product.svg",
			email: "seller@teamwicked.local",
			contact: "010-0000-0000",
		},
		create: {
			id: "seed_store_wicked_digital",
			userId: seller.id,
			name: "Wicked Digital",
			description: "Ready-to-launch Minecraft plugins, source bundles, and setup files.",
			username: "wicked-digital",
			address: "Seoul, KR",
			status: "approved",
			isActive: true,
			logo: "/seed-product.svg",
			email: "seller@teamwicked.local",
			contact: "010-0000-0000",
		},
	});
	const group = await client.productGroup.findUnique({
		where: { slug: "server-packs" },
	});
	const digitalAssetUrl = await ensureDemoDownloadFile();
	const product = await client.product.upsert({
		where: { id: "seed_product_wicked_survival_starter" },
		update: {
			name: "Wicked Survival Starter Pack",
			description:
				"Starter plugin/config bundle for a Minecraft survival server. Replace the seed download with your production ZIP before launch.",
			mrp: 29,
			price: 19,
			images: JSON.stringify(["/seed-product.svg"]),
			category: "Server Packs",
			groupId: group?.id || null,
			inStock: true,
			stockQuantity: null,
			deliveryType: "digital",
			digitalAssetName: "wicked-survival-starter.txt",
			digitalAssetUrl,
			isArchived: false,
			isFeatured: true,
			storeId: store.id,
		},
		create: {
			id: "seed_product_wicked_survival_starter",
			name: "Wicked Survival Starter Pack",
			description:
				"Starter plugin/config bundle for a Minecraft survival server. Replace the seed download with your production ZIP before launch.",
			mrp: 29,
			price: 19,
			images: JSON.stringify(["/seed-product.svg"]),
			category: "Server Packs",
			groupId: group?.id || null,
			inStock: true,
			stockQuantity: null,
			deliveryType: "digital",
			digitalAssetName: "wicked-survival-starter.txt",
			digitalAssetUrl,
			isArchived: false,
			isFeatured: true,
			storeId: store.id,
		},
	});
	return { seller, store, product };
}

async function main({ prisma = new PrismaClient(), env = process.env } = {}) {
	const admin = await seedAdmin(prisma, getSeedAdminConfig(env));
	await seedProductTaxonomy(prisma);
	await seedDefaultSettings(prisma, env);
	const demo = await seedDemoStorefront(prisma, env);

	console.log("Admin user created:", admin.email, admin.role);
	if (demo) {
		console.log("Demo storefront ready:", demo.store.username, demo.product.name);
	}
}

if (require.main === module) {
	const prisma = new PrismaClient();

	main({ prisma })
		.catch((e) => {
			console.error(e);
			process.exit(1);
		})
		.finally(async () => {
			await prisma.$disconnect();
		});
}

module.exports = {
	defaultProductTaxonomy,
	getSeedAdminConfig,
	main,
	seedDefaultSettings,
	seedAdmin,
	seedDemoStorefront,
	seedProductTaxonomy,
};
