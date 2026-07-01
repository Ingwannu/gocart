"use client";
import { Code2Icon, DownloadCloudIcon, StarIcon, StoreIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useCurrencySymbol } from "@/components/PublicSettingsProvider";
import { resolveProductImageSrc } from "@/lib/product-image.mjs";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const ProductCard = ({ product }) => {
	const { t } = useTranslation();
	const currency = useCurrencySymbol();

	// calculate the average rating of the product
	const ratings = product.rating || [];
	const rating = Math.round(
		ratings.length > 0
			? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
			: 0,
	);
	const isDigital = product.deliveryType === "digital";
	const category = product.category || t("productCard.digitalAsset");
	const storeName = product.store?.name || t("productCard.wickedSeller");

	return (
		<Link
			href={`/product/${product.id}`}
			className="group block max-w-60 max-xl:mx-auto"
		>
			<div className="relative flex h-40 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-[#F6F8F4] sm:h-68 sm:w-60">
				<div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm">
					{isDigital ? (
						<DownloadCloudIcon size={13} className="text-green-600" />
					) : (
						<Code2Icon size={13} className="text-orange-600" />
					)}
					{isDigital ? t("productCard.digital") : t("productCard.asset")}
				</div>
				<Image
					width={500}
					height={500}
					className="max-h-30 w-auto transition duration-300 group-hover:scale-110 sm:max-h-40"
					src={resolveProductImageSrc(product.images?.[0])}
					alt=""
				/>
				<div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-md bg-slate-950/85 px-3 py-2 text-xs text-white">
					<span className="truncate">{category}</span>
					<span className="shrink-0 text-green-300">
						{isDigital ? t("productCard.zip") : t("productCard.bundle")}
					</span>
				</div>
			</div>
			<div className="flex justify-between gap-3 pt-3 text-sm text-slate-800 max-w-60">
				<div className="min-w-0">
					<p className="truncate font-medium">{product.name}</p>
					<p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
						<StoreIcon size={12} />
						{storeName}
					</p>
					<div className="mt-1 flex">
						{Array(5)
							.fill("")
							.map((_, index) => (
								<StarIcon
									key={index}
									size={14}
									className="text-transparent mt-0.5"
									fill={rating >= index + 1 ? "#FF7A29" : "#D1D5DB"}
								/>
							))}
					</div>
				</div>
				<p className="shrink-0 font-semibold text-slate-900">
					{currency}
					{product.price}
				</p>
			</div>
		</Link>
	);
};

export default ProductCard;
