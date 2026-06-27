import {
	json,
	jsonError,
	parseProduct,
	recordAuditLog,
	requireAdmin,
	requireSellerStore,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import { canManageStoreProducts } from "@/lib/store-access.mjs";
import {
	normalizeProductImages,
	normalizeProductStockQuantity,
	normalizeProductTextField,
} from "@/lib/product-edit-form.mjs";
import { normalizeProductDeliveryFields } from "@/lib/digital-product.mjs";
import {
	createAdminProductWhere,
	createProductWhere,
	createSellerProductWhere,
	slugifyGroup,
} from "@/lib/product-groups.mjs";
import { buildProductListPagination } from "@/lib/product-list.mjs";

export async function GET(request) {
	const { searchParams } = new URL(request.url);
	const username = searchParams.get("username");
	const mine = searchParams.get("mine") === "true";
	const scope = searchParams.get("scope");
	const q = searchParams.get("q") || searchParams.get("search");
	const group = searchParams.get("group");
	const category = searchParams.get("category");
	const stock = searchParams.get("stock");
	const featured = searchParams.get("featured");
	const page = searchParams.get("page");
	const limit = searchParams.get("limit");

	if (scope === "admin") {
		const { error } = await requireAdmin();
		if (error) return error;

		const where = createAdminProductWhere({
			q,
			group,
			category,
			username,
			stock,
			featured,
		});
		const total = await prisma.product.count({ where });
		const pagination = buildProductListPagination(
			{ page, limit },
			total,
			{ defaultLimit: 50, maxLimit: 100 },
		);
		const products = await prisma.product.findMany({
			where,
			include: {
				store: true,
				group: true,
				rating: { include: { user: true } },
			},
			orderBy: { createdAt: "desc" },
			skip: pagination.skip,
			take: pagination.take,
		});

		return json({
			products: products.map((product) =>
				parseProduct(product, { includeDigitalAsset: true }),
			),
			pagination,
		});
	}

	if (mine) {
		const { store, error } = await requireSellerStore();
		if (error) return error;

		const where = createSellerProductWhere({
			storeId: store.id,
			q,
			group,
			category,
			stock,
			featured,
		});
		const total = await prisma.product.count({ where });
		const pagination = buildProductListPagination(
			{ page, limit },
			total,
			{ defaultLimit: 50, maxLimit: 100 },
		);
		const products = await prisma.product.findMany({
			where,
			include: {
				store: true,
				group: true,
				rating: { include: { user: true } },
			},
			orderBy: { createdAt: "desc" },
			skip: pagination.skip,
			take: pagination.take,
		});

		return json({
			products: products.map((product) =>
				parseProduct(product, { includeDigitalAsset: true }),
			),
			pagination,
		});
	}

	const where = createProductWhere({ q, group, category, username, featured });
	const total = await prisma.product.count({ where });
	const pagination = buildProductListPagination({ page, limit }, total);
	const products = await prisma.product.findMany({
		where,
		include: {
			store: true,
			group: true,
			rating: { include: { user: true } },
		},
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ products: products.map(parseProduct), pagination });
}

export async function POST(request) {
	const { user, store, error } = await requireSellerStore();
	if (error) return error;
	if (user.role !== "admin" && !canManageStoreProducts(user, store)) {
		return jsonError("Store staff permission is required", 403);
	}

	const body = await request.json();
	const images = normalizeProductImages(body.images);
	const mrp = Number(body.mrp);
	const price = Number(body.price);
	let delivery;
	let stockQuantity = null;
	let name;
	let description;
	let category;
	try {
		name = normalizeProductTextField("name", body.name);
		description = normalizeProductTextField("description", body.description);
		category = normalizeProductTextField("category", body.category);
		stockQuantity = normalizeProductStockQuantity(body.stockQuantity);
		delivery = normalizeProductDeliveryFields(body);
	} catch (error) {
		return jsonError(error.message);
	}
	const group = body.groupId
		? await prisma.productGroup.findFirst({
				where: { id: body.groupId, isActive: true },
			})
		: category
			? await prisma.productGroup.findFirst({
					where: { slug: slugifyGroup(category), isActive: true },
				})
			: null;

	if (body.groupId && !group) return jsonError("Product group not found", 404);
	if (images.length === 0) {
		return jsonError("Missing required product fields");
	}
	if (
		!Number.isFinite(mrp) ||
		!Number.isFinite(price) ||
		mrp <= 0 ||
		price <= 0 ||
		price > mrp
	) {
		return jsonError("Invalid product pricing");
	}

	const product = await prisma.$transaction(async (tx) => {
		const created = await tx.product.create({
			data: {
				name,
				description,
				mrp,
				price,
				category: group?.name || category,
				groupId: group?.id || null,
				inStock: stockQuantity === 0 ? false : true,
				stockQuantity:
					delivery.deliveryType === "digital" ? null : stockQuantity,
				...delivery,
				images: JSON.stringify(images),
				storeId: store.id,
			},
			include: {
				store: true,
				group: true,
				rating: { include: { user: true } },
			},
		});
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_CREATED",
			targetType: "product",
			targetId: created.id,
			summary: `Created product ${created.name}`,
			metadata: {
				name: created.name,
				storeId: store.id,
				storeName: store.name,
				actorRole: user.role,
			},
		});
		return created;
	});

	return json(
		{ product: parseProduct(product, { includeDigitalAsset: true }) },
		{ status: 201 },
	);
}
