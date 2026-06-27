"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";

const targetTypes = ["user", "store", "product", "product_group", "coupon", "order"];

export default function AdminAuditLogs() {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(true);
	const [logs, setLogs] = useState([]);
	const [pagination, setPagination] = useState(null);
	const [query, setQuery] = useState("");
	const [action, setAction] = useState("");
	const [targetType, setTargetType] = useState("");
	const [page, setPage] = useState(1);

	const loadLogs = async (requestedPage = page) => {
		const params = new URLSearchParams();
		if (query.trim()) params.set("q", query.trim());
		if (action.trim()) params.set("action", action.trim());
		if (targetType) params.set("targetType", targetType);
		params.set("page", String(requestedPage));
		const data = await fetchJson(`/api/admin/audit-logs?${params.toString()}`);
		setLogs(data.logs || []);
		setPagination(data.pagination || null);
		if (data.pagination?.page && data.pagination.page !== page) {
			setPage(data.pagination.page);
		}
	};

	useEffect(() => {
		loadLogs()
			.catch(() => {
				setLogs([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, query, action, targetType]);

	if (loading) return <Loading />;

	return (
		<div className="text-slate-500 mb-28">
			<h1 className="text-2xl">
				{t("admin.auditLogs")}{" "}
				<span className="text-slate-800 font-medium">{t("admin.management")}</span>
			</h1>
			<div className="mt-5 max-w-6xl grid gap-3 md:grid-cols-[1fr_220px_180px]">
				<input
					className="p-2 border border-slate-200 rounded outline-slate-400"
					placeholder={t("admin.searchAuditLogs")}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setPage(1);
					}}
				/>
				<input
					className="p-2 border border-slate-200 rounded outline-slate-400"
					placeholder={t("admin.auditActionPlaceholder")}
					value={action}
					onChange={(event) => {
						setAction(event.target.value);
						setPage(1);
					}}
				/>
				<select
					className="p-2 border border-slate-200 rounded outline-slate-400"
					value={targetType}
					onChange={(event) => {
						setTargetType(event.target.value);
						setPage(1);
					}}
				>
					<option value="">{t("admin.allTargets")}</option>
					{targetTypes.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</select>
			</div>
			<div className="overflow-x-auto mt-5 rounded-lg border border-slate-200 max-w-6xl">
				<table className="min-w-full bg-white text-sm">
					<thead className="bg-slate-50 text-slate-600">
						<tr>
							<th className="py-3 px-4 text-left">{t("admin.date")}</th>
							<th className="py-3 px-4 text-left">{t("admin.actor")}</th>
							<th className="py-3 px-4 text-left">{t("admin.action")}</th>
							<th className="py-3 px-4 text-left">{t("admin.target")}</th>
							<th className="py-3 px-4 text-left">{t("admin.summary")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{logs.map((log) => (
							<tr key={log.id}>
								<td className="py-3 px-4 whitespace-nowrap">
									{new Date(log.createdAt).toLocaleString()}
								</td>
								<td className="py-3 px-4">
									<p className="text-slate-700">{log.actor?.name || "-"}</p>
									<p className="text-xs text-slate-400">{log.actor?.email || "-"}</p>
								</td>
								<td className="py-3 px-4 font-medium text-slate-700">{log.action}</td>
								<td className="py-3 px-4">
									<p>{log.targetType}</p>
									<p className="text-xs text-slate-400">{log.targetId}</p>
								</td>
								<td className="py-3 px-4 text-slate-700">{log.summary}</td>
							</tr>
						))}
						{logs.length === 0 && (
							<tr>
								<td className="py-6 px-4 text-center" colSpan={5}>
									{t("admin.noAuditLogsFound")}
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
