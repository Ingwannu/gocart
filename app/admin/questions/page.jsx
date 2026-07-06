"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminQuestionsPage() {
	const { t } = useTranslation();
	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [answers, setAnswers] = useState({});

	const loadQuestions = () => {
		setLoading(true);
		const params = new URLSearchParams({ scope: "admin" });
		if (q.trim()) params.set("q", q.trim());
		if (status) params.set("status", status);
		fetchJson(`/api/product-questions?${params.toString()}`)
			.then((data) => {
				setQuestions(data.questions || []);
				setAnswers(
					Object.fromEntries(
						(data.questions || []).map((question) => [
							question.id,
							question.answer || "",
						]),
					),
				);
			})
			.catch(() => setQuestions([]))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		const timer = setTimeout(loadQuestions, 160);
		return () => clearTimeout(timer);
	}, [q, status]);

	const saveAnswer = async (questionId) => {
		const data = await fetchJson(`/api/product-questions/${questionId}`, {
			method: "PATCH",
			body: JSON.stringify({ answer: answers[questionId] }),
		});
		setQuestions((prev) =>
			prev.map((question) =>
				question.id === questionId ? data.question : question,
			),
		);
	};

	const deleteQuestion = async (questionId) => {
		await fetchJson(`/api/product-questions/${questionId}`, { method: "DELETE" });
		setQuestions((prev) => prev.filter((question) => question.id !== questionId));
	};

	return (
		<div className="mb-28 text-muted-foreground">
			<h1 className="text-2xl">
				{t("admin.productQuestions")}{" "}
				<span className="font-medium text-foreground">
					{t("admin.management")}
				</span>
			</h1>
			<div className="mt-5 max-w-6xl rounded-lg border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder={t("admin.searchQuestions")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={status}
						onChange={(event) => setStatus(event.target.value)}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("admin.allQuestions")}</option>
						<option value="unanswered">{t("admin.unansweredQuestions")}</option>
						<option value="answered">{t("admin.answeredQuestions")}</option>
					</select>
					<button
						type="button"
						onClick={() => {
							setQ("");
							setStatus("");
						}}
						className="h-10 rounded border border-border px-4 text-sm hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>
			{loading ? <Loading /> : null}
			<div className="mt-5 grid max-w-6xl gap-3">
				{questions.map((question) => (
					<div
						key={question.id}
						className="rounded-lg border border-border bg-frame p-4"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<p className="text-xs text-muted-foreground">
									{new Date(question.createdAt).toLocaleString()}
								</p>
								<Link
									href={`/product/${question.productId}`}
									className="mt-1 block text-lg font-medium text-foreground hover:underline"
								>
									{question.product?.name || question.productId}
								</Link>
								<p className="text-sm text-muted-foreground">
									{question.product?.store?.name || "-"} ·{" "}
									{question.user?.name || "-"}
								</p>
							</div>
							<span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
								{question.answer
									? t("admin.answeredQuestions")
									: t("admin.unansweredQuestions")}
							</span>
						</div>
						<p className="mt-4 whitespace-pre-wrap text-sm text-foreground">
							{question.question}
						</p>
						<textarea
							className="mt-4 min-h-24 w-full rounded border border-border p-2 text-sm"
							value={answers[question.id] ?? ""}
							onChange={(event) =>
								setAnswers((prev) => ({
									...prev,
									[question.id]: event.target.value,
								}))
							}
							placeholder={t("admin.answerPlaceholder")}
						/>
						<button
							type="button"
							onClick={() =>
								toast.promise(saveAnswer(question.id), {
									loading: t("admin.savingAnswer"),
									success: t("admin.answerSaved"),
									error: (error) => error.message,
								})
							}
							className="mt-2 rounded bg-accent px-4 py-2 text-sm text-accent-foreground hover:brightness-95"
						>
							{t("admin.saveAnswer")}
						</button>
						<button
							type="button"
							onClick={() => {
								if (!confirm(t("admin.deleteQuestionConfirm"))) return;
								toast.promise(deleteQuestion(question.id), {
									loading: t("admin.deletingQuestion"),
									success: t("admin.questionDeleted"),
									error: (error) => error.message,
								});
							}}
							className="ml-2 mt-2 rounded border border-danger-soft px-4 py-2 text-sm text-danger hover:bg-danger-soft"
						>
							{t("common.delete")}
						</button>
					</div>
				))}
				{questions.length === 0 && !loading && (
					<div className="rounded-lg border border-border bg-frame p-8 text-center text-muted-foreground">
						{t("admin.noProductQuestions")}
					</div>
				)}
			</div>
		</div>
	);
}
