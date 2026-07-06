"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardDriveIcon, MailIcon, SlidersHorizontalIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const settingLinks = [
	{ key: "general", href: "/admin/settings/general", icon: SlidersHorizontalIcon },
	{ key: "email", href: "/admin/settings/email", icon: MailIcon },
	{ key: "storage", href: "/admin/settings/storage", icon: HardDriveIcon },
];

export default function SettingsNav() {
	const { t } = useTranslation();
	const pathname = usePathname();

	return (
		<div className="mb-5 flex flex-wrap gap-2">
			{settingLinks.map((link) => (
				<Link
					key={link.key}
					href={link.href}
					className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
						pathname === link.href
							? "border-accent bg-accent-soft text-foreground font-medium"
							: "border-border bg-frame text-muted-foreground hover:bg-muted"
					}`}
				>
					<link.icon size={16} />
					{t(`admin.settings${link.key[0].toUpperCase()}${link.key.slice(1)}`)}
				</Link>
			))}
		</div>
	);
}
