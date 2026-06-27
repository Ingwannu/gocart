import {
	json,
	jsonError,
	normalizeAmount,
	parseOrder,
	requireSellerStore,
	requireUser,
} from "@/lib/api";
import { buildOrderPagination, createOrderWhere } from "@/lib/order-filters.mjs";
import {
	createStripeCheckoutSession,
	isStripeCheckoutConfigured,
} from "@/lib/payment-checkout.mjs";
import {
	normalizeCheckoutCouponCode,
	resolveCheckoutCouponBlock,
} from "@/lib/coupon-admin.mjs";
import { orderRequiresShippingAddress } from "@/lib/digital-product.mjs";
import prisma from "@/lib/prisma";

const INSUFFICIENT_STOCK_ERROR = "INSUFFICIENT_STOCK";

function groupItemsByStore(items, products) {
	return items.reduce((groups, item) => {
		const product = products.find((entry) => entry.id === item.productId);
		if (!product) return groups;
		const current = groups.get(product.storeId) || [];
		current.push({ product, quantity: item.quantity });
		groups.set(product.storeId, current);
		return groups;
	}, new Map());
}

async function removeCreatedOrdersAndRestoreStock(orderIds) {
	await prisma.$transaction(async (tx) => {
		const orders = await tx.order.findMany({
			where: { id: { in: orderIds } },
			include: { orderItems: { include: { product: true } } },
		});

		for (const order of orders) {
			for (const item of order.orderItems) {
				if (item.product.stockQuantity === null) continue;
				await tx.product.update({
					where: { id: item.productId },
					data: {
						stockQuantity: { increment: item.quantity },
						inStock: true,
					},
				});
			}
		}

		await tx.order.deleteMany({ where: { id: { in: orderIds } } });
	});
}

