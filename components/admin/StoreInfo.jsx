"use client";
import Image from "next/image";
import { MapPin, Mail, Phone } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

function formatStoreStatus(t, status) {
	if (status === "pending") return t("admin.storeStatusPending");
	if (status === "rejected") return t("admin.storeStatusRejected");
	return t("admin.storeStatusApproved");
}

const StoreInfo = ({ store }) => {
	const { t } = useTranslation();

	return (
		<div className="flex-1 space-y-2 text-sm">
			<Image
				width={100}
				height={100}
				src={store.logo || "/favicon.ico"}
				alt={store.name}
				className="max-w-20 max-h-20 object-contain shadow rounded-full max-sm:mx-auto"
			/>
			<div className="flex flex-col sm:flex-row gap-3 items-center">
				<h3 className="text-xl font-semibold text-foreground"> {store.name} </h3>
				<span className="text-sm">@{store.username}</span>

				<span
					className={`text-xs font-semibold px-4 py-1 rounded-full ${
						store.status === "pending"
							? "bg-warning-soft text-warning"
							: store.status === "rejected"
								? "bg-danger-soft text-danger"
								: "bg-success-soft text-success"
					}`}
				>
					{formatStoreStatus(t, store.status)}
				</span>
			</div>

			<p className="text-muted-foreground my-5 max-w-2xl">{store.description}</p>
			<p className="flex items-center gap-2">
				<MapPin size={16} /> {store.address}
			</p>
			<p className="flex items-center gap-2">
				<Phone size={16} /> {store.contact}
			</p>
			<p className="flex items-center gap-2">
				<Mail size={16} /> {store.email}
			</p>
			<p className="text-foreground mt-5">
				{t("admin.appliedOn", {
					date: new Date(store.createdAt).toLocaleDateString(),
				})}
			</p>
			<div className="flex items-center gap-2 text-sm ">
				<Image
					width={36}
					height={36}
					src={store.user?.image || "/favicon.ico"}
					alt={store.user?.name || "seller"}
					className="w-9 h-9 rounded-full"
				/>
				<div>
					<p className="text-muted-foreground font-medium">{store.user?.name}</p>
					<p className="text-muted-foreground">{store.user?.email}</p>
				</div>
			</div>
		</div>
	);
};

export default StoreInfo;
