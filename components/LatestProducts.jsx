"use client";
import Title from "./Title";
import ProductCard from "./ProductCard";
import HomeAssetGrid from "./HomeAssetGrid";
import { useSelector } from "react-redux";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const LatestProducts = () => {
	const { t } = useTranslation();
	const displayQuantity = 4;
	const products = useSelector((state) => state.product.list);
	const hasProducts = products.length > 0;

	return (
		<div className="px-6 my-30 max-w-6xl mx-auto">
			<Title
				title={t("sections.latestProducts")}
				description={
					hasProducts
						? t("descriptions.showingOf", {
								current: Math.min(products.length, displayQuantity),
								total: products.length,
							})
						: t("descriptions.latestAssetsEmpty")
				}
				href="/shop"
			/>
			<div className="mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between">
				{hasProducts ? (
					products
						.slice()
						.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
						.slice(0, displayQuantity)
						.map((product, index) => (
							<ProductCard key={index} product={product} />
						))
				) : (
					<div className="col-span-2 w-full sm:block">
						<HomeAssetGrid variant="latest" />
					</div>
				)}
			</div>
		</div>
	);
};

export default LatestProducts;
