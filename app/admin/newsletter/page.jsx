"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

function buildNewsletterQuery({ q, status, page }) {
	const params = new URLSearchParams();
	const query = String(q || "").trim();
	if (query) params.set("q", query);
	if (status) params.set("status", status);
	if (page > 1) params.set("page", String(page));
	const suffix = params.toString();
	return `/api/newsletter${suffix ? `?${suffix}` : ""}`;
}

export default function AdminNewsletterPage() {
	const { t } = useTranslation();
	const [subscriptions, setSubscriptions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	useEffect(() => {
		setLoading(true);
		fetchJson(buildNewsletterQuery({ q, status, page }))
			.then((data) => {
				setSubscriptions(data.subscriptions || []);
				setPagination(data.pagination || null);
				if (data.pagination?.page && data.pagination.page !== page) {
					setPage(data.pagination.page);
				}
			})
			.catch(() => {
				setSubscriptions([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, q, status]);

	const updateSubscription = async (subscriptionId, isActive) => {
		const data = await fetchJson(`/api/newsletter/${subscriptionId}`, {
			method: "PATCH",
			body: JSON.stringify({ isActive }),
		});
		setSubscriptions((prev) =>
			prev.map((subscription) =>
				subscription.id === subscriptionId ? data.subscription : subscription,
			),
		);
	};

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.newsletter")}{" "}
				<span className="font-medium text-foreground">
					{t("admin.subscribers")}
				</span>
			</h1>
			<div className="mt-5 max-w-5xl rounded-lg border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => {
							setQ(event.target.value);
							setPage(1);
						}}
						placeholder={t("admin.searchNewsletter")}
						className="h-10 rounded border border-border px-3 text-sm outline-none focus:border-ring"
					/>
					<select
						value={status}
						onChange={(event) => {
							setStatus(event.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm"
					>
						<option value="">{t("admin.allSubscriptionStatuses")}</option>
						<option value="active">{t("admin.active")}</option>
						<option value="inactive">{t("admin.inactive")}</option>
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
			<div className="mt-5 overflow-x-auto rounded-lg border border-border max-w-5xl">
				<table className="min-w-full bg-frame text-sm">
					<thead className="bg-muted text-muted-foreground">
						<tr>
							<th className="px-4 py-3 text-left">{t("contact.email")}</th>
							<th className="px-4 py-3 text-left">{t("admin.status")}</th>
							<th className="px-4 py-3 text-left">{t("admin.date")}</th>
							<th className="px-4 py-3 text-left">{t("admin.action")}</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{subscriptions.map((subscription) => (
							<tr key={subscription.id}>
								<td className="px-4 py-3 text-foreground">
									{subscription.email}
								</td>
								<td className="px-4 py-3">
									<span
										className={`rounded-full px-2 py-1 text-xs ${
											subscription.isActive
												? "bg-success-soft text-success"
												: "bg-muted text-muted-foreground"
										}`}
									>
										{subscription.isActive
											? t("admin.active")
											: t("admin.inactive")}
									</span>
								</td>
								<td className="px-4 py-3 text-muted-foreground">
									{new Date(subscription.createdAt).toLocaleString()}
								</td>
								<td className="px-4 py-3">
									<button
										type="button"
										onClick={() =>
											toast.promise(
												updateSubscription(
													subscription.id,
													!subscription.isActive,
												),
												{ loading: t("admin.updatingNewsletter") },
											)
										}
										className="rounded border border-border px-3 py-1.5 hover:bg-muted"
									>
										{subscription.isActive
											? t("admin.disable")
											: t("admin.restore")}
									</button>
								</td>
							</tr>
						))}
						{subscriptions.length === 0 && !loading && (
							<tr>
								<td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
									{t("admin.noNewsletterSubscribers")}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
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
