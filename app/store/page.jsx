"use client";
import Loading from "@/components/Loading";
import {
	CircleDollarSignIcon,
	AlertTriangleIcon,
	ShoppingBasketIcon,
	StarIcon,
	TagsIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function Dashboard() {
	const { t } = useTranslation();
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [dashboardData, setDashboardData] = useState({
		totalProducts: 0,
		totalEarnings: 0,
		totalOrders: 0,
		pendingPayout: 0,
		lowStockCount: 0,
		outOfStockCount: 0,
		lowStockThreshold: 5,
		lowStockProducts: [],
		ratings: [],
	});

	const dashboardCardsData = [
		{
			title: t("admin.totalProducts"),
			value: dashboardData.totalProducts,
			icon: ShoppingBasketIcon,
		},
		{
			title: t("store.totalEarnings"),
			value: currency + dashboardData.totalEarnings,
			icon: CircleDollarSignIcon,
		},
		{
			title: "Pending payout",
			value: currency + dashboardData.pendingPayout,
			icon: CircleDollarSignIcon,
		},
		{
			title: t("admin.totalOrders"),
			value: dashboardData.totalOrders,
			icon: TagsIcon,
		},
		{
			title: t("store.totalRatings"),
			value: dashboardData.ratings.length,
			icon: StarIcon,
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
		fetchJson("/api/store/dashboard")
			.then((data) => setDashboardData(data.dashboard))
			.catch(() =>
				setDashboardData({
					totalProducts: 0,
					totalEarnings: 0,
					totalOrders: 0,
					pendingPayout: 0,
					lowStockCount: 0,
					outOfStockCount: 0,
					lowStockThreshold: 5,
					lowStockProducts: [],
					ratings: [],
				}),
			)
			.finally(() => setLoading(false));
	}, []);
	if (loading) return <Loading />;

	return (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("store.dashboard")}{" "}
				<span className="text-slate-800 font-medium">
					{t("store.sellerDashboard")}
				</span>
			</h1>
			<div className="flex flex-wrap gap-5 my-10 mt-4">
				{dashboardCardsData.map((card, index) => (
					<div
						key={index}
						className="flex items-center gap-11 border border-slate-200 p-3 px-6 rounded-lg"
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
						href="/store/manage-product?stock=low"
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
								<p className="text-xs text-slate-400">{product.category}</p>
							</div>
							<p>{product.group?.name || product.category}</p>
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
			<h2>{t("store.totalReviews")}</h2>
			<div className="mt-5">
				{dashboardData.ratings.map((review, index) => (
					<div
						key={index}
						className="flex max-sm:flex-col gap-5 sm:items-center justify-between py-6 border-b border-slate-200 text-sm text-slate-600 max-w-4xl"
					>
						<div>
							<div className="flex gap-3">
								<Image
									src={review.user.image}
									alt=""
									className="w-10 aspect-square rounded-full"
									width={100}
									height={100}
								/>
								<div>
									<p className="font-medium">{review.user.name}</p>
									<p className="font-light text-slate-500">
										{new Date(review.createdAt).toDateString()}
									</p>
								</div>
							</div>
							<p className="mt-3 text-slate-500 max-w-xs leading-6">
								{review.review}
							</p>
						</div>
						<div className="flex flex-col justify-between gap-6 sm:items-end">
							<div className="flex flex-col sm:items-end">
								<p className="text-slate-400">{review.product?.category}</p>
								<p className="font-medium">{review.product?.name}</p>
								<div className="flex items-center">
									{Array(5)
										.fill("")
										.map((_, index) => (
											<StarIcon
												key={index}
												size={17}
												className="text-transparent mt-0.5"
												fill={
													review.rating >= index + 1 ? "#FF7A29" : "#D1D5DB"
												}
											/>
										))}
								</div>
							</div>
							<button
								onClick={() => router.push(`/product/${review.product.id}`)}
								className="bg-slate-100 px-5 py-2 hover:bg-slate-200 rounded transition-all"
							>
								{t("store.viewProduct")}
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
