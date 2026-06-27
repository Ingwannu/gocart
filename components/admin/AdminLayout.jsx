"use client";
import { useEffect, useState } from "react";
import Loading from "../Loading";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import AdminNavbar from "./AdminNavbar";
import AdminSidebar from "./AdminSidebar";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const AdminLayout = ({ children }) => {
	const { t } = useTranslation();
	const { data: session, status } = useSession();
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (status === "loading") return;
		if (session?.user?.role === "admin") {
			setIsAdmin(true);
		}
		setLoading(false);
	}, [session, status]);

	return loading ? (
		<Loading />
	) : isAdmin ? (
		<div className="flex flex-col h-screen">
			<AdminNavbar />
			<div className="flex flex-1 items-start h-full overflow-y-scroll no-scrollbar">
				<AdminSidebar />
				<div className="flex-1 h-full p-5 lg:pl-12 lg:pt-12 overflow-y-scroll">
					{children}
				</div>
			</div>
		</div>
	) : (
		<div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
			<h1 className="text-2xl sm:text-4xl font-semibold text-slate-400">
				{t("admin.notAuthorized")}
			</h1>
			<Link
				href="/"
				className="bg-[#1A1A1A] text-white flex items-center gap-2 mt-8 p-2 px-6 max-sm:text-sm rounded-full"
			>
				{t("admin.goToHome")} <ArrowRightIcon size={18} />
			</Link>
		</div>
	);
};

export default AdminLayout;
