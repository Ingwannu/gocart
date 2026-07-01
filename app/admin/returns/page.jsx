"use client";
import Loading from "@/components/Loading";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const returnStatuses = ["REQUESTED", "APPROVED", "REJECTED", "REFUNDED"];

function buildReturnRequestQuery({ q, status, page }) {
	const params = new URLSearchParams({ scope: "admin" });
	const query = String(q || "").trim();
	if (query) params.set("q", query);
	if (status) params.set("status", status);
	if (page > 1) params.set("page", String(page));
	return `/api/return-requests?${params.toString()}`;
}

export default function AdminReturnsPage() {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);
	const [notes, setNotes] = useState({});
	const [amounts, setAmounts] = useState({});

	const loadRequests = () => {
		setLoading(true);
		fetchJson(buildReturnRequestQuery({ q, status, page }))
			.then((data) => {
				const nextRequests = data.requests || [];
				setRequests(nextRequests);
				setPagination(data.pagination || null);
				setNotes(
					Object.fromEntries(
						nextRequests.map((request) => [
							request.id,
							request.resolutionNote || "",
						]),
					),
				);
				setAmounts(
					Object.fromEntries(
						nextRequests.map((request) => [
							request.id,
							String(request.refundAmount || ""),
						]),
					),
				);
				if (data.pagination?.page && data.pagination.page !== page) {
					setPage(data.pagination.page);
				}
			})
			.catch(() => {
				setRequests([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadRequests();
	}, [page, q, status]);

	const updateRequest = async (requestId, payload) => {
		const data = await fetchJson(`/api/return-requests/${requestId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setRequests((prev) =>
			prev.map((request) =>
				request.id === requestId ? data.request : request,
			),
		);
	};

	return (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.returns")}{" "}
				<span className="font-medium text-slate-800">
					{t("admin.management")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl rounded-lg border border-slate-200 bg-white p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchReturns")}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-orange-400"
					/>
					<select
						value={status}
						onChange={(event) => {
							setStatus(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-slate-200 px-3 text-sm text-slate-700"
					>
						<option value="">{t("admin.allReturnStatuses")}</option>
						{returnStatuses.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={() => {
							setQ("");
							setStatus("");
							setPage(1);
						}}
						className="h-10 rounded border border-slate-200 px-4 text-sm hover:bg-slate-50"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>

			{loading ? <Loading /> : null}
			<div className="mt-5 grid max-w-6xl gap-3">
				{requests.map((request) => (
					<div
						key={request.id}
						className="rounded-lg border border-slate-200 bg-white p-4"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs text-slate-400">
									{new Date(request.createdAt).toLocaleString()}
								</p>
								<h2 className="mt-1 text-base font-medium text-slate-800">
									{t("admin.order")} {request.orderId.slice(0, 8)}
								</h2>
								<p className="text-sm">
									{request.user?.name || "-"} · {request.user?.email || "-"}
								</p>
								<p className="text-sm">
									{request.order?.store?.name || "-"} · {currency}
									{request.order?.total?.toLocaleString?.() || "0"}
								</p>
							</div>
							<select
								value={request.status}
								onChange={(event) =>
									toast.promise(
										updateRequest(request.id, { status: event.target.value }),
										{ loading: t("admin.updatingReturn") },
									)
								}
								className="rounded border border-slate-200 px-3 py-2 text-sm"
							>
								{returnStatuses.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</div>
						<p className="mt-4 whitespace-pre-wrap text-sm text-slate-600">
							{request.reason}
						</p>
						<div className="mt-4 grid gap-3 md:grid-cols-[160px_minmax(220px,1fr)_auto]">
							<label className="text-sm">
								{t("admin.refundAmount")}
								<input
									type="number"
									min="0"
									step="0.01"
									className="mt-1 h-10 w-full rounded border border-slate-200 px-2"
									value={amounts[request.id] ?? ""}
									onChange={(event) =>
										setAmounts((prev) => ({
											...prev,
											[request.id]: event.target.value,
										}))
									}
								/>
							</label>
							<label className="text-sm">
								{t("admin.resolutionNote")}
								<input
									className="mt-1 h-10 w-full rounded border border-slate-200 px-2"
									value={notes[request.id] ?? ""}
									onChange={(event) =>
										setNotes((prev) => ({
											...prev,
											[request.id]: event.target.value,
										}))
									}
								/>
							</label>
							<button
								type="button"
								onClick={() =>
									toast.promise(
										updateRequest(request.id, {
											refundAmount: amounts[request.id] || 0,
											resolutionNote: notes[request.id] || "",
										}),
										{ loading: t("admin.updatingReturn") },
									)
								}
								className="self-end rounded bg-[#1A1A1A] px-4 py-2 text-sm text-white hover:bg-orange-600"
							>
								{t("common.save")}
							</button>
						</div>
					</div>
				))}
				{requests.length === 0 && !loading && (
					<div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
						{t("admin.noReturnRequests")}
					</div>
				)}
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
