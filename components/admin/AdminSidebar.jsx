"use client";
import { usePathname } from "next/navigation";
import {
	CheckCircleIcon,
	HomeIcon,
	HistoryIcon,
	LifeBuoyIcon,
	LayoutGridIcon,
	LayoutListIcon,
	MailIcon,
	SettingsIcon,
	MessageSquareIcon,
	PackageIcon,
	RefreshCcwIcon,
	StoreIcon,
	TagsIcon,
	TicketPercentIcon,
	UsersIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { assets } from "@/assets/assets";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const AdminSidebar = () => {
	const { t } = useTranslation();
	const pathname = usePathname();

	const sidebarLinks = [
		{ name: t("admin.dashboard"), href: "/admin", icon: HomeIcon },
		{ name: t("admin.orderPayouts"), href: "/admin/orders", icon: LayoutListIcon },
		{ name: t("admin.users"), href: "/admin/users", icon: UsersIcon },
		{ name: t("admin.manageStores"), href: "/admin/stores", icon: StoreIcon },
		{
			name: t("admin.approveStore"),
			href: "/admin/approve",
			icon: CheckCircleIcon,
		},
		{ name: t("admin.products"), href: "/admin/products", icon: PackageIcon },
		{ name: t("admin.reviews"), href: "/admin/reviews", icon: MessageSquareIcon },
		{
			name: t("admin.productQuestions"),
			href: "/admin/questions",
			icon: MessageSquareIcon,
		},
		{ name: t("admin.returns"), href: "/admin/returns", icon: RefreshCcwIcon },
		{ name: t("admin.categories"), href: "/admin/categories", icon: TagsIcon },
		{ name: t("admin.groups"), href: "/admin/groups", icon: LayoutGridIcon },
		{
			name: t("admin.coupons"),
			href: "/admin/coupons",
			icon: TicketPercentIcon,
		},
		{ name: t("admin.newsletter"), href: "/admin/newsletter", icon: MailIcon },
		{ name: t("admin.support"), href: "/admin/support", icon: LifeBuoyIcon },
		{ name: t("admin.auditLogs"), href: "/admin/audit-logs", icon: HistoryIcon },
		{ name: t("admin.settings"), href: "/admin/settings/storage", icon: SettingsIcon },
	];

	return (
		<div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
			<div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
				<Image
					className="w-14 h-14 rounded-full"
					src={assets.gs_logo}
					alt=""
					width={80}
					height={80}
				/>
				<p className="text-slate-700">{t("admin.hiAdmin")}</p>
			</div>
			<div className="max-sm:mt-6">
				{sidebarLinks.map((link, index) => (
					<Link
						key={index}
						href={link.href}
						className={`relative flex items-center gap-3 text-slate-500 hover:bg-slate-50 p-2.5 transition ${pathname === link.href && "bg-slate-100 sm:text-slate-600"}`}
					>
						<link.icon size={18} className="sm:ml-5" />
						<p className="max-sm:hidden">{link.name}</p>
						{pathname === link.href && (
							<span className="absolute bg-orange-500 right-0 top-1.5 bottom-1.5 w-1 sm:w-1.5 rounded-l"></span>
						)}
					</Link>
				))}
			</div>
		</div>
	);
};

export default AdminSidebar;
