const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const defaultProductTaxonomy = [
	["Minecraft Plugins", "minecraft-plugins"],
	["Server Packs", "server-packs"],
	["Mod Packs", "mod-packs"],
	["Discord Bots", "discord-bots"],
	["Other Source Code", "other-source-code"],
];

function getSeedAdminConfig(env = process.env) {
	return {
		id: env.ADMIN_ID || "admin_001",
		name: env.ADMIN_NAME || "ingwannu",
		email: String(env.ADMIN_EMAIL || "ingwannu@gmail.com").trim().toLowerCase(),
		password: env.ADMIN_PASSWORD || "ddkcy1914",
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

async function main({ prisma = new PrismaClient(), env = process.env } = {}) {
	const admin = await seedAdmin(prisma, getSeedAdminConfig(env));
	await seedProductTaxonomy(prisma);

	console.log("Admin user created:", admin.email, admin.role);
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
	seedAdmin,
	seedProductTaxonomy,
};
