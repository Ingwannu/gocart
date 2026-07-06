"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const ratingOptions = [5, 4, 3, 2, 1];

function buildReviewQuery({ q, rating, page }) {
	const params = new URLSearchParams();
	const query = String(q || "").trim();
	if (query) params.set("q", query);
	if (rating) params.set("rating", String(rating));
	if (page > 1) params.set("page", String(page));
	const suffix = params.toString();
	return `/api/ratings${suffix ? `?${suffix}` : ""}`;
}

function renderStars(rating) {
	const value = Number(rating) || 0;
	return "★".repeat(value) + "☆".repeat(Math.max(0, 5 - value));
}

export default function AdminReviewsPage() {
	const { t } = useTranslation();
	const [ratings, setRatings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [rating, setRating] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const loadRatings = () => {
		setLoading(true);
		fetchJson(buildReviewQuery({ q, rating, page }))
			.then((data) => {
				setRatings(data.ratings || []);
				setPagination(data.pagination || null);
				if (data.pagination?.page && data.pagination.page !== page) {
					setPage(data.pagination.page);
				}
			})
			.catch(() => {
				setRatings([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadRatings();
	}, [page, q, rating]);

	const deleteReview = async (ratingId) => {
		await fetchJson(`/api/ratings/${ratingId}`, { method: "DELETE" });
		setRatings((prev) => prev.filter((item) => item.id !== ratingId));
		setPagination((prev) =>
			prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev,
		);
	};

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.reviews")}{" "}
				<span className="font-medium text-foreground">
					{t("admin.management")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl rounded-lg border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchReviews")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={rating}
						onChange={(event) => {
							setRating(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("admin.allRatings")}</option>
						{ratingOptions.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={() => {
							setQ("");
							setRating("");
							setPage(1);
						}}
						className="h-10 rounded border border-border px-4 text-sm hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>

			{loading ? <Loading /> : null}
			<div className="mt-5 overflow-x-auto rounded-lg border border-border max-w-6xl">
				<table className="min-w-full bg-frame text-sm">
					<thead className="bg-muted text-muted-foreground">
						<tr>
							<th className="px-4 py-3 text-left">{t("admin.review")}</th>
							<th className="px-4 py-3 text-left">{t("admin.product")}</th>
							<th className="px-4 py-3 text-left">{t("admin.user")}</th>
							<th className="px-4 py-3 text-left">{t("admin.date")}</th>
							<th className="px-4 py-3 text-left">{t("admin.action")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{ratings.map((item) => (
							<tr key={item.id} className="align-top">
								<td className="max-w-md px-4 py-3">
									<p className="font-medium text-warning">
										{renderStars(item.rating)}
										<span className="ml-2 text-xs text-muted-foreground">
											{item.rating}/5
										</span>
									</p>
									<p className="mt-2 whitespace-pre-wrap text-foreground">
										{item.review}
									</p>
								</td>
								<td className="px-4 py-3 text-foreground">
									<Link
										href={`/product/${item.productId}`}
										className="font-medium hover:underline"
									>
										{item.product?.name || item.productId}
									</Link>
									<p className="mt-1 text-xs text-muted-foreground">
										{item.product?.store?.name || "-"}
									</p>
								</td>
								<td className="px-4 py-3 text-foreground">
									<p>{item.user?.name || "-"}</p>
									<p className="text-xs text-muted-foreground">
										{item.user?.email || "-"}
									</p>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(item.createdAt).toLocaleString()}
								</td>
								<td className="px-4 py-3">
									<button
										type="button"
										onClick={() => {
											if (!confirm(t("admin.deleteReviewConfirm"))) return;
											toast.promise(deleteReview(item.id), {
												loading: t("admin.deletingReview"),
											});
										}}
										className="rounded border border-danger-soft px-3 py-1.5 text-danger hover:bg-danger-soft"
									>
										{t("cartPage.remove")}
									</button>
								</td>
							</tr>
						))}
						{ratings.length === 0 && !loading && (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
									{t("admin.noReviewsFound")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
	);
}
