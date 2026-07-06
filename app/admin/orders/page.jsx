"use client";
import Loading from "@/components/Loading";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { buildOrderQuery } from "@/lib/order-filters.mjs";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const orderStatuses = [
	"ORDER_PLACED",
	"PROCESSING",
	"SHIPPED",
	"DELIVERED",
	"CANCELLED",
];
const payoutStatuses = ["PENDING", "READY", "PAID", "HOLD"];

export default function AdminOrders() {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [paid, setPaid] = useState("");
	const [payoutStatus, setPayoutStatus] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const updateOrder = async (orderId, payload) => {
		const data = await fetchJson(`/api/orders/${orderId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setOrders((prev) =>
			prev.map((order) => (order.id === orderId ? data.order : order)),
		);
	};

	useEffect(() => {
		setLoading(true);
		fetchJson(buildOrderQuery({ scope: "admin", q, status, paid, payoutStatus, page }))
			.then((data) => {
				setOrders(data.orders || []);
				setPagination(data.pagination || null);
				if (data.pagination?.page && data.pagination.page !== page) {
					setPage(data.pagination.page);
				}
			})
			.catch(() => {
				setOrders([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [page, q, status, paid, payoutStatus]);

	return (
		<div className="text-muted-foreground mb-28">
			<h1 className="text-2xl">
				{t("admin.orders")}{" "}
				<span className="text-foreground font-medium">
					{t("admin.ordersAndPayouts")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl border border-border bg-frame rounded-lg p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_150px_170px_auto]">
					<input
						type="search"
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setPage(1);
						}}
						placeholder={t("ordersPage.searchAdminPlaceholder")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={status}
						onChange={(e) => {
							setStatus(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("ordersPage.allOrderStatuses")}</option>
						{orderStatuses.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
					<select
						value={paid}
						onChange={(e) => {
							setPaid(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("ordersPage.allPayments")}</option>
						<option value="true">{t("ordersPage.paid")}</option>
						<option value="false">{t("ordersPage.unpaid")}</option>
					</select>
					<select
						value={payoutStatus}
						onChange={(e) => {
							setPayoutStatus(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("ordersPage.allPayouts")}</option>
						{payoutStatuses.map((option) => (
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
							setPaid("");
							setPayoutStatus("");
							setPage(1);
						}}
						className="h-10 rounded border border-border px-4 text-sm text-foreground hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
				<p className="mt-3 text-xs text-muted-foreground">
					{t("ordersPage.showingOrders", {
						count: (pagination?.total ?? orders.length).toLocaleString(),
					})}
				</p>
			</div>
			{loading ? <Loading /> : null}
			<div className="overflow-x-auto mt-5 rounded-lg border border-border max-w-6xl">
				<table className="min-w-full bg-frame text-sm">
					<thead className="bg-muted text-muted-foreground">
						<tr>
							<th className="py-3 px-4 text-left">{t("ordersPage.order")}</th>
							<th className="py-3 px-4 text-left">{t("admin.store")}</th>
							<th className="py-3 px-4 text-left">{t("store.customer")}</th>
							<th className="py-3 px-4 text-left">{t("store.total")}</th>
							<th className="py-3 px-4 text-left">
								{t("ordersPage.orderStatus")}
							</th>
							<th className="py-3 px-4 text-left">
								{t("ordersPage.tracking")}
							</th>
							<th className="py-3 px-4 text-left">{t("ordersPage.paid")}</th>
							<th className="py-3 px-4 text-left">{t("ordersPage.payout")}</th>
							<th className="py-3 px-4 text-left">
								{t("ordersPage.payoutAmount")}
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{orders.map((order) => (
							<tr key={order.id} className="hover:bg-muted">
								<td className="py-3 px-4 text-foreground">
									<p className="font-medium">{order.id.slice(0, 8)}</p>
									<p className="text-xs text-muted-foreground">
										{new Date(order.createdAt).toLocaleString()}
									</p>
								</td>
								<td className="py-3 px-4 text-foreground">
									{order.store?.name || "-"}
								</td>
								<td className="py-3 px-4 text-foreground">
									{order.user?.name || "-"}
								</td>
								<td className="py-3 px-4 text-foreground">
									{currency}
									{order.total.toLocaleString()}
								</td>
								<td className="py-3 px-4">
									<select
										value={order.status}
										onChange={(e) =>
											toast.promise(
												updateOrder(order.id, { status: e.target.value }),
												{ loading: t("ordersPage.updatingOrder") },
											)
										}
										className="border border-border rounded p-1"
									>
										{orderStatuses.map((status) => (
											<option key={status} value={status}>
												{status}
											</option>
										))}
									</select>
								</td>
								<td className="py-3 px-4">
									<div className="grid min-w-48 gap-1">
										<input
											defaultValue={order.trackingCarrier || ""}
											placeholder={t("ordersPage.trackingCarrier")}
											onBlur={(e) => {
												if (e.target.value !== (order.trackingCarrier || "")) {
													toast.promise(
														updateOrder(order.id, {
															trackingCarrier: e.target.value,
														}),
														{ loading: t("ordersPage.updatingTracking") },
													);
												}
											}}
											className="rounded border border-border p-1 text-xs"
										/>
										<input
											defaultValue={order.trackingNumber || ""}
											placeholder={t("ordersPage.trackingNumber")}
											onBlur={(e) => {
												if (e.target.value !== (order.trackingNumber || "")) {
													toast.promise(
														updateOrder(order.id, {
															trackingNumber: e.target.value,
														}),
														{ loading: t("ordersPage.updatingTracking") },
													);
												}
											}}
											className="rounded border border-border p-1 text-xs"
										/>
										<input
											defaultValue={order.trackingUrl || ""}
											placeholder={t("ordersPage.trackingUrl")}
											onBlur={(e) => {
												if (e.target.value !== (order.trackingUrl || "")) {
													toast.promise(
														updateOrder(order.id, {
															trackingUrl: e.target.value,
														}),
														{ loading: t("ordersPage.updatingTracking") },
													);
												}
											}}
											className="rounded border border-border p-1 text-xs"
										/>
									</div>
								</td>
								<td className="py-3 px-4">
									<input
										type="checkbox"
										checked={order.isPaid}
										onChange={(e) =>
											toast.promise(
												updateOrder(order.id, { isPaid: e.target.checked }),
												{ loading: t("ordersPage.updatingPayment") },
											)
										}
									/>
								</td>
								<td className="py-3 px-4">
									<select
										value={order.payoutStatus}
										onChange={(e) =>
											toast.promise(
												updateOrder(order.id, { payoutStatus: e.target.value }),
												{ loading: t("ordersPage.updatingPayout") },
											)
										}
										className="border border-border rounded p-1"
									>
										{payoutStatuses.map((status) => (
											<option key={status} value={status}>
												{status}
											</option>
										))}
									</select>
								</td>
								<td className="py-3 px-4 text-foreground">
									{currency}
									{order.payoutAmount.toLocaleString()}
									{order.paidOutAt && (
										<p className="text-xs text-muted-foreground">
											{t("ordersPage.paidOn", {
												date: new Date(order.paidOutAt).toLocaleDateString(),
											})}
										</p>
									)}
								</td>
							</tr>
						))}
						{orders.length === 0 && !loading && (
							<tr>
								<td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
									{t("ordersPage.noMatchingOrders")}
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
							total: pagination.total.toLocaleString(),
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
