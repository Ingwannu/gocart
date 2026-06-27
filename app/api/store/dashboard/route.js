import { json, parseProduct, parseRating, requireSellerStore } from "@/lib/api";
import {
	createDashboardProductWhere,
	createLowStockProductWhere,
	createOutOfStockProductWhere,
	normalizeLowStockThreshold,
} from "@/lib/dashboard-metrics.mjs";
import prisma from "@/lib/prisma";

export async function GET(request) {
	const { store, error } = await requireSellerStore();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const lowStockThreshold = normalizeLowStockThreshold(
		searchParams.get("lowStockThreshold"),
	);
	const lowStockWhere = createLowStockProductWhere({
		storeId: store.id,
		threshold: lowStockThreshold,
	});

	const [products, orders, ratings, lowStockProducts, lowStockCount, outOfStockCount] = await Promise.all([
		prisma.product.findMany({
			where: createDashboardProductWhere({ storeId: store.id }),
		}),
		prisma.order.findMany({ where: { storeId: store.id } }),
		prisma.rating.findMany({
			where: { product: { storeId: store.id } },
			include: {
				user: true,
				product: true,
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.product.findMany({
			where: lowStockWhere,
			include: { store: true, group: true, rating: { include: { user: true } } },
			orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
			take: 10,
		}),
		prisma.product.count({ where: lowStockWhere }),
		prisma.product.count({
			where: createOutOfStockProductWhere({ storeId: store.id }),
		}),
	]);

	const totalEarnings = orders.reduce((total, order) => total + order.total, 0);
	const pendingPayout = orders
		.filter(
			(order) =>
				order.isPaid &&
				order.status === "DELIVERED" &&
				["PENDING", "READY"].includes(order.payoutStatus),
		)
		.reduce((total, order) => total + order.payoutAmount, 0);

	return json({
		dashboard: {
			totalProducts: products.length,
			totalEarnings,
			totalOrders: orders.length,
			pendingPayout,
			lowStockThreshold,
			lowStockCount,
			outOfStockCount,
			lowStockProducts: lowStockProducts.map(parseProduct),
			ratings: ratings.map(parseRating),
		},
	});
}
