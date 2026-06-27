"use client";
import { addToCart } from "@/lib/features/cart/cartSlice";
import {
	StarIcon,
	TagIcon,
	EarthIcon,
	CreditCardIcon,
	UserIcon,
	HeartIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Counter from "./Counter";
import { useDispatch, useSelector } from "react-redux";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { resolveProductImages } from "@/lib/product-image.mjs";
import { fetchJson } from "@/lib/http";
import toast from "react-hot-toast";

const ProductDetails = ({ product }) => {
	const { t } = useTranslation();
	const { status } = useSession();
	const productId = product.id;
	const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$";
	const cart = useSelector((state) => state.cart.cartItems);
	const dispatch = useDispatch();
	const router = useRouter();
	const productImages = resolveProductImages(product.images);
	const [mainImage, setMainImage] = useState(productImages[0]);
	const [wishlistSaved, setWishlistSaved] = useState(false);
	const [wishlistLoading, setWishlistLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		setWishlistSaved(false);
		if (status !== "authenticated") return;

		fetchJson(`/api/wishlist?productId=${encodeURIComponent(productId)}`)
			.then((data) => {
				if (!cancelled) setWishlistSaved(Boolean(data.saved));
			})
			.catch(() => {
				if (!cancelled) setWishlistSaved(false);
			});

		return () => {
			cancelled = true;
		};
	}, [productId, status]);

	const addToCartHandler = () => {
		dispatch(addToCart({ productId }));
	};
	const toggleWishlist = async () => {
		if (status !== "authenticated") {
			router.push(
				`/login?callbackUrl=${encodeURIComponent(`/product/${productId}`)}`,
			);
			return;
		}

		setWishlistLoading(true);
		try {
			if (wishlistSaved) {
				await fetchJson(`/api/wishlist/${productId}`, { method: "DELETE" });
				setWishlistSaved(false);
			} else {
				await fetchJson("/api/wishlist", {
					method: "POST",
					body: JSON.stringify({ productId }),
				});
				setWishlistSaved(true);
			}
		} finally {
			setWishlistLoading(false);
		}
	};
	const ratings = product.rating || [];
	const averageRating =
		ratings.length > 0
			? ratings.reduce((acc, item) => acc + item.rating, 0) / ratings.length
			: 0;

	return (
		<div className="flex max-lg:flex-col gap-12">
			<div className="flex max-sm:flex-col-reverse gap-3">
				<div className="flex sm:flex-col gap-3">
					{productImages.map((image, index) => (
						<div
							key={index}
							onClick={() => setMainImage(productImages[index])}
							className="bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer"
						>
							<Image
								src={image}
								className="group-hover:scale-103 group-active:scale-95 transition"
								alt=""
								width={45}
								height={45}
							/>
						</div>
					))}
				</div>
				<div className="flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg">
					<Image src={mainImage} alt="" width={250} height={250} />
				</div>
			</div>
			<div className="flex-1">
				<h1 className="text-3xl font-semibold text-slate-800">
					{product.name}
				</h1>
				<div className="flex items-center mt-2">
					{Array(5)
						.fill("")
						.map((_, index) => (
							<StarIcon
								key={index}
								size={14}
								className="text-transparent mt-0.5"
								fill={averageRating >= index + 1 ? "#FF7A29" : "#D1D5DB"}
							/>
						))}
					<p className="text-sm ml-3 text-slate-500">
						{t("product.totalReviews", { count: ratings.length })}
					</p>
				</div>
				<div className="flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800">
					<p>
						{" "}
						{currency}
						{product.price}{" "}
					</p>
					<p className="text-xl text-slate-500 line-through">
						{currency}
						{product.mrp}
					</p>
				</div>
				<div className="flex items-center gap-2 text-slate-500">
					<TagIcon size={14} />
					<p>
						{t("product.savePercent", {
							percent: (
								((product.mrp - product.price) / product.mrp) *
								100
							).toFixed(0),
						})}
					</p>
				</div>
				<div className="flex items-end gap-5 mt-10">
					{cart[productId] && (
						<div className="flex flex-col gap-3">
							<p className="text-lg text-slate-800 font-semibold">
								{t("common.quantity")}
							</p>
							<Counter productId={productId} />
						</div>
					)}
					<button
						onClick={() =>
							!cart[productId] ? addToCartHandler() : router.push("/cart")
						}
						className="bg-[#1A1A1A] text-white px-10 py-3 text-sm font-medium rounded hover:bg-orange-600 active:scale-95 transition"
					>
						{!cart[productId] ? t("common.addToCart") : t("common.viewCart")}
					</button>
					<button
						type="button"
						disabled={wishlistLoading}
						onClick={() =>
							toast.promise(toggleWishlist(), {
								loading: wishlistSaved
									? t("product.removingFromWishlist")
									: t("product.savingToWishlist"),
								success: wishlistSaved
									? t("product.removedFromWishlist")
									: t("product.savedToWishlist"),
								error: (error) => error.message,
							})
						}
						className="flex items-center gap-2 rounded border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<HeartIcon
							size={18}
							fill={wishlistSaved ? "#FF7A29" : "transparent"}
							className={wishlistSaved ? "text-orange-500" : "text-slate-500"}
						/>
						{wishlistSaved
							? t("product.savedWishlist")
							: t("product.saveWishlist")}
					</button>
				</div>
				<hr className="border-gray-300 my-5" />
				<div className="flex flex-col gap-4 text-slate-500">
					<p className="flex gap-3">
						{" "}
						<EarthIcon className="text-slate-400" />{" "}
						{t("product.freeShippingWorldwide")}{" "}
					</p>
					<p className="flex gap-3">
						{" "}
						<CreditCardIcon className="text-slate-400" />{" "}
						{t("product.securedPayment")}{" "}
					</p>
					<p className="flex gap-3">
						{" "}
						<UserIcon className="text-slate-400" />{" "}
						{t("product.trustedByBrands")}{" "}
					</p>
				</div>
			</div>
		</div>
	);
};

export default ProductDetails;
