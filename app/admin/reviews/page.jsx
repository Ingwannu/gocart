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
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.reviews")}{" "}
				<span className="font-medium text-slate-800">
					{t("admin.management")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl rounded-lg border border-slate-200 bg-white p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchReviews")}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
					/>
					<select
						value={rating}
						onChange={(event) => {
							setRating(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700"
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
						className="h-10 rounded border border-slate-200 px-4 text-sm hover:bg-slate-50"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>

			{loading ? <Loading /> : null}
			<div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 max-w-6xl">
				<table className="min-w-full bg-white text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="px-4 py-3 text-left">{t("admin.review")}</th>
							<th className="px-4 py-3 text-left">{t("admin.product")}</th>
							<th className="px-4 py-3 text-left">{t("admin.user")}</th>
							<th className="px-4 py-3 text-left">{t("admin.date")}</th>
							<th className="px-4 py-3 text-left">{t("admin.action")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{ratings.map((item) => (
							<tr key={item.id} className="align-top">
								<td className="max-w-md px-4 py-3">
									<p className="font-medium text-orange-500">
										{renderStars(item.rating)}
										<span className="ml-2 text-xs text-slate-400">
											{item.rating}/5
										</span>
									</p>
									<p className="mt-2 whitespace-pre-wrap text-slate-700">
										{item.review}
									</p>
								</td>
								<td className="px-4 py-3 text-slate-700">
									<Link
										href={`/product/${item.productId}`}
										className="font-medium hover:text-orange-600"
									>
										{item.product?.name || item.productId}
									</Link>
									<p className="mt-1 text-xs text-slate-400">
										{item.product?.store?.name || "-"}
									</p>
								</td>
								<td className="px-4 py-3 text-slate-700">
									<p>{item.user?.name || "-"}</p>
									<p className="text-xs text-slate-400">
										{item.user?.email || "-"}
									</p>
								</td>
								<td className="px-4 py-3 text-slate-500">
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
										className="rounded border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
									>
										{t("cartPage.remove")}
									</button>
								</td>
							</tr>
						))}
						{ratings.length === 0 && !loading && (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-slate-400">
									{t("admin.noReviewsFound")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
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
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.previous")}
						</button>
						<button
							type="button"
							disabled={!pagination.hasNextPage}
							onClick={() => setPage((prev) => prev + 1)}
							className="rounded border border-slate-200 px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-50"
						>
							{t("common.next")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
