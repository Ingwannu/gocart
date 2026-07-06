"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { buildPublicStoreHref } from "@/lib/store-list.mjs";
import { MailIcon, MapPinIcon, SearchIcon, StoreIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function StoresContent() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const search = searchParams.get("search") || "";
	const page = searchParams.get("page") || "1";
	const [stores, setStores] = useState([]);
	const [pagination, setPagination] = useState(null);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState(search);

	useEffect(() => {
		setQuery(search);
		setLoading(true);
		const params = new URLSearchParams({ public: "true" });
		if (search) params.set("q", search);
		if (page) params.set("page", page);
		fetchJson(`/api/stores?${params.toString()}`)
			.then((data) => {
				setStores(data.stores || []);
				setPagination(data.pagination || null);
			})
			.catch(() => {
				setStores([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [search, page]);

	const submitSearch = (event) => {
		event.preventDefault();
		router.push(buildPublicStoreHref({ search: query }));
	};

	return (
		<div className="min-h-[70vh] mx-6">
			<div className="max-w-7xl mx-auto py-8">
				<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="text-3xl font-semibold text-foreground">
							{t("storesPage.heading")}
						</h1>
						<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
							{t("storesPage.subtitle")}
						</p>
					</div>
					<form
						onSubmit={submitSearch}
						className="flex w-full max-w-md items-center gap-2 rounded border border-border px-3 py-2"
					>
						<SearchIcon size={18} className="text-muted-foreground" />
						<input
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t("storesPage.searchStores")}
							className="w-full text-sm text-foreground bg-transparent outline-none"
						/>
						<button className="rounded bg-accent px-4 py-1.5 text-sm text-accent-foreground hover:brightness-95">
							{t("common.search")}
						</button>
					</form>
				</div>
				{loading && <Loading />}
				{!loading && stores.length === 0 && (
					<div className="flex h-60 items-center justify-center text-2xl text-muted-foreground">
						{t("storesPage.noStoresFound")}
					</div>
				)}
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{stores.map((store) => (
						<Link
							key={store.id}
							href={`/shop/${store.username}`}
							className="rounded-lg border border-border bg-frame p-5 transition hover:border-accent/30 hover:shadow-sm"
						>
							<div className="flex items-start gap-4">
								<Image
									src={store.logo || "/favicon.ico"}
									alt={store.name}
									width={72}
									height={72}
									className="size-18 rounded-md border border-border object-cover"
								/>
								<div className="min-w-0">
									<h2 className="truncate text-lg font-medium text-foreground">
										{store.name}
									</h2>
									<p className="text-sm text-muted-foreground">@{store.username}</p>
								</div>
							</div>
							<p className="mt-4 line-clamp-3 min-h-14 text-sm text-muted-foreground">
								{store.description || t("storesPage.noDescription")}
							</p>
							<div className="mt-4 space-y-2 text-sm text-muted-foreground">
								<div className="flex items-center gap-2">
									<MailIcon size={15} className="shrink-0" />
									<span className="truncate">{store.email}</span>
								</div>
								<div className="flex items-center gap-2">
									<MapPinIcon size={15} className="shrink-0" />
									<span className="truncate">{store.address}</span>
								</div>
							</div>
							<div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-foreground underline">
								<StoreIcon size={16} />
								{t("storesPage.visitStore")}
							</div>
						</Link>
					))}
				</div>
				{pagination && pagination.totalPages > 1 && (
					<div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
						<button
							type="button"
							disabled={!pagination.hasPreviousPage}
							onClick={() =>
								router.push(
									buildPublicStoreHref({
										search,
										page: pagination.page - 1,
									}),
								)
							}
							className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
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
									buildPublicStoreHref({
										search,
										page: pagination.page + 1,
									}),
								)
							}
							className="rounded border border-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-muted"
						>
							{t("common.next")}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

export default function StoresPage() {
	return (
		<Suspense fallback={<Loading />}>
			<StoresContent />
		</Suspense>
	);
}
