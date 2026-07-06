import { categories } from "@/assets/assets";
import { buildShopHref } from "@/lib/product-list.mjs";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Link from "next/link";

function toCategoryKey(category) {
	return category
		.replace(/[^a-zA-Z0-9]+(.)/g, (_, character) => character.toUpperCase())
		.replace(/^[A-Z]/, (character) => character.toLowerCase());
}

const CategoriesMarquee = () => {
	const { t } = useTranslation();

	const translatedCategories = categories.map((cat) => {
		const key = toCategoryKey(cat);
		return t(`categories.${key}`) !== `categories.${key}`
			? t(`categories.${key}`)
			: cat;
	});

	return (
		<div className="overflow-hidden w-full relative max-w-7xl mx-auto select-none group sm:my-20">
			<div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
			<div className="flex min-w-[200%] animate-[marqueeScroll_10s_linear_infinite] sm:animate-[marqueeScroll_40s_linear_infinite] group-hover:[animation-play-state:paused] gap-4">
				{[
					...categories,
					...categories,
					...categories,
					...categories,
				].map((category, index) => (
					<Link
						key={index}
						href={buildShopHref({ category })}
						className="shrink-0 whitespace-nowrap rounded-md border border-border bg-muted px-5 py-2 text-xs text-muted-foreground transition-all duration-300 hover:bg-foreground hover:text-background active:scale-95 sm:text-sm"
					>
						{translatedCategories[index % translatedCategories.length]}
					</Link>
				))}
			</div>
			<div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />
		</div>
	);
};

export default CategoriesMarquee;
