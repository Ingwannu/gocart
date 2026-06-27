import { json, parseOrder, parseProduct, requireAdmin } from "@/lib/api";
import {
	createDashboardProductWhere,
	createLowStockProductWhere,
	createOutOfStockProductWhere,
	normalizeLowStockThreshold,
} from "@/lib/dashboard-metrics.mjs";
import prisma from "@/lib/prisma";

export async function GET(request) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { searchParams } = new URL(request.url);
	const lowStockThreshold = normalizeLowStockThreshold(
		searchParams.get("lowStockThreshold"),
	);
	const lowStockWhere = createLowStockProductWhere({
		threshold: lowStockThreshold,
	});
	const outOfStockWhere = createOutOfStockProductWhere();

	const [products, stores, orders, allOrders, lowStockProducts, lowStockCount, outOfStockCount] = await Promise.all([
		prisma.product.count({ where: createDashboardProductWhere() }),
		prisma.store.count(),
		prisma.order.count(),
		prisma.order.findMany({
			include: {
				user: true,
				store: true,
				address: true,
				orderItems: { include: { product: { include: { rating: true, store: true } } } },
			},
			orderBy: { createdAt: "desc" },
			take: 500,
		}),
		prisma.product.findMany({
			where: lowStockWhere,
			include: { store: true, group: true, rating: { include: { user: true } } },
			orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
			take: 10,
		}),
		prisma.product.count({ where: lowStockWhere }),
		prisma.product.count({ where: outOfStockWhere }),
	]);

	const revenue = allOrders.reduce((total, order) => total + order.total, 0);

	return json({
		dashboard: {
			products,
			revenue,
			orders,
			stores,
			lowStockThreshold,
			lowStockCount,
			outOfStockCount,
			lowStockProducts: lowStockProducts.map(parseProduct),
			allOrders: allOrders.map(parseOrder),
		},
	});
}
