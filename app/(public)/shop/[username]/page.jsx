"use client";
import ProductCard from "@/components/ProductCard";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MailIcon, MapPinIcon, SearchIcon } from "lucide-react";
import Loading from "@/components/Loading";
import Image from "next/image";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function StoreShop() {
	const { t } = useTranslation();
	const { username } = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const search = searchParams.get("search") || searchParams.get("q") || "";
	const group = searchParams.get("group") || "";
	const category = searchParams.get("category") || "";
	const [products, setProducts] = useState([]);
	const [categories, setCategories] = useState([]);
	const [groups, setGroups] = useState([]);
	const [storeInfo, setStoreInfo] = useState(null);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState(search);

	const fetchStoreData = async () => {
		setLoading(true);
		const storeData = await fetchJson(`/api/stores?username=${username}`);
		setStoreInfo(storeData.store);
		const params = new URLSearchParams({ username });
		if (search) params.set("q", search);
		if (group) params.set("group", group);
		if (category) params.set("category", category);
		const productData = await fetchJson(`/api/products?${params.toString()}`);
		const categoryData = await fetchJson("/api/product-categories?public=true");
		const groupData = await fetchJson("/api/product-groups?public=true");
		setProducts(productData.products || []);
		setCategories(categoryData.categories || []);
		setGroups(groupData.groups || []);
		setLoading(false);
	};

	useEffect(() => {
		setQuery(search);
		fetchStoreData().catch(() => setLoading(false));
	}, [username, search, group, category]);

	const updateParams = (updates) => {
		const params = new URLSearchParams(searchParams.toString());
		for (const [key, value] of Object.entries(updates)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		router.push(`/shop/${username}?${params.toString()}`);
	};

	const submitSearch = (event) => {
		event.preventDefault();
		updateParams({ search: query.trim() });
	};

	return !loading ? (
		<div className="min-h-[70vh] mx-6">
			{storeInfo && (
				<div className="max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs">
					<Image
						src={storeInfo.logo || "/favicon.ico"}
						alt={storeInfo.name}
						className="size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md"
						width={200}
						height={200}
					/>
					<div className="text-center md:text-left">
						<h1 className="text-3xl font-semibold text-slate-800">
							{storeInfo.name}
						</h1>
						<p className="text-sm text-slate-600 mt-2 max-w-lg">
							{storeInfo.description}
						</p>
						<div className="space-y-2 text-sm text-slate-500 mt-4">
							<div className="flex items-center">
								<MapPinIcon className="w-4 h-4 text-gray-500 mr-2" />
								<span>{storeInfo.address}</span>
							</div>
							<div className="flex items-center">
								<MailIcon className="w-4 h-4 text-gray-500 mr-2" />
								<span>{storeInfo.email}</span>
							</div>
						</div>
					</div>
				</div>
			)}
			<div className="max-w-7xl mx-auto mb-40">
				<h1 className="text-2xl mt-12">{t("storeShop.shopProducts")}</h1>
				<form
					onSubmit={submitSearch}
					className="mt-5 max-w-xl flex items-center gap-2 border border-slate-200 rounded px-3 py-2"
				>
					<SearchIcon size={18} className="text-slate-400" />
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("storeShop.searchStoreProducts")}
						className="w-full outline-none text-sm text-slate-700"
					/>
					<button className="px-4 py-1.5 bg-[#1A1A1A] text-white rounded hover:bg-orange-600 text-sm">
						{t("common.search")}
					</button>
				</form>
				<div className="flex flex-wrap gap-2 mt-4">
					<button
						onClick={() => updateParams({ category: "" })}
						className={`px-4 py-2 rounded-full border ${!category ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
					>
						{t("shopPage.allCategories")}
					</button>
					{categories.map((item) => (
						<button
							key={item.id}
							onClick={() => updateParams({ category: item.name })}
							className={`px-4 py-2 rounded-full border ${category === item.name ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
						>
							{item.name}
						</button>
					))}
				</div>
				<div className="flex flex-wrap gap-2 mt-4">
					<button
						onClick={() => updateParams({ group: "" })}
						className={`px-4 py-2 rounded-full border ${!group ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
					>
						{t("shopPage.allGroups")}
					</button>
					{groups.map((item) => (
						<button
							key={item.id}
							onClick={() => updateParams({ group: item.slug })}
							className={`px-4 py-2 rounded-full border ${group === item.slug ? "bg-[#1A1A1A] text-white" : "border-slate-200 text-slate-600"}`}
						>
							{item.name}
						</button>
					))}
				</div>
				<div className="mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
				{products.length === 0 && (
					<div className="h-60 flex items-center justify-center text-slate-400 text-2xl">
						{t("shopPage.noProductsFound")}
					</div>
				)}
			</div>
		</div>
	) : (
		<Loading />
	);
}
