"use client";
import { Heart, Search, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useSession, signIn, signOut } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";
import { buildShopHref } from "@/lib/product-list.mjs";
import LanguageToggle from "./LanguageToggle";

const Navbar = () => {
	const router = useRouter();
	const { data: session } = useSession();
	const { t } = useTranslation();

	const [search, setSearch] = useState("");
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
		router.push(buildShopHref({ search }));
	};

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
			className="relative flex items-center text-sm gap-2 bg-[#F5F0E8] px-4 py-3 rounded-full"
		>
			<Search size={18} className="text-slate-600 shrink-0" />
			<input
				className="w-full bg-transparent outline-none placeholder-slate-600"
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
				<div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
					{hasSuggestions ? (
						<div className="space-y-3">
							{suggestionSections.map(
								(section) =>
									section.items.length > 0 && (
										<div key={section.title}>
											<p className="mb-1 text-xs font-medium uppercase text-slate-400">
												{section.title}
											</p>
											<div className="space-y-1">
												{section.items.slice(0, 4).map((item) => (
													<Link
														key={`${section.title}-${item.href}`}
														href={item.href}
														onClick={() => setShowSuggestions(false)}
														className="block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-50"
													>
														<span className="block truncate">{item.name}</span>
														{item.category && (
															<span className="block truncate text-xs text-slate-400">
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
						<p className="px-2 py-1 text-sm text-slate-400">
							{t("search.noSuggestions")}
						</p>
					)}
				</div>
			)}
		</form>
	);

	return (
		<nav className="relative bg-white">
			<div className="mx-6">
				<div className="flex items-center justify-between max-w-7xl mx-auto py-4 transition-all">
					<Link
						href="/"
						className="relative text-4xl font-semibold text-slate-700"
					>
						<span className="text-orange-500">wicked</span>{" "}
						<span className="text-green-600">shop</span>
						<span className="text-orange-500 text-5xl leading-0">.</span>
					</Link>

					{/* Desktop Menu */}
					<div className="hidden sm:flex items-center gap-3 text-slate-600 whitespace-nowrap lg:gap-5 xl:gap-6">
						<Link href="/" className="shrink-0">
							{t("common.home")}
						</Link>
						<Link href="/shop" className="shrink-0">
							{t("common.shop")}
						</Link>
						<Link href="/stores" className="shrink-0">
							{t("common.stores")}
						</Link>
						<Link
							href="/wishlist"
							className="flex shrink-0 items-center gap-2 text-slate-600"
						>
							<Heart size={18} />
							{t("common.wishlist")}
						</Link>
						<Link href="/about" className="shrink-0">
							{t("common.about")}
						</Link>
						<Link href="/contact" className="shrink-0">
							{t("common.contact")}
						</Link>

						<div className="hidden w-64 shrink-0 lg:block xl:w-72">
							{renderSearchForm()}
						</div>

						<Link
							href="/cart"
							className="relative flex shrink-0 items-center gap-2 text-slate-600"
						>
							<ShoppingCart size={18} />
							{t("common.cart")}
							<button className="absolute -top-1 left-3 text-[8px] text-white bg-orange-500 size-3.5 rounded-full">
								{cartCount}
							</button>
						</Link>

						<LanguageToggle />

						{session ? (
							<>
								<Link
									href="/account"
									className="flex shrink-0 items-center gap-2 text-slate-600"
								>
									<UserRound size={18} />
									{t("common.account")}
								</Link>
								<button
									onClick={() => signOut()}
									className="min-w-[72px] shrink-0 whitespace-nowrap rounded-full bg-[#1A1A1A] px-6 py-2 text-white transition hover:bg-orange-600"
								>
									{t("common.logout")}
								</button>
							</>
						) : (
							<button
								onClick={() => signIn()}
								className="min-w-[72px] shrink-0 whitespace-nowrap rounded-full bg-[#1A1A1A] px-6 py-2 text-white transition hover:bg-orange-600"
							>
								{t("common.login")}
							</button>
						)}
					</div>

					{/* Mobile User Button */}
					<div className="sm:hidden flex items-center gap-2">
						<LanguageToggle />
						{session ? (
							<>
								<Link
									href="/account"
									className="rounded-full border border-slate-200 p-2 text-slate-600"
									aria-label={t("common.account")}
								>
									<UserRound size={16} />
								</Link>
								<Link
									href="/wishlist"
									className="rounded-full border border-slate-200 p-2 text-slate-600"
									aria-label={t("common.wishlist")}
								>
									<Heart size={16} />
								</Link>
								<button
									onClick={() => signOut()}
									className="min-w-[72px] shrink-0 whitespace-nowrap rounded-full bg-[#1A1A1A] px-5 py-1.5 text-sm text-white transition hover:bg-orange-600"
								>
									{t("common.logout")}
								</button>
							</>
						) : (
							<button
								onClick={() => signIn()}
								className="min-w-[72px] shrink-0 whitespace-nowrap rounded-full bg-[#1A1A1A] px-5 py-1.5 text-sm text-white transition hover:bg-orange-600"
							>
								{t("common.login")}
							</button>
						)}
					</div>
				</div>
			</div>
			<div className="mx-6 pb-3 lg:hidden">
				<div className="max-w-7xl mx-auto">{renderSearchForm()}</div>
			</div>
			<hr className="border-gray-300" />
		</nav>
	);
};

export default Navbar;
