import { json, jsonError, requireUser } from "@/lib/api";
import { normalizeWishlistProductId } from "@/lib/wishlist.mjs";
import prisma from "@/lib/prisma";

export async function DELETE(_request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { productId } = await params;
	let normalizedProductId;
	try {
		normalizedProductId = normalizeWishlistProductId(productId);
	} catch (error) {
		return jsonError(error.message);
	}

	const result = await prisma.wishlistItem.deleteMany({
		where: {
			userId: user.id,
			productId: normalizedProductId,
		},
	});

	return json({ saved: false, removed: result.count > 0 });
}
