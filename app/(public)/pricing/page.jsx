"use client";

import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { BadgePercentIcon, CheckIcon, ShieldCheckIcon, SparklesIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

function roleHasPlusAccess(role) {
	return role === "member" || role === "admin";
}

export default function PricingPage() {
	const { t } = useTranslation();
	const { data: session, status } = useSession();
	const [role, setRole] = useState(session?.user?.role || "");
	const [upgrading, setUpgrading] = useState(false);
	const currentRole = role || session?.user?.role || "";
	const hasPlusAccess = roleHasPlusAccess(currentRole);
	const isLoggedIn = status === "authenticated";

	const activateMembership = async () => {
		setUpgrading(true);
		try {
			const data = await fetchJson("/api/membership", { method: "POST" });
			setRole(data.user?.role || currentRole);
		} finally {
			setUpgrading(false);
		}
	};

	if (status === "loading") return <Loading />;

	const benefits = [
		t("pricing.memberCoupons"),
		t("pricing.memberSupport"),
		t("pricing.memberDrops"),
	];

	return (
		<div className="mx-6 min-h-[70vh] text-slate-600">
			<div className="mx-auto my-14 max-w-5xl">
				<div className="max-w-2xl">
					<p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-600">
						<SparklesIcon size={16} />
						{t("pricing.badge")}
					</p>
					<h1 className="mt-5 text-3xl font-semibold text-slate-900 sm:text-5xl">
						{t("pricing.title")}
					</h1>
					<p className="mt-4 text-base leading-7 text-slate-500">
						{t("pricing.subtitle")}
					</p>
				</div>

				<div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
					<section className="rounded-lg border border-slate-200 bg-white p-6">
						<div className="flex items-start gap-4">
							<div className="flex size-11 items-center justify-center rounded-lg bg-green-50 text-green-600">
								<BadgePercentIcon size={22} />
							</div>
							<div>
								<h2 className="text-xl font-medium text-slate-900">
									{t("pricing.plusPlan")}
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									{t("pricing.plusDescription")}
								</p>
							</div>
						</div>

						<ul className="mt-6 space-y-3">
							{benefits.map((benefit) => (
								<li key={benefit} className="flex items-start gap-3 text-sm">
									<CheckIcon size={18} className="mt-0.5 text-green-600" />
									<span>{benefit}</span>
								</li>
							))}
						</ul>
					</section>

					<aside className="rounded-lg border border-slate-200 bg-slate-50 p-6">
						<div className="flex items-center justify-between gap-4">
							<div>
								<p className="text-sm text-slate-400">{t("pricing.priceLabel")}</p>
								<p className="mt-1 text-3xl font-semibold text-slate-900">
									{t("pricing.freePrice")}
								</p>
							</div>
							<ShieldCheckIcon size={30} className="text-green-600" />
						</div>
						<p className="mt-5 rounded bg-white p-3 text-sm text-slate-500">
							{hasPlusAccess
								? t("pricing.activeStatus")
								: t("pricing.inactiveStatus")}
						</p>

						{!isLoggedIn ? (
							<Link
								href="/login?callbackUrl=/pricing"
								className="mt-5 block rounded bg-[#1A1A1A] px-5 py-3 text-center text-sm font-medium text-white hover:bg-orange-600"
							>
								{t("pricing.loginToActivate")}
							</Link>
						) : hasPlusAccess ? (
							<Link
								href="/shop"
								className="mt-5 block rounded border border-slate-200 bg-white px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
							>
								{t("pricing.browseMemberDeals")}
							</Link>
						) : (
							<button
								type="button"
								disabled={upgrading}
								onClick={() =>
									toast.promise(activateMembership(), {
										loading: t("pricing.activating"),
										success: t("pricing.activated"),
										error: (error) => error.message,
									})
								}
								className="mt-5 w-full rounded bg-[#1A1A1A] px-5 py-3 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{t("pricing.activate")}
							</button>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
}