export async function GET(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const scope = searchParams.get("scope") || "buyer";
	let storeId = null;

	if (scope === "admin") {
		if (user.role !== "admin") return jsonError("Forbidden", 403);
	} else if (scope === "store") {
		const { store, error } = await requireSellerStore();
		if (error) return error;
		storeId = store.id;
	}

	const where = createOrderWhere({
		scope,
		userId: user.id,
		storeId,
		q: searchParams.get("q"),
		status: searchParams.get("status"),
		payoutStatus: searchParams.get("payoutStatus"),
		paid: searchParams.get("paid"),
	});
	const total = await prisma.order.count({ where });
	const pagination = buildOrderPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);

	const orders = await prisma.order.findMany({
		where,
		include: {
			user: true,
			store: true,
			address: true,
			returnRequest: true,
			orderItems: { include: { product: { include: { rating: true, store: true } } } },
		},
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({ orders: orders.map(parseOrder), pagination });
}

export async function POST(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const body = await request.json();
	const rawItems = Array.isArray(body.items) ? body.items : [];
	const itemMap = new Map();
	for (const item of rawItems) {
		const quantity = Number(item.quantity);
		if (
			!item.productId ||
			!Number.isSafeInteger(quantity) ||
			quantity <= 0 ||
			quantity > 99
		) {
			return jsonError("Invalid cart item quantity");
		}
		itemMap.set(item.productId, (itemMap.get(item.productId) || 0) + quantity);
		if (itemMap.get(item.productId) > 99) {
			return jsonError("Invalid cart item quantity");
		}
	}
	const items = Array.from(itemMap.entries()).map(([productId, quantity]) => ({
		productId,
		quantity,
	}));
	if (!items.length) return jsonError("Cart is empty");
	const paymentMethod = body.paymentMethod === "STRIPE" ? "STRIPE" : "COD";
	if (paymentMethod === "STRIPE" && !isStripeCheckoutConfigured()) {
		return jsonError("Stripe checkout is not configured", 503);
	}

	const products = await prisma.product.findMany({
		where: {
			id: { in: items.map((item) => item.productId) },
			inStock: true,
			isArchived: false,
			store: { status: "approved", isActive: true },
		},
		include: { store: true },
	});
	if (products.length !== items.length) {
		return jsonError("Some products are unavailable");
	}
	const requiresShippingAddress = orderRequiresShippingAddress(products);
	let address = null;
	if (requiresShippingAddress) {
		if (!body.addressId) return jsonError("Address is required");
		address = await prisma.address.findFirst({
			where: { id: body.addressId, userId: user.id },
		});
		if (!address) return jsonError("Address not found", 404);
	}
	const outOfStockItem = items.find((item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return product?.stockQuantity !== null && product.stockQuantity < item.quantity;
	});
	if (outOfStockItem) {
		return jsonError("Some products do not have enough stock", 409);
	}

	const requestedCouponCode = normalizeCheckoutCouponCode(body.coupon);
	const coupon = requestedCouponCode
		? await prisma.coupon.findUnique({ where: { code: requestedCouponCode } })
		: null;
	const previousOrderCount = coupon?.forNewUser
		? await prisma.order.count({ where: { userId: user.id } })
		: 0;
	const couponBlock = resolveCheckoutCouponBlock({
		requestedCode: requestedCouponCode,
		coupon,
		userRole: user.role,
		previousOrderCount,
	});
	if (couponBlock) return jsonError(couponBlock.message, couponBlock.status);
	const groupedItems = groupItemsByStore(items, products);
	const subtotal = items.reduce((total, item) => {
		const product = products.find((entry) => entry.id === item.productId);
		return total + product.price * Number(item.quantity || 1);
	}, 0);
	const discount = coupon ? normalizeAmount((coupon.discount / 100) * subtotal) : 0;

	let orders;
	try {
		orders = await prisma.$transaction(async (tx) => {
			for (const item of items) {
				const product = products.find((entry) => entry.id === item.productId);
				if (product.stockQuantity === null) continue;

				const updated = await tx.product.updateMany({
					where: {
						id: product.id,
						inStock: true,
						isArchived: false,
						stockQuantity: { gte: item.quantity },
					},
					data: { stockQuantity: { decrement: item.quantity } },
				});
				if (updated.count !== 1) throw new Error(INSUFFICIENT_STOCK_ERROR);
				await tx.product.updateMany({
					where: { id: product.id, stockQuantity: 0 },
					data: { inStock: false },
				});
			}

			return Promise.all(
				Array.from(groupedItems.entries()).map(([storeId, storeItems]) => {
					const groupSubtotal = storeItems.reduce(
						(total, item) => total + item.product.price * item.quantity,
						0,
					);
					const groupDiscount =
						subtotal > 0 ? (discount * groupSubtotal) / subtotal : 0;
					const total = Number(
						Math.max(groupSubtotal - groupDiscount, 0).toFixed(2),
					);

					return tx.order.create({
						data: {
							total,
							userId: user.id,
							storeId,
							addressId: address?.id || null,
							paymentMethod,
							isPaid: false,
							isCouponUsed: Boolean(coupon),
							coupon: coupon ? JSON.stringify(coupon) : "{}",
							payoutAmount: total,
							orderItems: {
								create: storeItems.map((item) => ({
									productId: item.product.id,
									quantity: item.quantity,
									price: item.product.price,
								})),
							},
						},
						include: {
							user: true,
							store: true,
							address: true,
							returnRequest: true,
							orderItems: {
								include: { product: { include: { rating: true, store: true } } },
							},
						},
					});
				}),
			);
		});
	} catch (error) {
		if (error.message === INSUFFICIENT_STOCK_ERROR) {
			return jsonError("Some products do not have enough stock", 409);
		}
		throw error;
	}

	if (paymentMethod === "STRIPE") {
		let checkoutSession;
		try {
			checkoutSession = await createStripeCheckoutSession({
				orders,
				user,
				baseUrl: process.env.NEXTAUTH_URL || new URL(request.url).origin,
			});
			await prisma.order.updateMany({
				where: { id: { in: orders.map((order) => order.id) } },
				data: { paymentReference: checkoutSession.id },
			});
			orders = orders.map((order) => ({
				...order,
				paymentReference: checkoutSession.id,
			}));
		} catch (error) {
			await removeCreatedOrdersAndRestoreStock(orders.map((order) => order.id));
			return jsonError(error.message, 502);
		}

		return json(
			{
				orders: orders.map(parseOrder),
				checkoutUrl: checkoutSession.url,
				checkoutSessionId: checkoutSession.id,
			},
			{ status: 201 },
		);
	}

	return json({ orders: orders.map(parseOrder) }, { status: 201 });
}
