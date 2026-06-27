"use client";
import { usePathname } from "next/navigation";
import {
	HomeIcon,
	LayoutListIcon,
	MessageSquareIcon,
	StoreIcon,
	SquarePenIcon,
	SquarePlusIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const StoreSidebar = ({ storeInfo }) => {
	const { t } = useTranslation();
	const pathname = usePathname();
	const canEditProfile = storeInfo?.permissions?.canEditProfile !== false;
	const canManageProducts = storeInfo?.permissions?.canManageProducts !== false;
	const canManageOrders = storeInfo?.permissions?.canManageOrders !== false;
	const canManageQuestions = storeInfo?.permissions?.canManageQuestions !== false;

	const sidebarLinks = [
		{ name: t("store.dashboard"), href: "/store", icon: HomeIcon },
		{
			name: t("store.profile"),
			href: "/store/profile",
			icon: StoreIcon,
			requiresProfileEdit: true,
		},
		{
			name: t("store.addProduct"),
			href: "/store/add-product",
			icon: SquarePlusIcon,
			requiresProductManagement: true,
		},
		{
			name: t("store.manageProduct"),
			href: "/store/manage-product",
			icon: SquarePenIcon,
			requiresProductManagement: true,
		},
		{
			name: t("store.orders"),
			href: "/store/orders",
			icon: LayoutListIcon,
			requiresOrderManagement: true,
		},
		{
			name: t("store.productQuestions"),
			href: "/store/questions",
			icon: MessageSquareIcon,
			requiresQuestionManagement: true,
		},
	];
	const visibleSidebarLinks = sidebarLinks.filter(
		(link) =>
			(!link.requiresProfileEdit || canEditProfile) &&
			(!link.requiresProductManagement || canManageProducts) &&
			(!link.requiresOrderManagement || canManageOrders) &&
			(!link.requiresQuestionManagement || canManageQuestions),
	);

	return (
		<div className="inline-flex h-full flex-col gap-5 border-r border-slate-200 sm:min-w-60">
			<div className="flex flex-col gap-3 justify-center items-center pt-8 max-sm:hidden">
				<Image
					className="w-14 h-14 rounded-full shadow-md"
					src={storeInfo?.logo || "/favicon.ico"}
					alt=""
					width={80}
					height={80}
				/>
				<p className="text-slate-700">{storeInfo?.name}</p>
			</div>
			<div className="max-sm:mt-6">
				{visibleSidebarLinks.map((link, index) => (
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

export default StoreSidebar;
