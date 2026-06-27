"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
	const { locale, toggleLocale } = useTranslation();

	return (
		<button
			onClick={toggleLocale}
			className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-[#F5F0E8] hover:border-orange-300"
		>
			<Globe size={14} className="text-slate-500" />
			<span className={locale === "ko" ? "text-orange-500" : "text-slate-500"}>
				한
			</span>
			<span className="text-slate-300">/</span>
			<span className={locale === "en" ? "text-orange-500" : "text-slate-500"}>
				EN
			</span>
		</button>
	);
}
