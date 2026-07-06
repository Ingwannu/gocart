"use client";
import {
	ArrowDownRight,
	BotIcon,
	CheckCircle2Icon,
	Code2Icon,
	Globe2Icon,
	PackageCheckIcon,
	PlugZapIcon,
	ShieldCheckIcon,
	TerminalIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useRef } from "react";
import CategoriesMarquee from "./CategoriesMarquee";
import { useTranslation } from "@/lib/i18n/LanguageContext";

// Hero ported from the saas template: parallax background, blur-in staggered
// headline with an italic serif accent word, arrow CTA, and a masked preview
// panel (the shop's always-dark console mock stands in for the dashboard
// screenshot).
const ease = [0.23, 1, 0.32, 1];

const fadeInUp = {
	hidden: { opacity: 0, y: 20, filter: "blur(8px)" },
	visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

const fadeInScale = {
	hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
	visible: { opacity: 1, scale: 1, filter: "blur(0px)" },
};

const PARALLAX_INTENSITY = 20;

const Hero = () => {
	const { t } = useTranslation();
	const sectionRef = useRef(null);

	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);
	const springConfig = { damping: 25, stiffness: 150 };
	const x = useSpring(mouseX, springConfig);
	const y = useSpring(mouseY, springConfig);

	const handleMouseMove = (e) => {
		if (!sectionRef.current || window.innerWidth < 850) return;
		const rect = sectionRef.current.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		mouseX.set(((e.clientX - centerX) / (rect.width / 2)) * PARALLAX_INTENSITY);
		mouseY.set(((e.clientY - centerY) / (rect.height / 2)) * PARALLAX_INTENSITY);
	};

	const handleMouseLeave = () => {
		mouseX.set(0);
		mouseY.set(0);
	};

	const trustItems = [
		t("hero.privateDelivery"),
		t("hero.sourceIncluded"),
		t("hero.sellerSupport"),
	];

	const assetTypes = [
		{
			icon: PlugZapIcon,
			title: t("hero.pluginCardTitle"),
			description: t("hero.pluginCardDesc"),
		},
		{
			icon: Globe2Icon,
			title: t("hero.websiteCardTitle"),
			description: t("hero.websiteCardDesc"),
		},
		{
			icon: BotIcon,
			title: t("hero.botCardTitle"),
			description: t("hero.botCardDesc"),
		},
	];

	const infoCards = [
		{
			icon: PackageCheckIcon,
			iconClass: "text-accent",
			title: t("hero.bestProducts"),
			description: t("hero.bestProductsDesc"),
		},
		{
			icon: Code2Icon,
			iconClass: "text-green-300",
			title: t("hero.discounts"),
			description: t("hero.discountsDesc"),
		},
		{
			icon: ShieldCheckIcon,
			iconClass: "text-sky-300",
			title: t("hero.secureDelivery"),
			description: t("hero.secureDeliveryDesc"),
		},
	];

	return (
		<section
			ref={sectionRef}
			className="relative flex flex-col overflow-hidden"
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			{/* Parallax background wash */}
			<motion.div
				className="absolute inset-0 -z-10 rounded-b-4xl min-[850px]:inset-2.5 min-[850px]:scale-105"
				style={{
					backgroundImage:
						"radial-gradient(60% 55% at 50% 0%, var(--accent-soft) 0%, transparent 75%), radial-gradient(35% 35% at 82% 18%, color-mix(in srgb, var(--accent) 22%, transparent) 0%, transparent 70%), radial-gradient(30% 30% at 15% 30%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 70%)",
					x,
					y,
				}}
				aria-hidden="true"
			/>

			<div className="flex items-start justify-center px-6 pt-24 max-[850px]:pt-12">
				<motion.div
					className="flex max-w-4xl flex-col items-center text-center max-[850px]:w-full max-[850px]:items-start max-[850px]:text-left"
					initial="hidden"
					animate="visible"
					transition={{ staggerChildren: 0.15, delayChildren: 0.2 }}
				>
					<motion.div
						className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-border bg-frame py-1.5 pl-4 pr-3 text-sm font-medium text-foreground"
						variants={fadeInUp}
						transition={{ duration: 0.8, ease }}
					>
						{t("hero.newsText")}
						<span className="text-accent">✦</span>
					</motion.div>

					<h1 className="mb-6 text-7xl font-medium leading-[1.1] tracking-tight text-foreground max-[850px]:text-4xl">
						<motion.span
							className="block"
							variants={fadeInUp}
							transition={{ duration: 0.8, ease }}
						>
							{t("hero.line1")}
						</motion.span>
						<motion.span
							className="block"
							variants={fadeInUp}
							transition={{ duration: 0.8, ease }}
						>
							{t("hero.line2")}{" "}
							<span className="font-serif italic text-accent">
								{t("hero.accentWord")}
							</span>
						</motion.span>
					</h1>

					<motion.p
						className="mb-8 max-w-2xl text-lg text-muted-foreground"
						variants={fadeInUp}
						transition={{ duration: 0.8, ease }}
					>
						{t("hero.subheadline")}
					</motion.p>

					<motion.div
						className="flex items-center gap-5 max-[850px]:w-full max-[850px]:flex-col max-[850px]:items-stretch"
						variants={fadeInScale}
						transition={{ duration: 0.8, ease }}
					>
						<Link href="/shop" className="group relative inline-flex items-center max-[850px]:w-full">
							<span className="absolute inset-y-0 right-0 w-[calc(100%-2rem)] rounded-xl bg-accent max-[850px]:w-full" />
							<span className="relative z-10 rounded-xl bg-foreground px-6 py-3 font-medium text-background max-[850px]:flex-1">
								{t("hero.primaryCta")}
							</span>
							<span className="relative -left-px z-10 flex h-11 w-11 items-center justify-center rounded-xl text-accent-foreground">
								<ArrowDownRight className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45" />
							</span>
						</Link>
						<Link
							href="/stores"
							className="rounded-xl px-4 py-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground max-[850px]:text-center"
						>
							{t("hero.secondaryCta")}
						</Link>
					</motion.div>

					<motion.div
						className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground max-[850px]:justify-start"
						variants={fadeInUp}
						transition={{ duration: 0.8, ease }}
					>
						{trustItems.map((item) => (
							<span key={item} className="inline-flex items-center gap-1.5">
								<CheckCircle2Icon size={15} className="text-success" />
								{item}
							</span>
						))}
					</motion.div>
				</motion.div>
			</div>

			{/* Masked preview panel (stands in for the saas dashboard screenshot) */}
			<motion.div
				className="relative mt-20 px-6 max-[850px]:mt-10"
				initial={{ opacity: 0, y: 40 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 1, delay: 0.6, ease }}
			>
				<div className="relative mx-auto max-w-5xl">
					<div className="relative overflow-hidden rounded-2xl border border-border shadow-2xl/5 mask-[linear-gradient(to_bottom,black_55%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_55%,transparent_100%)]">
						<div className="bg-slate-950 p-6 text-white sm:p-8">
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
										<span className="text-accent">include</span>{" "}
										{t("hero.consoleLineTwo")}
									</p>
									<p>
										<span className="text-green-400">ready</span>{" "}
										{t("hero.consoleLineThree")}
									</p>
								</div>
								<div className="mt-4 grid gap-3 sm:grid-cols-3">
									{assetTypes.map((item) => (
										<div
											key={item.title}
											className="rounded-md border border-white/10 bg-white/5 p-4"
										>
											<item.icon size={22} className="text-accent" />
											<p className="mt-3 text-sm font-semibold">{item.title}</p>
											<p className="mt-1 text-xs leading-5 opacity-80">
												{item.description}
											</p>
										</div>
									))}
								</div>
							</div>
							<div className="mt-4 grid gap-3 sm:grid-cols-3">
								{infoCards.map((item) => (
									<div
										key={item.title}
										className="rounded-md border border-white/10 bg-white/5 p-4"
									>
										<item.icon size={18} className={item.iconClass} />
										<p className="mt-2 text-sm font-medium">{item.title}</p>
										<p className="mt-1 text-xs text-slate-400">
											{item.description}
										</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</motion.div>

			<motion.div
				className="pb-6 pt-10"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.8, delay: 1, ease }}
			>
				<CategoriesMarquee />
			</motion.div>
		</section>
	);
};

export default Hero;
