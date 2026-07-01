import { json, jsonError, requireUser } from "@/lib/api";
import { buildOrderReceipt, canAccessOrderReceipt } from "@/lib/order-receipt.mjs";
import prisma from "@/lib/prisma";
import { getGeneralSettings } from "@/lib/site-settings.mjs";

export async function GET(_request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { orderId } = await params;
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			user: true,
			store: { include: { staffMembers: true } },
			address: true,
			returnRequest: true,
			orderItems: {
				include: {
					product: {
						select: {
							id: true,
							name: true,
							category: true,
						},
					},
				},
			},
		},
	});
	if (!order) return jsonError("Order not found", 404);
	if (!canAccessOrderReceipt(user, order)) return jsonError("Forbidden", 403);

	const settings = await getGeneralSettings();
	return json({
		receipt: buildOrderReceipt(order, {
			currency: settings.currencySymbol,
		}),
	});
}
