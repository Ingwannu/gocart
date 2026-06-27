import { json, jsonError, parseProduct, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	createWishlistProductWhere,
	normalizeWishlistProductId,
	resolveWishlistWriteError,
} from "@/lib/wishlist.mjs";

function productInclude() {
	return {
		store: true,
		group: true,
		rating: { include: { user: true } },
	};
}

export async function GET(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const productId = searchParams.get("productId");
	if (productId) {
		let normalizedProductId;
		try {
			normalizedProductId = normalizeWishlistProductId(productId);
		} catch (error) {
			return jsonError(error.message);
		}
		const saved = await prisma.wishlistItem.count({
			where: { userId: user.id, productId: normalizedProductId },
		});
		return json({ saved: saved > 0 });
	}

	const q = searchParams.get("q");
	const productWhere = createWishlistProductWhere({ q });
	const items = await prisma.wishlistItem.findMany({
		where: {
			userId: user.id,
			product: productWhere,
		},
		include: {
			product: { include: productInclude() },
		},
		orderBy: { createdAt: "desc" },
	});

	return json({
		items: items.map((item) => ({
			id: item.id,
			productId: item.productId,
			createdAt: item.createdAt,
			product: parseProduct(item.product),
		})),
		products: items.map((item) => parseProduct(item.product)),
		count: items.length,
	});
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	let productId;
	try {
		productId = normalizeWishlistProductId(body.productId);
	} catch (error) {
		return jsonError(error.message);
	}

	const product = await prisma.product.findFirst({
		where: { id: productId, ...createWishlistProductWhere() },
		include: productInclude(),
	});
	if (!product) return jsonError("Product not found", 404);

	try {
		await prisma.wishlistItem.create({
			data: {
				userId: user.id,
				productId,
			},
		});
	} catch (error) {
		const writeError = resolveWishlistWriteError(error);
		if (!writeError?.duplicate) throw error;
	}

	return json({ saved: true, product: parseProduct(product) }, { status: 201 });
}
