"use client";
import Title from "./Title";
import ProductCard from "./ProductCard";
import HomeAssetGrid from "./HomeAssetGrid";
import { useSelector } from "react-redux";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const BestSelling = () => {
	const { t } = useTranslation();
	const displayQuantity = 8;
	const products = useSelector((state) => state.product.list);
	const hasProducts = products.length > 0;

	return (
		<div className="px-6 my-30 max-w-6xl mx-auto">
			<Title
				title={t("sections.bestSelling")}
				description={
					hasProducts
						? t("descriptions.showingOf", {
								current: Math.min(products.length, displayQuantity),
								total: products.length,
							})
						: t("descriptions.featuredAssetsEmpty")
				}
				href="/shop"
			/>
			<div className="mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12">
				{hasProducts ? (
					products
						.slice()
						.sort(
							(a, b) =>
								Number(Boolean(b.isFeatured)) -
									Number(Boolean(a.isFeatured)) ||
								(b.rating || []).length - (a.rating || []).length,
						)
						.slice(0, displayQuantity)
						.map((product, index) => (
							<ProductCard key={index} product={product} />
						))
				) : (
					<div className="col-span-2 w-full sm:block">
						<HomeAssetGrid variant="featured" />
					</div>
				)}
			</div>
		</div>
	);
};

export default BestSelling;
