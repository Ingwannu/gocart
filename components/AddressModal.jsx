"use client";
import { XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useDispatch } from "react-redux";
import { addAddress, updateAddress } from "@/lib/features/address/addressSlice";
import { fetchJson } from "@/lib/http";

const emptyAddress = {
	name: "",
	email: "",
	street: "",
	city: "",
	state: "",
	zip: "",
	country: "",
	phone: "",
};

const AddressModal = ({ addressToEdit = null, onSaved, setShowAddressModal }) => {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const [address, setAddress] = useState(addressToEdit || emptyAddress);

	const handleAddressChange = (e) => {
		setAddress({ ...address, [e.target.name]: e.target.value });
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		const endpoint = addressToEdit
			? `/api/addresses/${addressToEdit.id}`
			: "/api/addresses";
		const data = await fetchJson(endpoint, {
			method: addressToEdit ? "PATCH" : "POST",
			body: JSON.stringify(address),
		});
		dispatch(addressToEdit ? updateAddress(data.address) : addAddress(data.address));
		onSaved?.(data.address);
		setShowAddressModal(false);
	};

	return (
		<form
			onSubmit={(e) =>
				toast.promise(handleSubmit(e), {
					loading: t("addressModal.addingAddress"),
				})
			}
			className="fixed inset-0 z-50 bg-background/60 backdrop-blur h-screen flex items-center justify-center"
		>
			<div className="flex flex-col gap-5 text-foreground w-full max-w-sm mx-6">
				<h2 className="text-3xl ">
					{addressToEdit
						? t("addressModal.editAddress")
						: t("addressModal.addNewAddress")}
				</h2>
				<input
					name="name"
					onChange={handleAddressChange}
					value={address.name}
					className="p-2 px-4 outline-none border border-border rounded w-full"
					type="text"
					placeholder={t("addressModal.enterName")}
					required
				/>
				<input
					name="email"
					onChange={handleAddressChange}
					value={address.email}
					className="p-2 px-4 outline-none border border-border rounded w-full"
					type="email"
					placeholder={t("addressModal.emailPlaceholder")}
					required
				/>
				<input
					name="street"
					onChange={handleAddressChange}
					value={address.street}
					className="p-2 px-4 outline-none border border-border rounded w-full"
					type="text"
					placeholder={t("addressModal.street")}
					required
				/>
				<div className="flex gap-4">
					<input
						name="city"
						onChange={handleAddressChange}
						value={address.city}
						className="p-2 px-4 outline-none border border-border rounded w-full"
						type="text"
						placeholder={t("addressModal.city")}
						required
					/>
					<input
						name="state"
						onChange={handleAddressChange}
						value={address.state}
						className="p-2 px-4 outline-none border border-border rounded w-full"
						type="text"
						placeholder={t("addressModal.state")}
						required
					/>
				</div>
				<div className="flex gap-4">
					<input
						name="zip"
						onChange={handleAddressChange}
						value={address.zip}
						className="p-2 px-4 outline-none border border-border rounded w-full"
						type="number"
						placeholder={t("addressModal.zipCode")}
						required
					/>
					<input
						name="country"
						onChange={handleAddressChange}
						value={address.country}
						className="p-2 px-4 outline-none border border-border rounded w-full"
						type="text"
						placeholder={t("addressModal.country")}
						required
					/>
				</div>
				<input
					name="phone"
					onChange={handleAddressChange}
					value={address.phone}
					className="p-2 px-4 outline-none border border-border rounded w-full"
					type="text"
					placeholder={t("addressModal.phone")}
					required
				/>
				<button className="bg-accent text-accent-foreground text-sm font-medium py-2.5 rounded-md hover:brightness-95 active:scale-95 transition-all">
					{addressToEdit
						? t("addressModal.updateAddress")
						: t("addressModal.saveAddress")}
				</button>
			</div>
			<XIcon
				size={30}
				className="absolute top-5 right-5 text-muted-foreground hover:text-foreground cursor-pointer"
				onClick={() => setShowAddressModal(false)}
			/>
		</form>
	);
};

export default AddressModal;
