import {
	json,
	jsonError,
	recordAuditLog,
	requireAdmin,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import { resolveRatingWriteError } from "@/lib/rating.mjs";

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { ratingId } = await params;
	let rating;
	try {
		rating = await prisma.$transaction(async (tx) => {
			const deleted = await tx.rating.delete({
				where: { id: ratingId },
				include: {
					user: true,
					product: true,
				},
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "RATING_DELETED",
				targetType: "rating",
				targetId: deleted.id,
				summary: `Deleted review for ${deleted.product?.name || deleted.productId}`,
				metadata: {
					rating: deleted.rating,
					review: deleted.review,
					userEmail: deleted.user?.email,
					productId: deleted.productId,
				},
			});
			return deleted;
		});
	} catch (error) {
		const writeError = resolveRatingWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ ratingId: rating.id });
}
