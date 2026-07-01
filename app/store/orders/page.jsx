"use client";
import { useEffect, useState } from "react";
import Loading from "@/components/Loading";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { buildOrderQuery } from "@/lib/order-filters.mjs";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";
import toast from "react-hot-toast";
import { DownloadIcon, RefreshCwIcon, BanIcon } from "lucide-react";

const emptyTracking = {
	trackingCarrier: "",
	trackingNumber: "",
	trackingUrl: "",
};

function orderToTracking(order) {
	return {
		trackingCarrier: order?.trackingCarrier || "",
		trackingNumber: order?.trackingNumber || "",
		trackingUrl: order?.trackingUrl || "",
	};
}

export default function StoreOrders() {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [paid, setPaid] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState(null);
	const [trackingForm, setTrackingForm] = useState(emptyTracking);
	const [grants, setGrants] = useState([]);
	const [grantsLoading, setGrantsLoading] = useState(false);

	const loadGrants = (orderId) => {
		setGrantsLoading(true);
		fetchJson(`/api/orders/${orderId}/grants`)
			.then((data) => setGrants(data.grants || []))
			.catch(() => setGrants([]))
			.finally(() => setGrantsLoading(false));
	};

	const manageGrant = async (grantId, action, productName) => {
		await toast.promise(
			fetchJson(`/api/downloads/${grantId}/manage`, {
				method: "POST",
				body: JSON.stringify({ action }),
			}),
			{
				loading: t("ordersPage.updatingGrant"),
				success: t("ordersPage.grantUpdated"),
				error: (error) => error.message,
			},
		);
		loadGrants(selectedOrder.id);
	};

	const updateOrder = async (orderId, payload) => {
		const data = await fetchJson(`/api/orders/${orderId}`, {
			method: "PATCH",
			body: JSON.stringify(payload),
		});
		setOrders((prev) =>
			prev.map((order) => (order.id === orderId ? data.order : order)),
		);
		if (selectedOrder?.id === orderId) {
			setSelectedOrder(data.order);
			setTrackingForm(orderToTracking(data.order));
		}
	};
	const openModal = (order) => {
		setSelectedOrder(order);
		setTrackingForm(orderToTracking(order));
		setIsModalOpen(true);
		if (order.isPaid) loadGrants(order.id);
	};
	const closeModal = () => {
		setSelectedOrder(null);
		setIsModalOpen(false);
	};

	const updateTrackingForm = (field, value) => {
		setTrackingForm((prev) => ({ ...prev, [field]: value }));
	};

	useEffect(() => {
		setLoading(true);
		fetchJson(buildOrderQuery({ scope: "store", q, status, paid, page }))
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
	}, [page, q, status, paid]);

	return (
		<>
			<h1 className="text-2xl text-slate-500 mb-5">{t("store.storeOrders")}</h1>
			<div className="mb-5 max-w-4xl rounded-md border border-gray-200 bg-white p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_170px_150px_auto]">
					<input
						type="search"
						value={q}
						onChange={(e) => {
							setQ(e.target.value);
							setPage(1);
						}}
						placeholder={t("ordersPage.searchStorePlaceholder")}
						className="h-10 rounded border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-400"
					/>
					<select
						value={status}
						onChange={(e) => {
							setStatus(e.target.value);
							setPage(1);
						}}
						className="h-10 rounded border border-gray-200 px-3 text-sm text-gray-700"
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
						className="h-10 rounded border border-gray-200 px-3 text-sm text-gray-700"
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
						className="h-10 rounded border border-gray-200 px-4 text-sm text-gray-700 hover:bg-gray-50"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
				<p className="mt-3 text-xs text-gray-400">
					{t("ordersPage.showingOrders", {
						count: (pagination?.total ?? orders.length).toLocaleString(),
					})}
				</p>
			</div>
			{loading ? <Loading /> : null}
			{orders.length === 0 && !loading ? (
				<p>{t("store.noOrdersFound")}</p>
			) : (
				<div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
					<table className="w-full text-sm text-left text-gray-600">
						<thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
							<tr>
								{[
									t("store.srNo"),
									t("store.customer"),
									t("store.total"),
									t("store.payment"),
									t("store.couponCol"),
									t("store.statusCol"),
									t("store.date"),
								].map((heading, i) => (
									<th key={i} className="px-4 py-3">
										{heading}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{orders.map((order, index) => (
								<tr
									key={order.id}
									className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
									onClick={() => openModal(order)}
								>
									<td className="pl-6 text-orange-500">{index + 1}</td>
									<td className="px-4 py-3">{order.user?.name}</td>
									<td className="px-4 py-3 font-medium text-slate-800">
										{currency}
										{order.total.toLocaleString()}
									</td>
									<td className="px-4 py-3">{order.paymentMethod}</td>
									<td className="px-4 py-3">
										{order.isCouponUsed ? (
											<span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
												{order.coupon?.code}
											</span>
										) : (
											"—"
										)}
									</td>
									<td
										className="px-4 py-3"
										onClick={(e) => {
											e.stopPropagation();
										}}
									>
										<select
											value={order.status}
											onChange={(e) =>
												toast.promise(
													updateOrder(order.id, { status: e.target.value }),
													{ loading: t("store.updatingOrder") },
												)
											}
											className="border-gray-300 rounded-md text-sm focus:ring focus:ring-blue-200"
										>
											<option value="ORDER_PLACED">ORDER_PLACED</option>
											<option value="PROCESSING">PROCESSING</option>
											<option value="SHIPPED">SHIPPED</option>
											<option value="DELIVERED">DELIVERED</option>
											<option value="CANCELLED">CANCELLED</option>
										</select>
									</td>
									<td className="px-4 py-3 text-gray-500">
										{new Date(order.createdAt).toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
			{pagination && pagination.totalPages > 1 && (
				<div className="mt-4 flex max-w-4xl flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
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
			{isModalOpen && selectedOrder && (
				<div
					onClick={closeModal}
					className="fixed inset-0 flex items-center justify-center bg-black/50 text-slate-700 text-sm backdrop-blur-xs z-50"
				>
					<div
						onClick={(e) => e.stopPropagation()}
						className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative"
					>
						<h2 className="text-xl font-semibold text-slate-900 mb-4 text-center">
							{t("store.orderDetails")}
						</h2>
						<div className="mb-4">
							<h3 className="font-semibold mb-2">
								{t("store.customerDetails")}
							</h3>
							<p>
								<span className="text-orange-700">{t("store.nameField")}</span>{" "}
								{selectedOrder.user?.name}
							</p>
							<p>
								<span className="text-orange-700">{t("store.emailField")}</span>{" "}
								{selectedOrder.user?.email}
							</p>
							<p>
								<span className="text-orange-700">{t("store.phoneField")}</span>{" "}
								{selectedOrder.address?.phone}
							</p>
							<p>
								<span className="text-orange-700">
									{t("store.addressField")}
								</span>{" "}
								{`${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`}
							</p>
						</div>
						<div className="mb-4">
							<h3 className="font-semibold mb-2">{t("store.products")}</h3>
							<div className="space-y-2">
								{selectedOrder.orderItems.map((item, i) => (
									<div
										key={i}
										className="flex items-center gap-4 border border-slate-100 shadow rounded p-2"
									>
										<img
											src={resolveProductImageSrc(item.product.images?.[0])}
											alt={item.product?.name}
											className="w-16 h-16 object-cover rounded"
										/>
										<div className="flex-1">
											<p className="text-slate-800">{item.product?.name}</p>
											<p>
												{t("ordersPage.quantityLabel")} {item.quantity}
											</p>
											<p>
												{t("ordersPage.priceLabel")} {currency}
												{item.price.toLocaleString()}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>
						<div className="mb-4">
							<p>
								<span className="text-orange-700">
									{t("store.paymentMethod")}
								</span>{" "}
								{selectedOrder.paymentMethod}
							</p>
							<p>
								<span className="text-orange-700">{t("store.paid")}</span>{" "}
								{selectedOrder.isPaid ? t("common.yes") : t("common.no")}
							</p>
							{selectedOrder.isCouponUsed && (
								<p>
									<span className="text-orange-700">{t("store.coupon")}</span>{" "}
									{selectedOrder.coupon.code} ({selectedOrder.coupon.discount}%
									{t("ordersPage.discountOff")})
								</p>
							)}
							<p>
								<span className="text-orange-700">{t("store.status")}</span>{" "}
								{selectedOrder.status}
							</p>
							{selectedOrder.trackingCarrier || selectedOrder.trackingNumber ? (
								<p>
									<span className="text-orange-700">
										{t("ordersPage.tracking")}
									</span>{" "}
									{[selectedOrder.trackingCarrier, selectedOrder.trackingNumber]
										.filter(Boolean)
										.join(" · ")}
								</p>
							) : null}
							<p>
								<span className="text-orange-700">{t("store.orderDate")}</span>{" "}
								{new Date(selectedOrder.createdAt).toLocaleString()}
							</p>
						</div>
						<form
							onSubmit={(event) =>
								toast.promise(
									(async () => {
										event.preventDefault();
										await updateOrder(selectedOrder.id, trackingForm);
									})(),
									{
										loading: t("ordersPage.savingTracking"),
										success: t("ordersPage.trackingSaved"),
										error: (error) => error.message,
									},
								)
							}
							className="mb-4 rounded border border-slate-100 bg-slate-50 p-3"
						>
							<h3 className="font-semibold mb-2 text-slate-800">
								{t("ordersPage.fulfillment")}
							</h3>
							<div className="grid gap-2 sm:grid-cols-2">
								<label className="text-xs text-slate-500">
									{t("ordersPage.trackingCarrier")}
									<input
										className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
										value={trackingForm.trackingCarrier}
										onChange={(event) =>
											updateTrackingForm("trackingCarrier", event.target.value)
										}
									/>
								</label>
								<label className="text-xs text-slate-500">
									{t("ordersPage.trackingNumber")}
									<input
										className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
										value={trackingForm.trackingNumber}
										onChange={(event) =>
											updateTrackingForm("trackingNumber", event.target.value)
										}
									/>
								</label>
								<label className="text-xs text-slate-500 sm:col-span-2">
									{t("ordersPage.trackingUrl")}
									<input
										type="url"
										className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
										value={trackingForm.trackingUrl}
										onChange={(event) =>
											updateTrackingForm("trackingUrl", event.target.value)
										}
										placeholder="https://"
									/>
								</label>
							</div>
							<button
								type="submit"
								className="mt-3 rounded bg-[#1A1A1A] px-4 py-2 text-sm text-white hover:bg-orange-600"
							>
								{t("ordersPage.saveTracking")}
							</button>
						</form>
						{selectedOrder.isPaid && grants.length > 0 ? (
							<div className="mb-4 rounded border border-slate-100 bg-slate-50 p-3">
								<h3 className="font-semibold mb-2 text-slate-800">
									{t("ordersPage.downloadGrants")}
								</h3>
								<div className="space-y-2">
									{grants.map((grant) => {
										const remaining = Math.max(
											0,
											grant.maxDownloads - grant.downloadCount,
										);
										const isRevoked = Boolean(grant.revokedAt);
										const isExpired =
											grant.expiresAt &&
											new Date(grant.expiresAt).getTime() < Date.now();
										return (
											<div
												key={grant.id}
												className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2"
											>
												<div className="flex-1">
													<p className="text-slate-800">{grant.productName}</p>
													<p className="text-xs text-slate-500">
														{t("ordersPage.downloadCount", {
															used: grant.downloadCount,
															max: grant.maxDownloads,
														})}
														{remaining > 0
															? ` · ${t("ordersPage.remaining", { remaining })}`
															: ""}
													</p>
													{grant.expiresAt ? (
														<p className="text-xs text-slate-400">
															{t("ordersPage.expiresAt")}{" "}
															{new Date(grant.expiresAt).toLocaleDateString()}
														</p>
													) : null}
													{isRevoked ? (
														<p className="text-xs text-red-600">{t("ordersPage.revoked")}</p>
													) : null}
													{isExpired && !isRevoked ? (
														<p className="text-xs text-red-600">{t("ordersPage.expired")}</p>
													) : null}
												</div>
												<div className="flex gap-1">
													<a
														href={`/api/downloads/${grant.token}`}
														target="_blank"
														rel="noreferrer"
														title={t("ordersPage.downloadLink")}
														className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
													>
														<DownloadIcon size={16} />
													</a>
													<button
														type="button"
														onClick={() => manageGrant(grant.id, "reissue", grant.productName)}
														title={t("ordersPage.reissueGrant")}
														className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
													>
														<RefreshCwIcon size={16} />
													</button>
													{!isRevoked ? (
														<button
															type="button"
															onClick={() => manageGrant(grant.id, "revoke", grant.productName)}
															title={t("ordersPage.revokeGrant")}
															className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50"
														>
															<BanIcon size={16} />
														</button>
													) : null}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						) : null}
						{selectedOrder.isPaid && grantsLoading ? (
							<p className="mb-4 text-xs text-slate-400">
								{t("ordersPage.loadingGrants")}
							</p>
						) : null}
						<div className="flex justify-end">
							<button
								onClick={closeModal}
								className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300"
							>
								{t("common.close")}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
