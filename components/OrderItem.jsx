"use client";
import Image from "next/image";
import { DotIcon } from "lucide-react";
import { useSelector } from "react-redux";
import Rating from "./Rating";
import { useState } from "react";
import RatingModal from "./RatingModal";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";

const statusStyles = {
	ORDER_PLACED: "text-muted-foreground bg-muted",
	PROCESSING: "text-warning bg-warning-soft",
	SHIPPED: "text-muted-foreground bg-muted",
	DELIVERED: "text-success bg-success-soft",
	CANCELLED: "text-danger bg-danger-soft",
};

const LicenseKeyBadge = ({ license }) => {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	if (!license) return null;
	const isRevoked = license.status !== "ACTIVE" || license.revokedAt;

	const copyKey = async () => {
		try {
			await navigator.clipboard.writeText(license.key);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard may be unavailable (http, older browsers); the key is
			// visible as text so the buyer can still select it manually.
		}
	};

	return (
		<div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
			<span className="text-muted-foreground">{t("ordersPage.licenseKey")}:</span>
			<code
				className={`rounded border px-1.5 py-0.5 font-mono ${
					isRevoked
						? "border-danger/30 bg-danger-soft text-danger line-through"
						: "border-border bg-muted text-foreground"
				}`}
			>
				{license.key}
			</code>
			{isRevoked ? (
				<span className="text-danger">{t("ordersPage.licenseRevoked")}</span>
			) : (
				<button
					type="button"
					onClick={copyKey}
					className="rounded border border-border px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
				>
					{copied ? t("ordersPage.licenseCopied") : t("ordersPage.licenseCopy")}
				</button>
			)}
		</div>
	);
};

const OrderItem = ({ order, onCancel, onReturnRequest, onDownloadReceipt }) => {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
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
								<div className="w-20 aspect-square bg-muted flex items-center justify-center rounded-md">
									<Image
										className="h-14 w-auto"
										src={resolveProductImageSrc(item.product.images?.[0])}
										alt="product_img"
										width={50}
										height={50}
									/>
								</div>
								<div className="flex flex-col justify-center text-sm">
									<p className="font-medium text-foreground text-base">
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
													className="inline-flex rounded border border-success/30 px-2 py-1 text-xs text-success hover:bg-success-soft"
												>
													{t("ordersPage.downloadDigitalProduct")}
												</a>
											) : (
												<span className="text-xs text-muted-foreground">
													{t("ordersPage.downloadAvailableAfterPayment")}
												</span>
											)}
											<LicenseKeyBadge
												license={order.licenseKeys?.find(
													(license) => license.productId === item.product.id,
												)}
											/>
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
												className={`text-foreground font-medium hover:bg-accent-soft transition ${order.status !== "DELIVERED" && "hidden"}`}
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
						<p className="text-success">{t("ordersPage.onlineDelivery")}</p>
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
							className="w-full rounded border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger-soft"
						>
							{t("ordersPage.cancelOrder")}
						</button>
					)}
					<button
						type="button"
						onClick={() => onDownloadReceipt?.(order.id)}
						className="w-full rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
					>
						{t("ordersPage.downloadReceipt")}
					</button>
					{canRequestReturn && (
						<button
							type="button"
							onClick={() => onReturnRequest?.(order.id)}
							className="w-full rounded border border-accent/30 px-3 py-1.5 text-xs text-foreground hover:bg-accent-soft"
						>
							{t("ordersPage.requestReturn")}
						</button>
					)}
					{order.returnRequest && (
						<div className="rounded border border-border bg-frame p-2 text-xs text-muted-foreground">
							<p className="font-medium text-foreground">
								{t("ordersPage.returnRequest")}
							</p>
							<p>{order.returnRequest.status}</p>
						</div>
					)}
					{hasTracking && (
						<div className="rounded border border-border bg-frame p-2 text-xs text-muted-foreground">
							<p className="font-medium text-foreground">
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
									className="text-foreground underline"
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
						<p className="text-success">{t("ordersPage.onlineDelivery")}</p>
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
							className="mt-3 w-full rounded border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger-soft"
						>
							{t("ordersPage.cancelOrder")}
						</button>
					)}
					<button
						type="button"
						onClick={() => onDownloadReceipt?.(order.id)}
						className="mt-3 w-full rounded border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
					>
						{t("ordersPage.downloadReceipt")}
					</button>
					{canRequestReturn && (
						<button
							type="button"
							onClick={() => onReturnRequest?.(order.id)}
							className="mt-3 w-full rounded border border-accent/30 px-3 py-2 text-sm text-foreground hover:bg-accent-soft"
						>
							{t("ordersPage.requestReturn")}
						</button>
					)}
					{order.returnRequest && (
						<div className="mt-3 rounded border border-border p-3 text-sm">
							<p className="font-medium text-foreground">
								{t("ordersPage.returnRequest")}
							</p>
							<p>{order.returnRequest.status}</p>
						</div>
					)}
					{hasTracking && (
						<div className="mt-3 rounded border border-border p-3 text-sm">
							<p className="font-medium text-foreground">
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
									className="text-foreground underline"
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
					<div className="border-b border-border w-6/7 mx-auto" />
				</td>
			</tr>
		</>
	);
};

export default OrderItem;
