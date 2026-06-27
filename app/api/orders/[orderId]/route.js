import { json, jsonError, parseOrder, recordAuditLog, requireUser } from "@/lib/api";
import {
	canManageOrderForStore,
	createOrderStockRestoreItems,
	isAllowedOrderStatusTransition,
	normalizeOrderFulfillmentPayload,
	orderStatuses as allowedOrderStatuses,
} from "@/lib/order-filters.mjs";
import prisma from "@/lib/prisma";
import { ensureOrderDownloadGrants } from "@/lib/download-grant.mjs";

const payoutStatuses = ["PENDING", "READY", "PAID", "HOLD"];

function violatesPaidPayoutInvariant(data) {
	return (
		(data.status !== undefined && data.status !== "DELIVERED") ||
		data.isPaid === false ||
		(data.payoutAmount !== undefined && data.payoutAmount <= 0)
	);
}

export async function PATCH(request, { params }) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { orderId } = await params;
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: { store: { include: { user: true, staffMembers: true } } },
	});
	if (!order) return jsonError("Order not found", 404);

	const isStoreManager = canManageOrderForStore(user, order);
	const isBuyer = order.userId === user.id;
	if (!isStoreManager && !isBuyer && user.role !== "admin") {
		return jsonError("Forbidden", 403);
	}

	const body = await request.json();
	const data = {};
	let payoutEvent = null;
	let fulfillmentData;
	try {
		fulfillmentData = normalizeOrderFulfillmentPayload(body);
		Object.assign(data, fulfillmentData);
	} catch (error) {
		return jsonError(error.message);
	}
	if (isBuyer && !isStoreManager && user.role !== "admin") {
		const fulfillmentFields = Object.keys(fulfillmentData);
		if (fulfillmentFields.length) return jsonError("Forbidden", 403);
	}

	if (body.status !== undefined) {
		if (!allowedOrderStatuses.has(body.status)) {
			return jsonError("Invalid order status");
		}
		data.status = body.status;
	}

	if (user.role === "admin") {
		if (body.isPaid !== undefined) data.isPaid = Boolean(body.isPaid);
		if (body.payoutStatus !== undefined) {
			if (!payoutStatuses.includes(body.payoutStatus)) {
				return jsonError("Invalid payout status");
			}
			data.payoutStatus = body.payoutStatus;
		}
		if (body.payoutNote !== undefined) data.payoutNote = body.payoutNote;
		if (body.payoutAmount !== undefined) {
			const payoutAmount = Number(body.payoutAmount);
			if (
				!Number.isFinite(payoutAmount) ||
				payoutAmount < 0 ||
				payoutAmount > order.total
			) {
				return jsonError("Invalid payout amount");
			}
			data.payoutAmount = payoutAmount;
		}
	}

	let updated;
	try {
		updated = await prisma.$transaction(async (tx) => {
			const currentOrder = await tx.order.findUnique({
				where: { id: orderId },
				include: {
					store: { include: { user: true, staffMembers: true } },
					orderItems: { include: { product: true } },
				},
			});
			if (!currentOrder) throw new Error("Order not found");

			const canUpdateCurrentOrder =
				user.role === "admin" ||
				currentOrder.userId === user.id ||
				canManageOrderForStore(user, currentOrder);
			if (!canUpdateCurrentOrder) throw new Error("Forbidden");

			if (
				body.status !== undefined &&
				!isAllowedOrderStatusTransition({
					actorRole: user.role,
					isBuyer: currentOrder.userId === user.id && !isStoreManager,
					currentStatus: currentOrder.status,
					nextStatus: body.status,
				})
			) {
				throw new Error("Invalid order status transition");
			}

			if (user.role === "admin") {
				const nextStatus = data.status || currentOrder.status;
				const nextIsPaid = data.isPaid ?? currentOrder.isPaid;
				const nextPayoutStatus = data.payoutStatus || currentOrder.payoutStatus;
				const nextPayoutAmount = data.payoutAmount ?? currentOrder.payoutAmount;

				if (
					nextPayoutStatus === "PAID" &&
					(!nextIsPaid || nextStatus !== "DELIVERED" || nextPayoutAmount <= 0)
				) {
					throw new Error("Only paid and delivered orders can be paid out");
				}

				if (body.payoutStatus !== undefined) {
					data.paidOutAt =
						nextPayoutStatus === "PAID"
							? currentOrder.paidOutAt || new Date()
							: null;
				}

				if (
					body.payoutStatus !== undefined ||
					body.payoutAmount !== undefined ||
					body.payoutNote !== undefined
				) {
					payoutEvent = {
						adminId: user.id,
						status: nextPayoutStatus,
						amount: nextPayoutAmount,
						note: data.payoutNote ?? currentOrder.payoutNote,
					};
				}
			}

			const guardedWhere = {
				id: orderId,
				...(data.payoutStatus === "PAID"
					? {
							isPaid: true,
							status: "DELIVERED",
							payoutAmount: { gt: 0 },
						}
					: {}),
				...(violatesPaidPayoutInvariant(data)
					? { payoutStatus: { not: "PAID" } }
					: {}),
			};

			const updateResult = await tx.order.updateMany({
				where: guardedWhere,
				data,
			});
			if (updateResult.count !== 1) {
				throw new Error("Order payout invariant changed; retry with current state");
			}

			const stockRestoreItems = createOrderStockRestoreItems({
				currentStatus: currentOrder.status,
				nextStatus: data.status,
				orderItems: currentOrder.orderItems,
			});
			for (const item of stockRestoreItems) {
				await tx.product.update({
					where: { id: item.productId },
					data: {
						stockQuantity: { increment: item.quantity },
						inStock: true,
					},
				});
			}

			const nextOrder = await tx.order.findUnique({
				where: { id: orderId },
				include: {
					user: true,
					store: true,
					address: true,
					returnRequest: true,
					orderItems: { include: { product: { include: { rating: true, store: true } } } },
				},
			});

			// When payment flips to paid, issue download grants for digital items.
			if (nextOrder.isPaid) {
				await ensureOrderDownloadGrants(nextOrder, tx);
			}

			if (payoutEvent) {
				await tx.payoutEvent.create({
					data: {
						orderId,
						...payoutEvent,
					},
				});
			}
			await recordAuditLog(tx, {
				actorId: user.id,
				action: resolveOrderAuditAction({
					payoutEvent,
					fulfillmentData,
					status: data.status,
				}),
				targetType: "order",
				targetId: orderId,
				summary: `Updated order ${orderId}`,
				metadata: {
					status: nextOrder.status,
					isPaid: nextOrder.isPaid,
					payoutStatus: nextOrder.payoutStatus,
					payoutAmount: nextOrder.payoutAmount,
					trackingCarrier: nextOrder.trackingCarrier,
					trackingNumber: nextOrder.trackingNumber,
					trackingUrl: nextOrder.trackingUrl,
					actorRole: user.role,
				},
			});

			return nextOrder;
		});
	} catch (error) {
		const status =
			error.message === "Order not found"
				? 404
				: error.message === "Forbidden"
					? 403
					: 400;
		return jsonError(error.message, status);
	}

	return json({ order: parseOrder(updated) });
}

function resolveOrderAuditAction({ payoutEvent, fulfillmentData, status }) {
	if (payoutEvent) return "PAYOUT_UPDATED";
	if (Object.keys(fulfillmentData).length) return "ORDER_FULFILLMENT_UPDATED";
	if (status === "CANCELLED") return "ORDER_CANCELLED";
	return "ORDER_UPDATED";
}
