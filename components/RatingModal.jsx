"use client";
import { Star } from "lucide-react";
import React, { useState } from "react";
import { XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useDispatch } from "react-redux";
import { addRating } from "@/lib/features/rating/ratingSlice.mjs";
import { fetchJson } from "@/lib/http";

const RatingModal = ({ ratingModal, setRatingModal }) => {
	const { t } = useTranslation();
	const dispatch = useDispatch();
	const [rating, setRating] = useState(0);
	const [review, setReview] = useState("");

	const handleSubmit = async () => {
		const normalizedReview = review.trim();
		if (rating <= 0 || rating > 5) {
			return toast(t("rating.pleaseSelectRating"));
		}
		if (normalizedReview.length < 5) {
			return toast(t("rating.writeShortReview"));
		}
		const data = await fetchJson("/api/ratings", {
			method: "POST",
			body: JSON.stringify({
				orderId: ratingModal.orderId,
				productId: ratingModal.productId,
				rating,
				review: normalizedReview,
			}),
		});
		dispatch(addRating(data.rating));
		setRatingModal(null);
	};

	return (
		<div className="fixed inset-0 z-120 flex items-center justify-center bg-black/10">
			<div className="bg-frame p-8 rounded-lg shadow-lg w-96 relative">
				<button
					onClick={() => setRatingModal(null)}
					className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
				>
					<XIcon size={20} />
				</button>
				<h2 className="text-xl font-medium text-foreground mb-4">
					{t("rating.rateProduct")}
				</h2>
				<div className="flex items-center justify-center mb-4">
					{Array.from({ length: 5 }, (_, i) => (
						<Star
							key={i}
							className={`size-8 cursor-pointer ${rating > i ? "text-warning fill-current" : "text-border"}`}
							onClick={() => setRating(i + 1)}
						/>
					))}
				</div>
				<textarea
					className="w-full p-2 border border-border rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
					placeholder={t("rating.writeReview")}
					rows="4"
					value={review}
					onChange={(e) => setReview(e.target.value)}
				></textarea>
				<button
					onClick={(e) =>
						toast.promise(handleSubmit(), { loading: t("rating.submitting") })
					}
					className="w-full bg-accent text-accent-foreground py-2 rounded-md hover:brightness-95 transition"
				>
					{t("rating.submitRating")}
				</button>
			</div>
		</div>
	);
};

export default RatingModal;
