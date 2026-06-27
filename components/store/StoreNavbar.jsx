"use client";
import Link from "next/link";
import LanguageToggle from "@/components/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const StoreNavbar = () => {
	const { t } = useTranslation();

	return (
		<div className="flex items-center justify-between px-12 py-3 border-b border-slate-200 transition-all">
			<Link href="/" className="relative text-4xl font-semibold text-slate-700">
				<span className="text-orange-500">wicked</span>{" "}
				<span className="text-green-600">shop</span>
				<span className="text-orange-500 text-5xl leading-0">.</span>
				<p className="absolute text-xs font-semibold -top-1 -right-11 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-orange-500">
					{t("store.dashboard")}
				</p>
			</Link>
			<div className="flex items-center gap-3">
				<LanguageToggle />
				<p>{t("store.hiSeller")}</p>
			</div>
		</div>
	);
};

export default StoreNavbar;
