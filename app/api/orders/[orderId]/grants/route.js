import { json, jsonError, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import { canManageOrderForStore } from "@/lib/order-filters.mjs";
import { getDownloadGrantsForOrder } from "@/lib/download-grant.mjs";

export async function GET(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { orderId } = await params;
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: { store: { include: { user: true, staffMembers: true } } },
	});
	if (!order) return jsonError("Order not found", 404);

	// Store managers and admins can audit grants; the buyer is allowed to see
	// their own links so they can identify which download is which.
	const isOwner = order.userId === user.id;
	if (!isOwner && !canManageOrderForStore(user, order)) {
		return jsonError("Forbidden", 403);
	}

	const grants = await getDownloadGrantsForOrder(orderId);
	return json({
		grants: grants.map((grant) => ({
			id: grant.id,
			token: grant.token,
			productId: grant.productId,
			productName: grant.product?.name || "",
			maxDownloads: grant.maxDownloads,
			downloadCount: grant.downloadCount,
			expiresAt: grant.expiresAt,
			revokedAt: grant.revokedAt,
			createdAt: grant.createdAt,
			updatedAt: grant.updatedAt,
		})),
	});
}
