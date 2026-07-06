"use client";
import { ArrowRight, StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { renderRichDescription } from "@/lib/rich-description.mjs";
import { fetchJson } from "@/lib/http";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const ProductDescription = ({ product }) => {
	const { t } = useTranslation();
	const { status } = useSession();
	const router = useRouter();
	const [selectedTab, setSelectedTab] = useState("Description");
	const [questions, setQuestions] = useState([]);
	const [questionText, setQuestionText] = useState("");
	const [loadingQuestions, setLoadingQuestions] = useState(false);
	const [submittingQuestion, setSubmittingQuestion] = useState(false);
	const ratings = product.rating || [];

	const loadQuestions = async () => {
		setLoadingQuestions(true);
		try {
			const data = await fetchJson(
				`/api/product-questions?productId=${encodeURIComponent(product.id)}`,
			);
			setQuestions(data.questions || []);
		} finally {
			setLoadingQuestions(false);
		}
	};

	useEffect(() => {
		if (selectedTab !== "Questions") return;
		loadQuestions().catch(() => setQuestions([]));
	}, [selectedTab, product.id]);

	const submitQuestion = async (event) => {
		event.preventDefault();
		if (status !== "authenticated") {
			router.push(
				`/login?callbackUrl=${encodeURIComponent(`/product/${product.id}`)}`,
			);
			return;
		}
		setSubmittingQuestion(true);
		try {
			const data = await fetchJson("/api/product-questions", {
				method: "POST",
				body: JSON.stringify({ productId: product.id, question: questionText }),
			});
			setQuestions((prev) => [data.question, ...prev]);
			setQuestionText("");
		} finally {
			setSubmittingQuestion(false);
		}
	};

	return (
		<div className="my-18 text-sm text-muted-foreground">
			<div className="flex border-b border-border mb-6 max-w-2xl">
				{["Description", "Reviews", "Questions"].map((tab, index) => (
					<button
						className={`${tab === selectedTab ? "border-b-[1.5px] font-semibold text-foreground" : "text-muted-foreground"} px-3 py-2 font-medium`}
						key={index}
						onClick={() => setSelectedTab(tab)}
					>
						{tab === "Description" && t("product.description")}
						{tab === "Reviews" && t("product.reviews")}
						{tab === "Questions" && t("product.questions")}
					</button>
				))}
			</div>
			{selectedTab === "Description" && (
				<div
					className="rich-description max-w-3xl"
					dangerouslySetInnerHTML={{
						__html: renderRichDescription(product.description),
					}}
				/>
			)}
			{selectedTab === "Reviews" && (
				<div className="flex flex-col gap-3 mt-14">
					{ratings.map((item, index) => (
						<div key={index} className="flex gap-5 mb-10">
							<Image
								src={item.user?.image || "/favicon.ico"}
								alt=""
								className="size-10 rounded-full"
								width={100}
								height={100}
							/>
							<div>
								<div className="flex items-center">
									{Array(5)
										.fill("")
										.map((_, index) => (
											<StarIcon
												key={index}
												size={18}
												className="text-transparent mt-0.5"
												fill={item.rating >= index + 1 ? "#FF7A29" : "#D1D5DB"}
											/>
										))}
								</div>
								<p className="text-sm max-w-lg my-4">{item.review}</p>
								<p className="font-medium text-foreground">{item.user?.name}</p>
								<p className="mt-3 font-light">
									{new Date(item.createdAt).toDateString()}
								</p>
							</div>
						</div>
					))}
				</div>
			)}
			{selectedTab === "Questions" && (
				<div className="mt-10 max-w-3xl">
					<form
						onSubmit={(event) =>
							toast.promise(submitQuestion(event), {
								loading: t("product.askingQuestion"),
								success: t("product.questionSubmitted"),
								error: (error) => error.message,
							})
						}
						className="rounded-md border border-border bg-frame p-4"
					>
						<label className="block text-sm font-medium text-foreground">
							{t("product.askQuestion")}
							<textarea
								value={questionText}
								onChange={(event) => setQuestionText(event.target.value)}
								placeholder={t("product.questionPlaceholder")}
								className="mt-2 min-h-24 w-full rounded border border-border p-3 text-sm outline-none focus:border-ring"
								required
							/>
						</label>
						<button
							disabled={submittingQuestion}
							className="mt-3 rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{t("product.submitQuestion")}
						</button>
					</form>
					<div className="mt-8 space-y-4">
						{loadingQuestions ? (
							<p className="text-muted-foreground">{t("common.loading")}</p>
						) : questions.length ? (
							questions.map((item) => (
								<div
									key={item.id}
									className="rounded-md border border-border bg-frame p-4"
								>
									<div className="flex items-center justify-between gap-3">
										<p className="font-medium text-foreground">
											{item.user?.name || t("product.customer")}
										</p>
										<p className="text-xs text-muted-foreground">
											{new Date(item.createdAt).toLocaleDateString()}
										</p>
									</div>
									<p className="mt-2 text-muted-foreground">{item.question}</p>
									{item.answer ? (
										<div className="mt-4 rounded bg-muted p-3">
											<p className="text-xs font-medium uppercase text-foreground">
												{t("product.sellerAnswer")}
											</p>
											<p className="mt-1 text-foreground">{item.answer}</p>
										</div>
									) : (
										<p className="mt-3 text-xs text-muted-foreground">
											{t("product.awaitingAnswer")}
										</p>
									)}
								</div>
							))
						) : (
							<p className="text-muted-foreground">{t("product.noQuestions")}</p>
						)}
					</div>
				</div>
			)}
			<div className="flex gap-3 mt-14">
				<Image
					src={product.store?.logo || "/favicon.ico"}
					alt=""
					className="size-11 rounded-full ring ring-border"
					width={100}
					height={100}
				/>
				<div>
					<p className="font-medium text-foreground">
						{t("product.productBy", { store: product.store?.name })}
					</p>
					<Link
						href={`/shop/${product.store?.username}`}
						className="flex items-center gap-1.5 text-foreground font-medium"
					>
						{" "}
						{t("product.viewStore")} <ArrowRight size={14} />
					</Link>
				</div>
			</div>
		</div>
	);
};

export default ProductDescription;
