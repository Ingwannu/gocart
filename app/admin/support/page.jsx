"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED"];

function buildSupportQuery({ q, status, page }) {
	const params = new URLSearchParams();
	const query = String(q || "").trim();
	if (query) params.set("q", query);
	if (status) params.set("status", status);
	if (page > 1) params.set("page", String(page));
	const suffix = params.toString();
	return `/api/support-tickets${suffix ? `?${suffix}` : ""}`;
}

export default function AdminSupportPage() {
	const { t } = useTranslation();
	const [tickets, setTickets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);
	const [notes, setNotes] = useState({});

	const loadTickets = () => {
		setLoading(true);
		fetchJson(buildSupportQuery({ q, status, page }))
			.then((data) => {
				setTickets(data.tickets || []);
				setPagination(data.pagination || null);
				setNotes(
					Object.fromEntries(
						(data.tickets || []).map((ticket) => [
							ticket.id,
							ticket.internalNote || "",
						]),
					),
				);
				if (data.pagination?.page && data.pagination.page !== page) {
					setPage(data.pagination.page);
				}
			})
			.catch(() => {
				setTickets([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadTickets();
	}, [page, q, status]);

	const updateTicket = async (ticketId, payload) => {
		const data = await fetchJson(`/api/support-tickets/${ticketId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setTickets((prev) =>
			prev.map((ticket) => (ticket.id === ticketId ? data.ticket : ticket)),
		);
	};

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.support")}{" "}
				<span className="font-medium text-foreground">
					{t("admin.supportTickets")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl rounded-lg border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchSupport")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={status}
						onChange={(event) => {
							setStatus(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("admin.allSupportStatuses")}</option>
						{statuses.map((option) => (
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
						className="h-10 rounded border border-border px-4 text-sm hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>

			{loading ? <Loading /> : null}
			<div className="mt-5 grid max-w-6xl gap-3">
				{tickets.map((ticket) => (
					<div
						key={ticket.id}
						className="rounded-lg border border-border bg-frame p-4"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs text-muted-foreground">
									{new Date(ticket.createdAt).toLocaleString()}
								</p>
								<h2 className="mt-1 text-lg font-medium text-foreground">
									{ticket.subject}
								</h2>
								<p className="text-sm">
									{ticket.name} · {ticket.email}
								</p>
							</div>
							<select
								value={ticket.status}
								onChange={(event) =>
									toast.promise(
										updateTicket(ticket.id, { status: event.target.value }),
										{ loading: t("admin.updatingSupport") },
									)
								}
								className="rounded border border-border px-3 py-2 text-sm"
							>
								{statuses.map((option) => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</div>
						<p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">
							{ticket.message}
						</p>
						<div className="mt-4">
							<label className="text-sm">
								{t("admin.internalNote")}
								<textarea
									className="mt-1 min-h-20 w-full rounded border border-border p-2"
									value={notes[ticket.id] ?? ""}
									onChange={(event) =>
										setNotes((prev) => ({
											...prev,
											[ticket.id]: event.target.value,
										}))
									}
								/>
							</label>
							<button
								type="button"
								onClick={() =>
									toast.promise(
										updateTicket(ticket.id, {
											internalNote: notes[ticket.id] || "",
										}),
										{ loading: t("admin.updatingSupport") },
									)
								}
								className="mt-2 rounded bg-accent px-4 py-2 text-sm text-accent-foreground hover:brightness-95"
							>
								{t("common.save")}
							</button>
						</div>
					</div>
				))}
				{tickets.length === 0 && !loading && (
					<div className="rounded-lg border border-border bg-frame p-8 text-center text-muted-foreground">
						{t("admin.noSupportTickets")}
					</div>
				)}
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
