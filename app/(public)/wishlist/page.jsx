"use client";
import Loading from "@/components/Loading";
import PageTitle from "@/components/PageTitle";
import ProductCard from "@/components/ProductCard";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function WishlistPage() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(true);
	const [products, setProducts] = useState([]);
	const [q, setQ] = useState("");

	useEffect(() => {
		const controller = new AbortController();
		const timer = setTimeout(() => {
			setLoading(true);
			const params = new URLSearchParams();
			if (q.trim()) params.set("q", q.trim());
			fetchJson(`/api/wishlist${params.size ? `?${params.toString()}` : ""}`, {
				signal: controller.signal,
			})
				.then((data) => {
					setProducts(data.products || []);
					setAuthorized(true);
				})
				.catch(() => {
					if (!controller.signal.aborted) {
						setProducts([]);
						setAuthorized(false);
					}
				})
				.finally(() => {
					if (!controller.signal.aborted) setLoading(false);
				});
		}, 160);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [q]);

	if (!authorized) {
		return (
			<div className="mx-6 flex min-h-[70vh] items-center justify-center text-center">
				<div>
					<h1 className="text-2xl font-medium text-slate-800">
						{t("wishlist.loginRequired")}
					</h1>
					<Link
						href="/login?callbackUrl=/wishlist"
						className="mt-5 inline-flex rounded bg-[#1A1A1A] px-6 py-2 text-white hover:bg-orange-600"
					>
						{t("common.login")}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-6 min-h-[70vh]">
			<div className="mx-auto my-16 max-w-7xl">
				<PageTitle
					heading={t("wishlist.title")}
					text={t("wishlist.subtitle")}
					linkText={t("common.shop")}
				/>
				<div className="mb-8 max-w-lg rounded-md border border-slate-200 bg-white p-4">
					<input
						type="search"
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder={t("wishlist.searchPlaceholder")}
						className="h-10 w-full rounded border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
					/>
				</div>
				{loading ? (
					<Loading />
				) : products.length ? (
					<div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{products.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				) : (
					<div className="py-16 text-center text-slate-400">
						{q.trim() ? t("wishlist.noMatchingItems") : t("wishlist.empty")}
					</div>
				)}
			</div>
		</div>
	);
}
