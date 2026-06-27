"use client";
import Loading from "@/components/Loading";
import OrdersAreaChart from "@/components/OrdersAreaChart";
import {
	CircleDollarSignIcon,
	AlertTriangleIcon,
	ShoppingBasketIcon,
	StoreIcon,
	TagsIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function AdminDashboard() {
	const { t } = useTranslation();
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const [loading, setLoading] = useState(true);
	const [dashboardData, setDashboardData] = useState({
		products: 0,
		revenue: 0,
		orders: 0,
		stores: 0,
		lowStockCount: 0,
		outOfStockCount: 0,
		lowStockThreshold: 5,
		lowStockProducts: [],
		allOrders: [],
	});

	const dashboardCardsData = [
		{
			title: t("admin.totalProducts"),
			value: dashboardData.products,
			icon: ShoppingBasketIcon,
		},
		{
			title: t("admin.totalRevenue"),
			value: currency + dashboardData.revenue,
			icon: CircleDollarSignIcon,
		},
		{
			title: t("admin.totalOrders"),
			value: dashboardData.orders,
			icon: TagsIcon,
		},
		{
			title: t("admin.totalStores"),
			value: dashboardData.stores,
			icon: StoreIcon,
		},
		{
			title: t("admin.lowStock"),
			value: dashboardData.lowStockCount,
			icon: AlertTriangleIcon,
		},
		{
			title: t("admin.outOfStock"),
			value: dashboardData.outOfStockCount,
			icon: AlertTriangleIcon,
		},
	];

	useEffect(() => {
		fetchJson("/api/admin/dashboard")
			.then((data) => setDashboardData(data.dashboard))
			.catch(() =>
				setDashboardData({
					products: 0,
					revenue: 0,
					orders: 0,
					stores: 0,
					lowStockCount: 0,
					outOfStockCount: 0,
					lowStockThreshold: 5,
					lowStockProducts: [],
					allOrders: [],
				}),
			)
			.finally(() => setLoading(false));
	}, []);

	if (loading) return <Loading />;

	return (
		<div className="text-slate-500">
			<h1 className="text-2xl">
				{t("admin.dashboard")}{" "}
				<span className="text-slate-800 font-medium">
					{t("admin.adminDashboard")}
				</span>
			</h1>
			<div className="flex flex-wrap gap-5 my-10 mt-4">
				{dashboardCardsData.map((card, index) => (
					<div
						key={index}
						className="flex items-center gap-10 border border-slate-200 p-3 px-6 rounded-lg"
					>
						<div className="flex flex-col gap-3 text-xs">
							<p>{card.title}</p>
							<b className="text-2xl font-medium text-slate-700">
								{card.value}
							</b>
						</div>
						<card.icon
							size={50}
							className="w-11 h-11 p-2.5 text-slate-400 bg-slate-100 rounded-full"
						/>
					</div>
				))}
			</div>
			<div className="mb-10 max-w-5xl rounded-lg border border-slate-200 bg-white">
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
					<div>
						<h2 className="font-medium text-slate-800">
							{t("admin.lowStockProducts")}
						</h2>
						<p className="text-xs text-slate-400">
							{t("admin.lowStockThreshold", {
								count: dashboardData.lowStockThreshold,
							})}
						</p>
					</div>
					<Link
						href="/admin/products?stock=low"
						className="rounded border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
					>
						{t("store.manageProducts")}
					</Link>
				</div>
				<div className="divide-y divide-slate-100">
					{(dashboardData.lowStockProducts || []).map((product) => (
						<div
							key={product.id}
							className="grid gap-3 p-4 text-sm md:grid-cols-[minmax(220px,1fr)_160px_120px]"
						>
							<div>
								<p className="font-medium text-slate-700">{product.name}</p>
								<p className="text-xs text-slate-400">
									{product.store?.name || "-"}
								</p>
							</div>
							<p>{product.category}</p>
							<p className={product.stockQuantity === 0 ? "text-red-600" : "text-orange-600"}>
								{product.stockQuantity}
							</p>
						</div>
					))}
					{(dashboardData.lowStockProducts || []).length === 0 && (
						<p className="p-6 text-center text-sm text-slate-400">
							{t("admin.noLowStockProducts")}
						</p>
					)}
				</div>
			</div>
			<OrdersAreaChart allOrders={dashboardData.allOrders} />
		</div>
	);
}
