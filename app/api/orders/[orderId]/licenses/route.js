import { json, jsonError, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import { canManageOrderForStore } from "@/lib/order-filters.mjs";
import { getLicenseKeysForOrder, serializeLicenseKey } from "@/lib/license-key.mjs";

export async function GET(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { orderId } = await params;
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: { store: { include: { user: true, staffMembers: true } } },
	});
	if (!order) return jsonError("Order not found", 404);

	// The buyer sees their own keys; store managers and admins can audit them.
	const isOwner = order.userId === user.id;
	if (!isOwner && !canManageOrderForStore(user, order) && user.role !== "admin") {
		return jsonError("Forbidden", 403);
	}

	const licenses = await getLicenseKeysForOrder(orderId);
	return json({ licenses: licenses.map(serializeLicenseKey) });
}
