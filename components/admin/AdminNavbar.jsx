"use client";
import Link from "next/link";
import LanguageToggle from "@/components/LanguageToggle";
import AnimatedThemeToggler from "@/components/ui/AnimatedThemeToggler";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const AdminNavbar = () => {
	const { t } = useTranslation();

	return (
		<div className="flex items-center justify-between px-12 py-3 border-b border-border transition-all">
			<Link href="/" className="relative text-4xl font-semibold text-foreground">
				<span className="text-foreground">wicked</span>{" "}
				<span className="text-success">shop</span>
				<span className="text-accent text-5xl leading-0">.</span>
				<p className="absolute text-xs font-semibold -top-1 -right-13 px-3 p-0.5 rounded-full flex items-center gap-2 bg-accent text-accent-foreground">
					{t("admin.dashboard")}
				</p>
			</Link>
			<div className="flex items-center gap-3">
				<LanguageToggle />
				<AnimatedThemeToggler className="h-8 w-8" />
				<p>{t("admin.hiAdmin")}</p>
			</div>
		</div>
	);
};

export default AdminNavbar;
