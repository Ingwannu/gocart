"use client";
import { PlusIcon, SquarePenIcon, TrashIcon, XIcon } from "lucide-react";
import React, { useState } from "react";
import AddressModal from "./AddressModal";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { clearCart } from "@/lib/features/cart/cartSlice";
import { removeAddress, setAddresses } from "@/lib/features/address/addressSlice";
import { fetchJson } from "@/lib/http";
import { useEffect } from "react";

const OrderSummary = ({ totalPrice, items = [] }) => {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();
	const stripeEnabled = process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true";
	const router = useRouter();
	const dispatch = useDispatch();
	const addressList = useSelector((state) => state.address.list);
	const [paymentMethod, setPaymentMethod] = useState("COD");
	const [selectedAddress, setSelectedAddress] = useState(null);
	const [showAddressModal, setShowAddressModal] = useState(false);
	const [editingAddress, setEditingAddress] = useState(null);
	const [couponCodeInput, setCouponCodeInput] = useState("");
	const [coupon, setCoupon] = useState("");
	const requiresShippingAddress = items.some(
		(item) => item.deliveryType !== "digital",
	);

	const handleCouponCode = async (event) => {
		event.preventDefault();
		const data = await fetchJson("/api/coupons/validate", {
			method: "POST",
			body: JSON.stringify({ code: couponCodeInput, totalPrice }),
		});
		setCoupon(data.coupon);
	};
	const handlePlaceOrder = async (e) => {
		e.preventDefault();
		if (requiresShippingAddress && !selectedAddress) {
			throw new Error("Please select an address");
		}
		if (paymentMethod !== "COD" && !stripeEnabled) {
			throw new Error("Stripe checkout is not connected yet");
		}

		const data = await fetchJson("/api/orders", {
			method: "POST",
			body: JSON.stringify({
				addressId: selectedAddress?.id,
				paymentMethod,
				coupon,
				items: items.map((item) => ({
					productId: item.id,
					quantity: item.quantity,
				})),
			}),
		});
		dispatch(clearCart());
		if (data.checkoutUrl) {
			window.location.assign(data.checkoutUrl);
			return;
		}
		router.push("/orders");
	};
	const handleDeleteAddress = async () => {
		if (!selectedAddress) return;
		await fetchJson(`/api/addresses/${selectedAddress.id}`, { method: "DELETE" });
		dispatch(removeAddress(selectedAddress.id));
		setSelectedAddress(null);
	};

	useEffect(() => {
		const loadAddresses = async () => {
			try {
				const data = await fetchJson("/api/addresses");
				dispatch(setAddresses(data.addresses || []));
			} catch {
				dispatch(setAddresses([]));
			}
		};

		loadAddresses();
	}, [dispatch]);

	return (
		<div className="w-full max-w-lg lg:max-w-[340px] bg-muted/30 border border-border text-muted-foreground text-sm rounded-xl p-7">
			<h2 className="text-xl font-medium text-foreground">
				{t("orderSummary.paymentSummary")}
			</h2>
			<p className="text-muted-foreground text-xs my-4">
				{t("orderSummary.paymentMethod")}
			</p>
			<div className="flex gap-2 items-center">
				<input
					type="radio"
					id="COD"
					name="payment"
					onChange={() => setPaymentMethod("COD")}
					checked={paymentMethod === "COD"}
					className="accent-gray-500"
				/>
				<label htmlFor="COD" className="cursor-pointer">
					COD
				</label>
			</div>
			{stripeEnabled && (
				<div className="flex gap-2 items-center mt-1">
					<input
						type="radio"
						id="STRIPE"
						name="payment"
						onChange={() => setPaymentMethod("STRIPE")}
						checked={paymentMethod === "STRIPE"}
						className="accent-gray-500"
					/>
					<label htmlFor="STRIPE" className="cursor-pointer">
						Stripe Payment
					</label>
				</div>
			)}
			{requiresShippingAddress ? (
				<div className="my-4 py-4 border-y border-border text-muted-foreground">
					<p>{t("orderSummary.address")}</p>
					{selectedAddress ? (
						<div className="flex gap-2 items-center">
							<p>
								{selectedAddress.name}, {selectedAddress.city},{" "}
								{selectedAddress.state}, {selectedAddress.zip}
							</p>
							<SquarePenIcon
								onClick={() => {
									setEditingAddress(selectedAddress);
									setShowAddressModal(true);
								}}
								className="cursor-pointer"
								size={18}
							/>
							<TrashIcon
								onClick={() =>
									toast.promise(handleDeleteAddress(), {
										loading: t("addressModal.deletingAddress"),
									})
								}
								className="cursor-pointer text-danger hover:text-danger/80"
								size={18}
							/>
							<XIcon
								onClick={() => setSelectedAddress(null)}
								className="cursor-pointer"
								size={18}
							/>
						</div>
					) : (
						<div>
							{addressList.length > 0 && (
								<select
									className="border border-border p-2 w-full my-3 outline-none rounded"
									onChange={(e) =>
										setSelectedAddress(addressList[e.target.value])
									}
								>
									<option value="">{t("orderSummary.selectAddress")}</option>
									{addressList.map((address, index) => (
										<option key={index} value={index}>
											{address.name}, {address.city}, {address.state},{" "}
											{address.zip}
										</option>
									))}
								</select>
							)}
							<button
								className="flex items-center gap-1 text-foreground mt-1"
								onClick={() => {
									setEditingAddress(null);
									setShowAddressModal(true);
								}}
							>
								{t("orderSummary.addAddress")} <PlusIcon size={18} />
							</button>
						</div>
					)}
				</div>
			) : (
				<div className="my-4 rounded border border-success/30 bg-success-soft p-3 text-success">
					<p className="font-medium">{t("orderSummary.onlineDelivery")}</p>
					<p className="text-xs">{t("orderSummary.digitalDeliveryNote")}</p>
				</div>
			)}
			<div className="pb-4 border-b border-border">
				<div className="flex justify-between">
					<div className="flex flex-col gap-1 text-muted-foreground">
						<p>{t("orderSummary.subtotal")}</p>
						<p>{t("orderSummary.shipping")}</p>
						{coupon && <p>{t("orderSummary.coupon")}</p>}
					</div>
					<div className="flex flex-col gap-1 font-medium text-right">
						<p>
							{currency}
							{totalPrice.toLocaleString()}
						</p>
						<p>Free</p>
						{coupon && (
							<p>{`-${currency}${((coupon.discount / 100) * totalPrice).toFixed(2)}`}</p>
						)}
					</div>
				</div>
				{!coupon ? (
					<form
						onSubmit={(e) =>
							toast.promise(handleCouponCode(e), {
								loading: "Checking Coupon...",
							})
						}
						className="flex justify-center gap-3 mt-3"
					>
						<input
							onChange={(e) => setCouponCodeInput(e.target.value)}
							value={couponCodeInput}
							type="text"
							placeholder={t("orderSummary.couponCode")}
							className="border border-border p-1.5 rounded w-full outline-none"
						/>
						<button className="bg-accent text-accent-foreground px-3 rounded hover:brightness-95 active:scale-95 transition-all">
							{t("common.apply")}
						</button>
					</form>
				) : (
					<div className="w-full flex items-center justify-center gap-2 text-xs mt-2">
						<p>
							{t("orderSummary.code")}{" "}
							<span className="font-semibold ml-1">
								{coupon.code.toUpperCase()}
							</span>
						</p>
						<p>{coupon.description}</p>
						<XIcon
							size={18}
							onClick={() => setCoupon("")}
							className="hover:text-danger transition cursor-pointer"
						/>
					</div>
				)}
			</div>
			<div className="flex justify-between py-4">
				<p>Total:</p>
				<p className="font-medium text-right">
					{currency}
					{coupon
						? (totalPrice - (coupon.discount / 100) * totalPrice).toFixed(2)
						: totalPrice.toLocaleString()}
				</p>
			</div>
			<button
				onClick={(e) =>
					toast.promise(handlePlaceOrder(e), { loading: "placing Order..." })
				}
				className="w-full bg-accent text-accent-foreground py-2.5 rounded hover:brightness-95 active:scale-95 transition-all"
			>
				{t("orderSummary.placeOrder")}
			</button>
			{showAddressModal && (
				<AddressModal
					addressToEdit={editingAddress}
					onSaved={(address) => {
						if (editingAddress?.id === selectedAddress?.id) {
							setSelectedAddress(address);
						}
						setEditingAddress(null);
					}}
					setShowAddressModal={(open) => {
						setShowAddressModal(open);
						if (!open) setEditingAddress(null);
					}}
				/>
			)}
		</div>
	);
};

export default OrderSummary;
