"use client";
import {
	ArrowRightIcon,
	BotIcon,
	Code2Icon,
	Globe2Icon,
	PackageCheckIcon,
	PlugZapIcon,
	ServerIcon,
} from "lucide-react";
import Link from "next/link";
import { buildShopHref } from "@/lib/product-list.mjs";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const iconMap = {
	bot: BotIcon,
	code: Code2Icon,
	plugin: PlugZapIcon,
	server: ServerIcon,
	website: Globe2Icon,
	pack: PackageCheckIcon,
};

const cardSets = {
	latest: [
		{
			icon: "plugin",
			category: "Minecraft Plugins",
			titleKey: "homeAssets.pluginStackTitle",
			descriptionKey: "homeAssets.pluginStackDesc",
			metaKey: "homeAssets.paperReady",
			accent: "border-green-200 bg-green-50 text-green-700",
		},
		{
			icon: "website",
			category: "Websites",
			titleKey: "homeAssets.websiteSourceTitle",
			descriptionKey: "homeAssets.websiteSourceDesc",
			metaKey: "homeAssets.nextReady",
			accent: "border-orange-200 bg-orange-50 text-orange-700",
		},
		{
			icon: "bot",
			category: "Discord Bots",
			titleKey: "homeAssets.discordBotTitle",
			descriptionKey: "homeAssets.discordBotDesc",
			metaKey: "homeAssets.nodeReady",
			accent: "border-slate-200 bg-slate-50 text-slate-700",
		},
		{
			icon: "server",
			category: "Server Packs",
			titleKey: "homeAssets.serverPackTitle",
			descriptionKey: "homeAssets.serverPackDesc",
			metaKey: "homeAssets.configIncluded",
			accent: "border-sky-200 bg-sky-50 text-sky-700",
		},
	],
	featured: [
		{
			icon: "pack",
			category: "Server Packs",
			titleKey: "homeAssets.survivalBundleTitle",
			descriptionKey: "homeAssets.survivalBundleDesc",
			metaKey: "homeAssets.fullBundle",
			accent: "border-green-200 bg-green-50 text-green-700",
		},
		{
			icon: "code",
			category: "Source Code",
			titleKey: "homeAssets.sourceCodeTitle",
			descriptionKey: "homeAssets.sourceCodeDesc",
			metaKey: "homeAssets.zipDelivery",
			accent: "border-slate-200 bg-slate-50 text-slate-700",
		},
		{
			icon: "plugin",
			category: "Minecraft Plugins",
			titleKey: "homeAssets.cratesMenuTitle",
			descriptionKey: "homeAssets.cratesMenuDesc",
			metaKey: "homeAssets.configurable",
			accent: "border-orange-200 bg-orange-50 text-orange-700",
		},
		{
			icon: "website",
			category: "Websites",
			titleKey: "homeAssets.storefrontTitle",
			descriptionKey: "homeAssets.storefrontDesc",
			metaKey: "homeAssets.deployable",
			accent: "border-sky-200 bg-sky-50 text-sky-700",
		},
	],
};

export default function HomeAssetGrid({ variant = "latest" }) {
	const { t } = useTranslation();
	const cards = cardSets[variant] || cardSets.latest;

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{cards.map((card) => {
				const Icon = iconMap[card.icon];
				return (
					<Link
						key={card.titleKey}
						href={buildShopHref({ category: card.category })}
						className="group flex min-h-56 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md"
					>
						<div>
							<div
								className={`inline-flex size-11 items-center justify-center rounded-md border ${card.accent}`}
							>
								<Icon size={22} />
							</div>
							<p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
								{card.category}
							</p>
							<h3 className="mt-2 text-lg font-semibold leading-snug text-slate-900">
								{t(card.titleKey)}
							</h3>
							<p className="mt-3 text-sm leading-6 text-slate-600">
								{t(card.descriptionKey)}
							</p>
						</div>
						<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
							<span className="font-medium text-slate-700">
								{t(card.metaKey)}
							</span>
							<ArrowRightIcon
								size={17}
								className="text-orange-500 transition group-hover:translate-x-1"
							/>
						</div>
					</Link>
				);
			})}
		</div>
	);
}
