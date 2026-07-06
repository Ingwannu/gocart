"use client";
import {
	ArrowDownRight,
	Heart,
	LayoutDashboard,
	Search,
	ShoppingCart,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { buildShopHref } from "@/lib/product-list.mjs";
import LanguageToggle from "./LanguageToggle";
import AnimatedThemeToggler from "./ui/AnimatedThemeToggler";

// Floating pill header ported from the saas template (header.tsx): fixed,
// centered, bg-frame with rounded-b-4xl, corner cutouts, and the signature
// accent arrow CTA. All shop functionality (search suggestions, cart badge,
// auth) is preserved.
const ease = [0.23, 1, 0.32, 1];

function HamburgerIcon({ isOpen }) {
	return (
		<div className="relative flex h-4 w-8 cursor-pointer flex-col justify-between">
			<motion.span
				className="block h-0.5 w-full origin-center rounded-full bg-foreground"
				animate={isOpen ? { rotate: 45, y: 4.5 } : { rotate: 0, y: 0 }}
				transition={{ duration: 0.25, ease }}
			/>
			<motion.span
				className="block h-0.5 w-full origin-center rounded-full bg-foreground"
				animate={isOpen ? { rotate: -45, y: -9.5 } : { rotate: 0, y: 0 }}
				transition={{ duration: 0.25, ease }}
			/>
		</div>
	);
}

function CornerSVG({ className }) {
	return (
		<svg
			className={className}
			width="50"
			height="50"
			viewBox="0 0 50 50"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z"
				fill="currentColor"
			/>
		</svg>
	);
}

// The saas signature CTA: dark pill + accent tab with an arrow that rotates
// to point up-right on hover.
function ArrowCta({ label, onClick, href, className = "" }) {
	const inner = (
		<>
			<span className="absolute inset-y-0 right-0 w-[calc(100%-1.5rem)] rounded-xl bg-accent" />
			<span className="relative z-10 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background">
				{label}
			</span>
			<span className="relative -left-px z-10 flex h-10 w-10 items-center justify-center rounded-xl text-accent-foreground">
				<ArrowDownRight className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45" />
			</span>
		</>
	);
	const classes = `group relative inline-flex cursor-pointer items-center ${className}`;
	if (href) {
		return (
			<Link href={href} className={classes} onClick={onClick}>
				{inner}
			</Link>
		);
	}
	return (
		<button type="button" className={classes} onClick={onClick}>
			{inner}
		</button>
	);
}

function Wordmark({ className = "" }) {
	return (
		<Link href="/" className={`relative shrink-0 text-2xl font-semibold ${className}`}>
			<span className="text-foreground">wicked</span>{" "}
			<span className="text-success">shop</span>
			<span className="text-3xl leading-0 text-accent">.</span>
		</Link>
	);
}

const Navbar = () => {
	const router = useRouter();
	const { data: session } = useSession();
	const { t } = useTranslation();

	const [search, setSearch] = useState("");
	const [searchOpen, setSearchOpen] = useState(false);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [suggestions, setSuggestions] = useState({
		products: [],
		groups: [],
		categories: [],
		stores: [],
	});
	const [showSuggestions, setShowSuggestions] = useState(false);
	const cartCount = useSelector((state) => state.cart.total);
	const hasSuggestions = useMemo(
		() =>
			suggestions.products.length ||
			suggestions.groups.length ||
			suggestions.categories.length ||
			suggestions.stores.length,
		[suggestions],
	);

	useEffect(() => {
		const query = search.trim();
		if (query.length < 2) {
			setSuggestions({ products: [], groups: [], categories: [], stores: [] });
			return;
		}

		const controller = new AbortController();
		const timer = setTimeout(() => {
			fetchJson(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
				signal: controller.signal,
			})
				.then((data) =>
					setSuggestions({
						products: data.products || [],
						groups: data.groups || [],
						categories: data.categories || [],
						stores: data.stores || [],
					}),
				)
				.catch(() => {
					if (!controller.signal.aborted) {
						setSuggestions({
							products: [],
							groups: [],
							categories: [],
							stores: [],
						});
					}
				});
		}, 180);

		return () => {
			controller.abort();
			clearTimeout(timer);
		};
	}, [search]);

	const handleSearch = (e) => {
		e.preventDefault();
		setShowSuggestions(false);
		setSearchOpen(false);
		setMobileMenuOpen(false);
		router.push(buildShopHref({ search }));
	};

	const closeAll = () => {
		setSearchOpen(false);
		setMobileMenuOpen(false);
		setShowSuggestions(false);
	};

	const navLinks = [
		{ href: "/", label: t("common.home") },
		{ href: "/shop", label: t("common.shop") },
		{ href: "/stores", label: t("common.stores") },
		{ href: "/about", label: t("common.about") },
		{ href: "/contact", label: t("common.contact") },
	];

	// Admins and sellers get a direct entry to their dashboard.
	const role = session?.user?.role;
	const dashboardHref = role === "admin" ? "/admin" : role === "seller" ? "/store" : null;
	const dashboardLabel =
		role === "admin" ? t("common.adminPanel") : t("common.sellerPanel");

	const suggestionSections = [
		{ title: t("search.products"), items: suggestions.products },
		{ title: t("search.categories"), items: suggestions.categories },
		{ title: t("search.groups"), items: suggestions.groups },
		{ title: t("search.stores"), items: suggestions.stores },
	];

	const renderSearchForm = () => (
		<form
			onSubmit={handleSearch}
			onFocus={() => setShowSuggestions(true)}
			className="relative flex items-center gap-2 rounded-full bg-muted px-4 py-3 text-sm"
		>
			<Search size={18} className="shrink-0 text-muted-foreground" />
			<input
				className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
				type="search"
				placeholder={t("nav.searchPlaceholder")}
				value={search}
				onChange={(e) => {
					setSearch(e.target.value);
					setShowSuggestions(true);
				}}
				required
			/>
			{showSuggestions && search.trim().length >= 2 && (
				<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-border bg-frame p-3 shadow-lg">
					{hasSuggestions ? (
						<div className="space-y-3">
							{suggestionSections.map(
								(section) =>
									section.items.length > 0 && (
										<div key={section.title}>
											<p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
												{section.title}
											</p>
											<div className="space-y-1">
												{section.items.slice(0, 4).map((item) => (
													<Link
														key={`${section.title}-${item.href}`}
														href={item.href}
														onClick={closeAll}
														className="block rounded-xl px-2 py-1.5 text-foreground hover:bg-muted"
													>
														<span className="block truncate">{item.name}</span>
														{item.category && (
															<span className="block truncate text-xs text-muted-foreground">
																{item.category}
															</span>
														)}
													</Link>
												))}
											</div>
										</div>
									),
							)}
						</div>
					) : (
						<p className="px-2 py-1 text-sm text-muted-foreground">
							{t("search.noSuggestions")}
						</p>
					)}
				</div>
			)}
		</form>
	);

	return (
		<motion.header
			initial={{ y: -100 }}
			animate={{ y: 0 }}
			transition={{ duration: 0.5, ease }}
			className="fixed top-2.5 left-1/2 z-40 w-full max-w-6xl -translate-x-1/2 rounded-b-4xl bg-frame shadow-2xl/20 max-[1200px]:max-w-3xl max-[850px]:top-0 max-[850px]:left-0 max-[850px]:right-0 max-[850px]:w-full max-[850px]:max-w-none max-[850px]:translate-x-0 max-[850px]:overflow-hidden max-[850px]:rounded-none max-[850px]:rounded-b-3xl"
		>
			<div className="flex h-20 items-center justify-between px-4 max-[850px]:h-16 max-[850px]:px-5">
				<Wordmark className="ml-4 max-[850px]:ml-0" />

				{/* Desktop nav pills */}
				<nav className="flex items-center gap-1 max-[1200px]:gap-0 max-[1000px]:hidden">
					{navLinks.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground max-[1200px]:px-3"
						>
							{link.label}
						</Link>
					))}
				</nav>

				{/* Desktop actions */}
				<div className="flex items-center gap-1.5 max-[850px]:hidden">
					<button
						type="button"
						onClick={() => {
							setSearchOpen(!searchOpen);
							setShowSuggestions(false);
						}}
						aria-label={t("nav.searchPlaceholder")}
						aria-expanded={searchOpen}
						className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
					>
						<Search size={18} />
					</button>
					<Link
						href="/wishlist"
						aria-label={t("common.wishlist")}
						className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
					>
						<Heart size={18} />
					</Link>
					<Link
						href="/cart"
						aria-label={t("common.cart")}
						className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
					>
						<ShoppingCart size={18} />
						{cartCount > 0 && (
							<span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-semibold text-accent-foreground">
								{cartCount}
							</span>
						)}
					</Link>
					{session && (
						<Link
							href="/account"
							aria-label={t("common.account")}
							className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
						>
							<UserRound size={18} />
						</Link>
					)}
					<LanguageToggle />
					<AnimatedThemeToggler className="h-9 w-9 rounded-full border-0 bg-transparent hover:bg-foreground/5" />
					{dashboardHref && (
						<Link
							href={dashboardHref}
							className="ml-1 flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
						>
							<LayoutDashboard size={15} />
							{dashboardLabel}
						</Link>
					)}
					<div className="ml-2">
						{session ? (
							<ArrowCta label={t("common.logout")} onClick={() => signOut()} />
						) : (
							<ArrowCta label={t("common.login")} onClick={() => signIn()} />
						)}
					</div>
				</div>

				{/* Mobile actions */}
				<div className="hidden items-center gap-2 max-[850px]:flex">
					<Link
						href="/cart"
						aria-label={t("common.cart")}
						className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/80"
					>
						<ShoppingCart size={18} />
						{cartCount > 0 && (
							<span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-accent text-[9px] font-semibold text-accent-foreground">
								{cartCount}
							</span>
						)}
					</Link>
					<button
						type="button"
						className="flex h-10 w-10 items-center justify-center"
						onClick={() => {
							setMobileMenuOpen(!mobileMenuOpen);
							setSearchOpen(false);
						}}
						aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
						aria-expanded={mobileMenuOpen}
					>
						<HamburgerIcon isOpen={mobileMenuOpen} />
					</button>
				</div>
			</div>

			{/* Desktop search panel */}
			<AnimatePresence>
				{searchOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.25, ease }}
						className="overflow-visible max-[850px]:hidden"
					>
						<div className="px-8 pb-5">{renderSearchForm()}</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Mobile menu */}
			<AnimatePresence>
				{mobileMenuOpen && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease }}
						className="hidden overflow-hidden max-[850px]:block"
					>
						<div className="px-6 pb-6">
							<div className="pb-4">{renderSearchForm()}</div>
							<nav>
								{navLinks.map((link) => (
									<Link
										key={link.href}
										href={link.href}
										onClick={closeAll}
										className="flex items-center justify-between border-b border-foreground/10 py-4 text-base font-medium text-foreground"
									>
										{link.label}
									</Link>
								))}
								<Link
									href="/wishlist"
									onClick={closeAll}
									className="flex items-center justify-between border-b border-foreground/10 py-4 text-base font-medium text-foreground"
								>
									{t("common.wishlist")}
								</Link>
								{session && (
									<Link
										href="/account"
										onClick={closeAll}
										className="flex items-center justify-between border-b border-foreground/10 py-4 text-base font-medium text-foreground"
									>
										{t("common.account")}
									</Link>
								)}
								{dashboardHref && (
									<Link
										href={dashboardHref}
										onClick={closeAll}
										className="flex items-center justify-between border-b border-foreground/10 py-4 text-base font-medium text-foreground"
									>
										<span className="flex items-center gap-2">
											<LayoutDashboard size={17} />
											{dashboardLabel}
										</span>
									</Link>
								)}
							</nav>
							<div className="flex items-center justify-between pb-2 pt-6">
								<div className="flex items-center gap-2">
									<LanguageToggle />
									<AnimatedThemeToggler className="h-9 w-9 rounded-full border-0 bg-transparent" />
								</div>
								{session ? (
									<ArrowCta
										label={t("common.logout")}
										onClick={() => {
											closeAll();
											signOut();
										}}
									/>
								) : (
									<ArrowCta
										label={t("common.login")}
										onClick={() => {
											closeAll();
											signIn();
										}}
									/>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<CornerSVG className="pointer-events-none absolute top-0 -left-12.25 rotate-180 text-frame max-[850px]:hidden" />
			<CornerSVG className="pointer-events-none absolute top-0 -right-12.25 rotate-90 text-frame max-[850px]:hidden" />
		</motion.header>
	);
};

export default Navbar;
