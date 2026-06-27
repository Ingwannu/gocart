"use client";
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";

const statusStyles = {
	ORDER_PLACED: "text-slate-500 bg-slate-100",
	PROCESSING: "text-yellow-600 bg-yellow-100",
	SHIPPED: "text-blue-600 bg-blue-100",
	DELIVERED: "text-orange-600 bg-orange-100",
	CANCELLED: "text-red-600 bg-red-100",
};

const OrderItem = ({ order, onCancel, onReturnRequest, onDownloadReceipt }) => {
	const { t } = useTranslation();
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const [ratingModal, setRatingModal] = useState(null);
	const { ratings } = useSelector((state) => state.rating);
	const hasTracking = Boolean(order.trackingCarrier || order.trackingNumber);
	const canCancel = order.status === "ORDER_PLACED";
	const canRequestReturn = order.status === "DELIVERED" && !order.returnRequest;
	const canDownloadDigital = order.isPaid || order.status === "DELIVERED";
	const address = order.address;

	return (
		<>
			<tr className="text-sm">
				<td className="text-left">
					<div className="flex flex-col gap-6">
						{order.orderItems.map((item, index) => (
							<div key={index} className="flex items-center gap-4">
								<div className="w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md">
									<Image
										className="h-14 w-auto"
										src={resolveProductImageSrc(item.product.images?.[0])}
										alt="product_img"
										width={50}
										height={50}
									/>
								</div>
								<div className="flex flex-col justify-center text-sm">
									<p className="font-medium text-slate-600 text-base">
										{item.product.name}
									</p>
									<p>
										{currency}
										{item.price} Qty : {item.quantity}
									</p>
									<p className="mb-1">
										{new Date(order.createdAt).toDateString()}
									</p>
									{item.product.deliveryType === "digital" && (
										<div className="mb-1">
											{canDownloadDigital ? (
												<a
													href={`/api/orders/${order.id}/downloads/${item.product.id}`}
													className="inline-flex rounded border border-green-200 px-2 py-1 text-xs text-green-700 hover:bg-green-50"
												>
													{t("ordersPage.downloadDigitalProduct")}
												</a>
											) : (
												<span className="text-xs text-slate-400">
													{t("ordersPage.downloadAvailableAfterPayment")}
												</span>
											)}
										</div>
									)}
									<div>
										{ratings.find(
											(rating) =>
												order.id === rating.orderId &&
												item.product.id === rating.productId,
										) ? (
											<Rating
												value={
													ratings.find(
														(rating) =>
															order.id === rating.orderId &&
															item.product.id === rating.productId,
													).rating
												}
											/>
										) : (
											<button
												onClick={() =>
													setRatingModal({
														orderId: order.id,
														productId: item.product.id,
													})
												}
												className={`text-orange-500 hover:bg-orange-50 transition ${order.status !== "DELIVERED" && "hidden"}`}
											>
												{t("ordersPage.rateProduct")}
											</button>
										)}
									</div>
									{ratingModal && (
										<RatingModal
											ratingModal={ratingModal}
											setRatingModal={setRatingModal}
										/>
									)}
								</div>
							</div>
						))}
					</div>
				</td>
				<td className="text-center max-md:hidden">
					{currency}
					{order.total}
				</td>
				<td className="text-left max-md:hidden">
					{address ? (
						<>
							<p>
								{address.name}, {address.street},
							</p>
							<p>
								{address.city}, {address.state}, {address.zip},{" "}
								{address.country},
							</p>
							<p>{address.phone}</p>
						</>
					) : (
						<p className="text-green-700">{t("ordersPage.onlineDelivery")}</p>
					)}
				</td>
				<td className="text-left space-y-2 text-sm max-md:hidden">
					<div className={`flex items-center justify-center gap-1 rounded-full p-1 ${statusStyles[order.status] || statusStyles.ORDER_PLACED}`}>
						<DotIcon size={10} className="scale-250" />
						{order.status.split("_").join(" ").toLowerCase()}
					</div>
					{canCancel && (
						<button
							type="button"
							onClick={() => onCancel?.(order.id)}
							className="w-full rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
						>
							{t("ordersPage.cancelOrder")}
						</button>
					)}
					<button
						type="button"
						onClick={() => onDownloadReceipt?.(order.id)}
						className="w-full rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
					>
						{t("ordersPage.downloadReceipt")}
					</button>
					{canRequestReturn && (
						<button
							type="button"
							onClick={() => onReturnRequest?.(order.id)}
							className="w-full rounded border border-orange-200 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50"
						>
							{t("ordersPage.requestReturn")}
						</button>
					)}
					{order.returnRequest && (
						<div className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-500">
							<p className="font-medium text-slate-700">
								{t("ordersPage.returnRequest")}
							</p>
							<p>{order.returnRequest.status}</p>
						</div>
					)}
					{hasTracking && (
						<div className="rounded border border-slate-200 bg-white p-2 text-xs text-slate-500">
							<p className="font-medium text-slate-700">
								{t("ordersPage.tracking")}
							</p>
							<p>
								{[order.trackingCarrier, order.trackingNumber]
									.filter(Boolean)
									.join(" · ")}
							</p>
							{order.trackingUrl && (
								<a
									href={order.trackingUrl}
									target="_blank"
									rel="noreferrer"
									className="text-orange-600"
								>
									{t("ordersPage.trackPackage")}
								</a>
							)}
						</div>
					)}
				</td>
			</tr>
			<tr className="md:hidden">
				<td colSpan={5}>
					{address ? (
						<>
							<p>
								{address.name}, {address.street}
							</p>
							<p>
								{address.city}, {address.state}, {address.zip},{" "}
								{address.country}
							</p>
							<p>{address.phone}</p>
						</>
					) : (
						<p className="text-green-700">{t("ordersPage.onlineDelivery")}</p>
					)}
					<br />
					<div className="flex items-center">
						<span className={`text-center mx-auto px-6 py-1.5 rounded ${statusStyles[order.status] || statusStyles.ORDER_PLACED}`}>
							{order.status.replace(/_/g, " ").toLowerCase()}
						</span>
					</div>
					{canCancel && (
						<button
							type="button"
							onClick={() => onCancel?.(order.id)}
							className="mt-3 w-full rounded border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
						>
							{t("ordersPage.cancelOrder")}
						</button>
					)}
					<button
						type="button"
						onClick={() => onDownloadReceipt?.(order.id)}
						className="mt-3 w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
					>
						{t("ordersPage.downloadReceipt")}
					</button>
					{canRequestReturn && (
						<button
							type="button"
							onClick={() => onReturnRequest?.(order.id)}
							className="mt-3 w-full rounded border border-orange-200 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50"
						>
							{t("ordersPage.requestReturn")}
						</button>
					)}
					{order.returnRequest && (
						<div className="mt-3 rounded border border-slate-200 p-3 text-sm">
							<p className="font-medium text-slate-700">
								{t("ordersPage.returnRequest")}
							</p>
							<p>{order.returnRequest.status}</p>
						</div>
					)}
					{hasTracking && (
						<div className="mt-3 rounded border border-slate-200 p-3 text-sm">
							<p className="font-medium text-slate-700">
								{t("ordersPage.tracking")}
							</p>
							<p>
								{[order.trackingCarrier, order.trackingNumber]
									.filter(Boolean)
									.join(" · ")}
							</p>
							{order.trackingUrl && (
								<a
									href={order.trackingUrl}
									target="_blank"
									rel="noreferrer"
									className="text-orange-600"
								>
									{t("ordersPage.trackPackage")}
								</a>
							)}
						</div>
					)}
				</td>
			</tr>
			<tr>
				<td colSpan={4}>
					<div className="border-b border-slate-300 w-6/7 mx-auto" />
				</td>
			</tr>
		</>
	);
};

export default OrderItem;
