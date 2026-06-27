"use client";
import {
	ArrowRightIcon,
	BotIcon,
	CheckCircle2Icon,
	Code2Icon,
	DownloadCloudIcon,
	Globe2Icon,
	PackageCheckIcon,
	PlugZapIcon,
	ServerIcon,
	ShieldCheckIcon,
	TerminalIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import CategoriesMarquee from "./CategoriesMarquee";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const Hero = () => {
	const { t } = useTranslation();
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const startingPrice = `${currency}4.90`;

	const assetTypes = [
		{
			icon: PlugZapIcon,
			title: t("hero.pluginCardTitle"),
			description: t("hero.pluginCardDesc"),
			className: "border-green-200 bg-green-50 text-green-700",
		},
		{
			icon: Globe2Icon,
			title: t("hero.websiteCardTitle"),
			description: t("hero.websiteCardDesc"),
			className: "border-orange-200 bg-orange-50 text-orange-700",
		},
		{
			icon: BotIcon,
			title: t("hero.botCardTitle"),
			description: t("hero.botCardDesc"),
			className: "border-slate-700 bg-slate-900 text-white",
		},
	];

	const trustItems = [
		t("hero.privateDelivery"),
		t("hero.sourceIncluded"),
		t("hero.sellerSupport"),
	];

	return (
		<section className="mx-6">
			<div className="max-w-7xl mx-auto my-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
				<div className="grid xl:grid-cols-[1.04fr_0.96fr]">
					<div className="relative p-6 sm:p-10 lg:p-14">
						<div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,rgba(34,197,94,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
						<div className="relative">
							<div className="mb-6 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
								<span className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-700">
									<ServerIcon size={15} />
									{t("hero.newsText")}
								</span>
								<span className="inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700">
									<DownloadCloudIcon size={15} />
									{t("hero.startsFrom", { price: startingPrice })}
								</span>
							</div>
							<h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-slate-950 sm:text-5xl lg:text-6xl">
								{t("hero.headline")}
							</h1>
							<p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
								{t("hero.subheadline")}
							</p>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Link
									href="/shop"
									className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-green-700"
								>
									{t("hero.primaryCta")}
									<ArrowRightIcon size={17} />
								</Link>
								<Link
									href="/stores"
									className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-800 transition hover:border-orange-300 hover:text-orange-700"
								>
									{t("hero.secondaryCta")}
								</Link>
							</div>
							<div className="mt-9 grid gap-3 sm:grid-cols-3">
								{trustItems.map((item) => (
									<div
										key={item}
										className="flex items-start gap-2 rounded-md border border-slate-200 bg-white/85 p-3 text-sm text-slate-700 shadow-sm"
									>
										<CheckCircle2Icon
											size={16}
											className="mt-0.5 shrink-0 text-green-600"
										/>
										<span>{item}</span>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="border-t border-slate-200 bg-slate-950 p-5 text-white sm:p-8 xl:border-l xl:border-t-0">
						<div className="rounded-lg border border-white/10 bg-[#07120D] p-4 shadow-2xl shadow-black/30">
							<div className="flex items-center justify-between border-b border-white/10 pb-4">
								<div className="flex items-center gap-2 text-sm font-medium">
									<TerminalIcon size={17} className="text-green-400" />
									{t("hero.consoleTitle")}
								</div>
								<span className="rounded-md bg-green-500/15 px-2 py-1 text-xs text-green-300">
									{t("hero.consoleStatus")}
								</span>
							</div>
							<div className="mt-4 rounded-md bg-black/40 p-4 font-mono text-xs leading-6 text-slate-300">
								<p>
									<span className="text-green-400">$</span>{" "}
									{t("hero.consoleLineOne")}
								</p>
								<p>
									<span className="text-orange-300">include</span>{" "}
									{t("hero.consoleLineTwo")}
								</p>
								<p>
									<span className="text-green-400">ready</span>{" "}
									{t("hero.consoleLineThree")}
								</p>
							</div>
							<div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
								{assetTypes.map((item) => (
									<div
										key={item.title}
										className={`rounded-md border p-4 ${item.className}`}
									>
										<item.icon size={22} />
										<p className="mt-3 text-sm font-semibold">{item.title}</p>
										<p className="mt-1 text-xs leading-5 opacity-80">
											{item.description}
										</p>
									</div>
								))}
							</div>
						</div>
						<div className="mt-4 grid gap-3 sm:grid-cols-3">
							<div className="rounded-md border border-white/10 bg-white/5 p-4">
								<PackageCheckIcon size={18} className="text-orange-300" />
								<p className="mt-2 text-sm font-medium">
									{t("hero.bestProducts")}
								</p>
								<p className="mt-1 text-xs text-slate-400">
									{t("hero.bestProductsDesc")}
								</p>
							</div>
							<div className="rounded-md border border-white/10 bg-white/5 p-4">
								<Code2Icon size={18} className="text-green-300" />
								<p className="mt-2 text-sm font-medium">
									{t("hero.discounts")}
								</p>
								<p className="mt-1 text-xs text-slate-400">
									{t("hero.discountsDesc")}
								</p>
							</div>
							<div className="rounded-md border border-white/10 bg-white/5 p-4">
								<ShieldCheckIcon size={18} className="text-sky-300" />
								<p className="mt-2 text-sm font-medium">
									{t("hero.secureDelivery")}
								</p>
								<p className="mt-1 text-xs text-slate-400">
									{t("hero.secureDeliveryDesc")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
			<CategoriesMarquee />
		</section>
	);
};

export default Hero;
