"use client";
import ProductDescription from "@/components/ProductDescription";
import ProductDetails from "@/components/ProductDetails";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { fetchJson } from "@/lib/http";

export default function Product() {
	const { t } = useTranslation();
	const { productId } = useParams();
	const [product, setProduct] = useState();

	const fetchProduct = async () => {
		const data = await fetchJson(`/api/products/${productId}`);
		setProduct(data.product);
	};

	useEffect(() => {
		fetchProduct().catch(() => setProduct(null));
		scrollTo(0, 0);
	}, [productId]);

	return (
		<div className="mx-6">
			<div className="max-w-7xl mx-auto">
				<div className="text-muted-foreground text-sm mt-8 mb-5">
					{t("breadcrumb.home")} / {t("breadcrumb.products")} /{" "}
					{product?.category}
				</div>
				{product && <ProductDetails product={product} />}
				{product && <ProductDescription product={product} />}
			</div>
		</div>
	);
}
