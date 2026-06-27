"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRightIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function CreateStore() {
	const { t } = useTranslation();
	const { data: session } = useSession();

	return (
		<div className="mx-6 min-h-[70vh] my-16 flex items-center">
			<div className="max-w-3xl mx-auto text-center">
				<h1 className="text-3xl sm:text-5xl font-semibold text-slate-800">
					{t("createStore.adminManagedTitle")}
				</h1>
				<p className="mt-5 text-slate-500 text-lg">
					{t("createStore.adminManagedDescription")}
				</p>
				{session?.user?.role === "admin" ? (
					<Link
						href="/admin/stores"
						className="inline-flex items-center gap-2 mt-8 bg-[#1A1A1A] text-white px-6 py-3 rounded-full hover:bg-orange-600 transition"
					>
						{t("admin.manageStores")} <ArrowRightIcon size={18} />
					</Link>
				) : (
					<p className="mt-8 text-slate-400">
						{t("createStore.contactAdmin")}
					</p>
				)}
			</div>
		</div>
	);
}
