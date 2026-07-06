"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Globe } from "lucide-react";

export default function LanguageToggle() {
	const { locale, toggleLocale } = useTranslation();

	return (
		<button
			onClick={toggleLocale}
			className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-muted hover:border-accent/30"
		>
			<Globe size={14} className="text-muted-foreground" />
			<span className={locale === "ko" ? "text-foreground" : "text-muted-foreground"}>
				한
			</span>
			<span className="text-border">/</span>
			<span className={locale === "en" ? "text-foreground" : "text-muted-foreground"}>
				EN
			</span>
		</button>
	);
}
