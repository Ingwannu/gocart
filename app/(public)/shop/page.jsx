"use client";
import { Suspense, useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { MoveLeftIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import Loading from "@/components/Loading";
import { buildShopHref } from "@/lib/product-list.mjs";

function ShopContent() {
	const { t } = useTranslation();
	const searchParams = useSearchParams();
	const search = searchParams.get("search");
	const group = searchParams.get("group") || "";
	const category = searchParams.get("category") || "";
	const page = searchParams.get("page") || "1";
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [groups, setGroups] = useState([]);
	const [pagination, setPagination] = useState(null);
	const [searchInput, setSearchInput] = useState(search || "");

	useEffect(() => {
		setSearchInput(search || "");
		setLoading(true);
		const params = new URLSearchParams();
		if (search) params.set("q", search);
		if (group) params.set("group", group);
		if (category) params.set("category", category);
		if (page) params.set("page", page);
		Promise.all([
			fetchJson(`/api/products?${params.toString()}`),
			fetchJson("/api/product-categories?public=true"),
			fetchJson("/api/product-groups?public=true"),
		])
			.then(([productData, categoryData, groupData]) => {
				setProducts(productData.products || []);
				setPagination(productData.pagination || null);
				setCategories(categoryData.categories || []);
				setGroups(groupData.groups || []);
			})
			.catch(() => {
				setProducts([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [search, group, category, page]);

	const updateGroup = (nextGroup) => {
		router.push(buildShopHref({ search, group: nextGroup, category }));
	};

	const updateCategory = (nextCategory) => {
		router.push(buildShopHref({ search, group, category: nextCategory }));
	};

	const submitSearch = (event) => {
		event.preventDefault();
		router.push(buildShopHref({ search: searchInput, group, category }));
	};

	return (
		<div className="min-h-[70vh] mx-6">
			<div className="max-w-7xl mx-auto">
				<h1
					onClick={() => router.push("/shop")}
					className="text-2xl text-slate-500 my-6 flex items-center gap-2 cursor-pointer"
				>
					{" "}
					{search && <MoveLeftIcon size={20} />} {t("shopPage.allProducts")}{" "}
					<span className="text-slate-700 font-medium">{t("common.shop")}</span>
				</h1>
				<form
					onSubmit={submitSearch}
					className="mb-5 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_auto_auto]"
				>
					<input
						type="search"
						value={searchInput}
						onChange={(event) => setSearchInput(event.target.value)}
						placeholder={t("shopPage.searchProducts")}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
					/>
					<button
						type="submit"
						className="h-10 rounded bg-[#1A1A1A] px-5 text-sm text-white hover:bg-orange-600"
					>
						{t("common.search")}
					</button>
					<button
						type="button"
						onClick={() => router.push(buildShopHref({ group, category }))}
						className="h-10 rounded border border-slate-200 px-5 text-sm text-slate-700 hover:bg-slate-50"
					>
						{t("ordersPage.reset")}
					</button>
				</form>
				<div className="flex flex-wrap gap-2 mb-6">
					<button
						onClick={() => updateCategory("")}
						className={`px-4 py-2 rounded-full border ${!category ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
					>
						{t("shopPage.allCategories")}
					</button>
					{categories.map((item) => (
						<button
							key={item.id}
							onClick={() => updateCategory(item.name)}
							className={`px-4 py-2 rounded-full border ${category === item.name ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
						>
							{item.name}
						</button>
					))}
				</div>
				<div className="flex flex-wrap gap-2 mb-6">
					<button
						onClick={() => updateGroup("")}
						className={`px-4 py-2 rounded-full border ${!group ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
					>
						{t("shopPage.allGroups")}
					</button>
					{groups.map((item) => (
						<button
							key={item.id}
							onClick={() => updateGroup(item.slug)}
							className={`px-4 py-2 rounded-full border ${group === item.slug ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
						>
							{item.name}
						</button>
					))}
				</div>
				{loading && <Loading />}
				<div className="grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto mb-32">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
				{pagination && pagination.totalPages > 1 && (
					<div className="-mt-20 mb-28 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-600">
						<button
							type="button"
							disabled={!pagination.hasPreviousPage}
							onClick={() =>
								router.push(
									buildShopHref({
										search,
										group,
										category,
										page: pagination.page - 1,
									}),
								)
							}
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.previous")}
						</button>
						<span>
							{t("common.pageSummary", {
								page: pagination.page,
								totalPages: pagination.totalPages,
								total: pagination.total,
							})}
						</span>
						<button
							type="button"
							disabled={!pagination.hasNextPage}
							onClick={() =>
								router.push(
									buildShopHref({
										search,
										group,
										category,
										page: pagination.page + 1,
									}),
								)
							}
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.next")}
						</button>
					</div>
				)}
				{!loading && products.length === 0 && (
					<div className="h-60 flex items-center justify-center text-slate-400 text-2xl">
						{t("shopPage.noProductsFound")}
					</div>
				)}
			</div>
		</div>
	);
}

export default function Shop() {
	return (
		<Suspense fallback={<div>Loading shop...</div>}>
			<ShopContent />
		</Suspense>
	);
}
