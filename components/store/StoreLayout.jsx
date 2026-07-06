"use client";
import { useEffect, useState } from "react";
import Loading from "../Loading";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import SellerNavbar from "./StoreNavbar";
import SellerSidebar from "./StoreSidebar";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

const StoreLayout = ({ children }) => {
	const { t } = useTranslation();
	const [isSeller, setIsSeller] = useState(false);
	const [loading, setLoading] = useState(true);
	const [storeInfo, setStoreInfo] = useState(null);

	const fetchIsSeller = async () => {
		try {
			const data = await fetchJson("/api/stores/me");
			const store = data.store;
			setIsSeller(Boolean(store && store.status === "approved" && store.isActive));
			setStoreInfo(store);
		} catch {
			setIsSeller(false);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchIsSeller();
	}, []);

	return loading ? (
		<Loading />
	) : isSeller ? (
		<div className="flex flex-col h-screen">
			<SellerNavbar />
			<div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
				<SellerSidebar storeInfo={storeInfo} />
				<div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
					{children}
				</div>
			</div>
		</div>
	) : (
		<div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
			<h1 className="text-2xl sm:text-4xl font-semibold text-muted-foreground">
				{t("store.notAuthorized")}
			</h1>
			<Link
				href="/"
				className="bg-accent text-accent-foreground flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full"
			>
				{t("store.goToHome")} <ArrowRightIcon size={18} />
			</Link>
		</div>
	);
};

export default StoreLayout;
