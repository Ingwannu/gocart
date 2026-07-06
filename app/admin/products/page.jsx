"use client";
import Loading from "@/components/Loading";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { EyeOffIcon, PackageSearchIcon, TrashIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";

function getInitialStockFilter() {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("stock") || "";
}

function getInitialFeaturedFilter() {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("featured") || "";
}

export default function AdminProducts() {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
	const [loading, setLoading] = useState(true);
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [groups, setGroups] = useState([]);
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("");
	const [group, setGroup] = useState("");
	const [stock, setStock] = useState(getInitialStockFilter);
	const [featured, setFeatured] = useState(getInitialFeaturedFilter);
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const params = useMemo(() => {
		const searchParams = new URLSearchParams({ scope: "admin" });
		if (query.trim()) searchParams.set("q", query.trim());
		if (category) searchParams.set("category", category);
		if (group) searchParams.set("group", group);
		if (stock) searchParams.set("stock", stock);
		if (featured) searchParams.set("featured", featured);
		searchParams.set("page", String(page));
		return searchParams.toString();
	}, [category, featured, group, page, query, stock]);

	const loadProducts = async () => {
		const data = await fetchJson(`/api/products?${params}`);
		setProducts(data.products || []);
		setPagination(data.pagination || null);
	};

	useEffect(() => {
		Promise.all([
			loadProducts(),
			fetchJson("/api/product-categories?public=true")
				.then((data) => setCategories(data.categories || []))
				.catch(() => setCategories([])),
			fetchJson("/api/product-groups?public=true")
				.then((data) => setGroups(data.groups || []))
				.catch(() => setGroups([])),
		])
			.catch(() => {
				setProducts([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [params]);

	const updateProduct = async (productId, payload) => {
		const data = await fetchJson(`/api/products/${productId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setProducts((prev) =>
			prev.map((product) =>
				product.id === productId ? data.product : product,
			),
		);
	};

	const deleteProduct = async (productId) => {
		if (!window.confirm(t("admin.deleteProductConfirm"))) return;
		await fetchJson(`/api/products/${productId}`, { method: "DELETE" });
		setProducts((prev) => prev.filter((product) => product.id !== productId));
	};

	if (loading) return <Loading />;

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.products")}{" "}
				<span className="text-foreground font-medium">
					{t("admin.management")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl border border-border rounded-lg p-4 bg-frame">
				<div className="grid md:grid-cols-[1fr_160px_160px_150px_170px] gap-3">
					<label className="relative">
						<PackageSearchIcon
							size={18}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						/>
						<input
							value={query}
							onChange={(event) => {
								setQuery(event.target.value);
								setPage(1);
							}}
							placeholder={t("admin.searchProducts")}
							className="w-full pl-10 pr-3 py-2 border border-border rounded outline-ring"
						/>
					</label>
					<select
						value={category}
						onChange={(event) => {
							setCategory(event.target.value);
							setPage(1);
						}}
						className="px-3 py-2 border border-border rounded outline-ring"
					>
						<option value="">{t("shopPage.allCategories")}</option>
						{categories.map((item) => (
							<option key={item.id} value={item.name}>
								{item.name}
							</option>
						))}
					</select>
					<select
						value={group}
						onChange={(event) => {
							setGroup(event.target.value);
							setPage(1);
						}}
						className="px-3 py-2 border border-border rounded outline-ring"
					>
						<option value="">{t("shopPage.allGroups")}</option>
						{groups.map((item) => (
							<option key={item.id} value={item.slug}>
								{item.name}
							</option>
						))}
					</select>
					<select
						value={stock}
						onChange={(event) => {
							setStock(event.target.value);
							setPage(1);
						}}
						className="px-3 py-2 border border-border rounded outline-ring"
					>
						<option value="">{t("admin.allStock")}</option>
						<option value="low">{t("admin.lowStock")}</option>
						<option value="in">{t("store.inStock")}</option>
						<option value="out">{t("admin.outOfStock")}</option>
					</select>
					<select
						value={featured}
						onChange={(event) => {
							setFeatured(event.target.value);
							setPage(1);
						}}
						className="px-3 py-2 border border-border rounded outline-ring"
					>
						<option value="">{t("admin.allFeatured")}</option>
						<option value="true">{t("admin.featuredProducts")}</option>
						<option value="false">{t("admin.notFeaturedProducts")}</option>
					</select>
				</div>
				<div className="overflow-x-auto mt-4">
					<table className="min-w-full text-sm">
						<thead className="bg-muted text-muted-foreground">
							<tr>
								<th className="py-3 px-4 text-left">{t("store.name")}</th>
								<th className="py-3 px-4 text-left">{t("admin.store")}</th>
								<th className="py-3 px-4 text-left">{t("store.price")}</th>
								<th className="py-3 px-4 text-left">
									{t("store.stockQuantity")}
								</th>
								<th className="py-3 px-4 text-left">{t("admin.active")}</th>
								<th className="py-3 px-4 text-left">{t("admin.featured")}</th>
								<th className="py-3 px-4 text-left">{t("admin.action")}</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{products.map((product) => (
								<tr key={product.id} className="hover:bg-muted">
									<td className="py-3 px-4">
										<div className="flex items-center gap-3 text-foreground">
											<Image
												src={resolveProductImageSrc(product.images?.[0])}
												alt=""
												width={40}
												height={40}
												className="size-10 rounded object-cover bg-muted"
											/>
											<div>
												<p className="font-medium">{product.name}</p>
												<p className="text-xs text-muted-foreground">
													{product.group?.name || product.category}
												</p>
											</div>
										</div>
									</td>
									<td className="py-3 px-4 text-foreground">
										<p>{product.store?.name || "-"}</p>
										<p className="text-xs text-muted-foreground">
											/{product.store?.username || "-"}
										</p>
									</td>
									<td className="py-3 px-4 text-foreground">
										{currency}
										{product.price.toLocaleString()}
									</td>
									<td className="py-3 px-4 text-foreground">
										{product.stockQuantity ?? t("store.unlimitedStock")}
									</td>
									<td className="py-3 px-4">
										<input
											type="checkbox"
											checked={product.inStock}
											onChange={(event) =>
												toast.promise(
													updateProduct(product.id, {
														inStock: event.target.checked,
													}),
													{ loading: t("admin.updatingData") },
												)
											}
										/>
									</td>
									<td className="py-3 px-4">
										<input
											type="checkbox"
											checked={Boolean(product.isFeatured)}
											onChange={(event) =>
												toast.promise(
													updateProduct(product.id, {
														isFeatured: event.target.checked,
													}),
													{ loading: t("admin.updatingData") },
												)
											}
										/>
									</td>
									<td className="py-3 px-4">
										<div className="flex items-center gap-3">
											<button
												type="button"
												onClick={() =>
													toast.promise(
														updateProduct(product.id, { inStock: false }),
														{ loading: t("admin.updatingData") },
													)
												}
												className="text-muted-foreground hover:text-foreground"
												title={t("admin.hideProduct")}
											>
												<EyeOffIcon size={18} />
											</button>
											<button
												type="button"
												onClick={() =>
													toast.promise(deleteProduct(product.id), {
														loading: t("admin.deletingProduct"),
													})
												}
												className="text-danger hover:brightness-110"
												title={t("common.delete")}
											>
												<TrashIcon size={18} />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{!products.length && (
						<div className="py-14 text-center text-muted-foreground">
							{t("shopPage.noProductsFound")}
						</div>
					)}
				</div>
				{pagination && pagination.totalPages > 1 && (
					<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
						<span>
							{t("common.pageSummary", {
								page: pagination.page,
								totalPages: pagination.totalPages,
								total: pagination.total,
							})}
						</span>
						<div className="flex gap-2">
							<button
								type="button"
								disabled={!pagination.hasPreviousPage}
								onClick={() => setPage((prev) => Math.max(1, prev - 1))}
								className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
							>
								{t("common.previous")}
							</button>
							<button
								type="button"
								disabled={!pagination.hasNextPage}
								onClick={() => setPage((prev) => prev + 1)}
								className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
							>
								{t("common.next")}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
