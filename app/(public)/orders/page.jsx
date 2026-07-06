"use client";
import PageTitle from "@/components/PageTitle";
import { useEffect, useState } from "react";
import OrderItem from "@/components/OrderItem";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { buildOrderQuery } from "@/lib/order-filters.mjs";
import { useDispatch } from "react-redux";
import { setRatings } from "@/lib/features/rating/ratingSlice.mjs";
import toast from "react-hot-toast";

export default function Orders() {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [paid, setPaid] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);

	const cancelOrder = async (orderId) => {
		const data = await fetchJson(`/api/orders/${orderId}`, {
			method: "PATCH",
			body: JSON.stringify({ status: "CANCELLED" }),
		});
		setOrders((prev) =>
			prev.map((order) => (order.id === orderId ? data.order : order)),
		);
	};

	const requestReturn = async (orderId) => {
		const reason = window.prompt(t("ordersPage.returnReasonPrompt"));
		if (reason === null) return;
		const data = await fetchJson("/api/return-requests", {
			method: "POST",
			body: JSON.stringify({ orderId, reason }),
		});
		setOrders((prev) =>
			prev.map((order) =>
				order.id === orderId
					? { ...order, returnRequest: data.request }
					: order,
			),
		);
	};

	const downloadReceipt = async (orderId) => {
		const data = await fetchJson(`/api/orders/${orderId}/receipt`);
		const blob = new Blob([JSON.stringify(data.receipt, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `wickedshop-receipt-${orderId}.json`;
		document.body.appendChild(anchor);
		anchor.click();
		anchor.remove();
		URL.revokeObjectURL(url);
	};

	useEffect(() => {
		const loadOrders = async () => {
			setLoading(true);
			const data = await fetchJson(buildOrderQuery({ q, status, paid, page }));
			setOrders(data.orders || []);
			setPagination(data.pagination || null);
			if (data.pagination?.page && data.pagination.page !== page) {
				setPage(data.pagination.page);
			}
			dispatch(
				setRatings(
					(data.orders || []).flatMap((order) =>
						order.orderItems.flatMap((item) =>
							(item.product.rating || []).filter(
								(rating) => rating.orderId === order.id,
							),
						),
					),
				),
			);
		};

		loadOrders()
			.catch(() => {
				setOrders([]);
				setPagination(null);
			})
			.finally(() => setLoading(false));
	}, [dispatch, page, q, status, paid]);

	const hasFilters = Boolean(q.trim() || status || paid);

	return orders.length > 0 || hasFilters || loading ? (
		<div className="min-h-[70vh] mx-6">
			<div className="my-20 max-w-7xl mx-auto">
				<PageTitle
					heading={t("ordersPage.heading")}
					text={t("ordersPage.showingTotal", {
						count: pagination?.total ?? orders.length,
					})}
					linkText={t("ordersPage.goToHome")}
				/>
				<div className="mb-8 max-w-5xl rounded-md border border-border bg-frame p-4">
					<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_150px_auto]">
						<input
							type="search"
							value={q}
							onChange={(e) => {
								setQ(e.target.value);
								setPage(1);
							}}
							placeholder={t("ordersPage.searchPlaceholder")}
							className="h-10 rounded border border-border bg-frame px-3 text-sm text-foreground outline-none focus:border-ring"
						/>
						<select
							value={status}
							onChange={(e) => {
								setStatus(e.target.value);
								setPage(1);
							}}
							className="h-10 rounded border border-border bg-frame px-3 text-sm text-foreground"
						>
							<option value="">{t("ordersPage.allStatuses")}</option>
							<option value="ORDER_PLACED">ORDER_PLACED</option>
							<option value="PROCESSING">PROCESSING</option>
							<option value="SHIPPED">SHIPPED</option>
							<option value="DELIVERED">DELIVERED</option>
							<option value="CANCELLED">CANCELLED</option>
						</select>
						<select
							value={paid}
							onChange={(e) => {
								setPaid(e.target.value);
								setPage(1);
							}}
							className="h-10 rounded border border-border bg-frame px-3 text-sm text-foreground"
						>
							<option value="">{t("ordersPage.allPayments")}</option>
							<option value="true">{t("ordersPage.paid")}</option>
							<option value="false">{t("ordersPage.unpaid")}</option>
						</select>
						<button
							type="button"
							onClick={() => {
								setQ("");
								setStatus("");
								setPaid("");
								setPage(1);
							}}
							className="h-10 rounded border border-border px-4 text-sm text-foreground hover:bg-muted"
						>
							{t("ordersPage.reset")}
						</button>
					</div>
				</div>
				{loading ? (
					<div className="py-16 text-center text-muted-foreground">
						{t("common.loading")}
					</div>
				) : orders.length > 0 ? (
					<table className="w-full max-w-5xl text-muted-foreground table-auto border-separate border-spacing-y-12 border-spacing-x-4">
						<thead>
							<tr className="max-sm:text-sm text-muted-foreground max-md:hidden">
								<th className="text-left">{t("cartPage.product")}</th>
								<th className="text-center">{t("cartPage.totalPrice")}</th>
								<th className="text-left">{t("orderSummary.address")}</th>
								<th className="text-left">{t("store.status")}</th>
							</tr>
						</thead>
						<tbody>
							{orders.map((order) => (
								<OrderItem
									order={order}
									key={order.id}
									onCancel={(orderId) => {
										if (!window.confirm(t("ordersPage.cancelConfirm"))) return;
										toast.promise(cancelOrder(orderId), {
											loading: t("ordersPage.cancellingOrder"),
											success: t("ordersPage.cancelledOrder"),
											error: (error) => error.message,
										});
									}}
									onReturnRequest={(orderId) =>
										toast.promise(requestReturn(orderId), {
											loading: t("ordersPage.requestingReturn"),
											success: t("ordersPage.returnRequested"),
											error: (error) => error.message,
										})
									}
									onDownloadReceipt={(orderId) =>
										toast.promise(downloadReceipt(orderId), {
											loading: t("ordersPage.downloadingReceipt"),
											success: t("ordersPage.receiptReady"),
											error: (error) => error.message,
										})
									}
								/>
							))}
						</tbody>
					</table>
				) : (
					<div className="py-16 text-center text-muted-foreground">
						{t("ordersPage.noMatchingOrders")}
					</div>
				)}
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
		</div>
	) : (
		<div className="min-h-[80vh] mx-6 flex items-center justify-center text-muted-foreground">
			<h1 className="text-2xl sm:text-4xl font-semibold">
				{t("ordersPage.youHaveNoOrders")}
			</h1>
		</div>
	);
}
