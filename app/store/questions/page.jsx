"use client";
import Loading from "@/components/Loading";
import { fetchJson } from "@/lib/http";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function StoreQuestionsPage() {
	const { t } = useTranslation();
	const [questions, setQuestions] = useState([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [answers, setAnswers] = useState({});

	const loadQuestions = async () => {
		setLoading(true);
		const params = new URLSearchParams({ scope: "store" });
		if (q.trim()) params.set("q", q.trim());
		if (status) params.set("status", status);
		try {
			const data = await fetchJson(`/api/product-questions?${params.toString()}`);
			setQuestions(data.questions || []);
			setAnswers(
				Object.fromEntries(
					(data.questions || []).map((question) => [
						question.id,
						question.answer || "",
					]),
				),
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		const timer = setTimeout(() => {
			loadQuestions().catch(() => setQuestions([]));
		}, 160);
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
		<>
			<h1 className="mb-5 text-2xl text-muted-foreground">
				{t("store.productQuestions")}
			</h1>
			<div className="mb-5 max-w-5xl rounded-md border border-border bg-frame p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder={t("store.searchQuestions")}
						className="h-10 rounded border border-border px-3 text-sm text-foreground outline-none focus:border-ring"
					/>
					<select
						value={status}
						onChange={(event) => setStatus(event.target.value)}
						className="h-10 rounded border border-border px-3 text-sm text-foreground"
					>
						<option value="">{t("store.allQuestions")}</option>
						<option value="unanswered">{t("store.unansweredQuestions")}</option>
						<option value="answered">{t("store.answeredQuestions")}</option>
					</select>
					<button
						type="button"
						onClick={() => {
							setQ("");
							setStatus("");
						}}
						className="h-10 rounded border border-border px-4 text-sm text-foreground hover:bg-muted"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>
			{loading ? <Loading /> : null}
			{!loading && questions.length === 0 ? (
				<p className="text-muted-foreground">{t("store.noProductQuestions")}</p>
			) : (
				<div className="max-w-5xl space-y-4">
					{questions.map((question) => (
						<div
							key={question.id}
							className="rounded-md border border-border bg-frame p-5 shadow-sm"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-foreground">
										{question.product?.name}
									</p>
									<p className="mt-1 text-xs text-muted-foreground">
										{question.user?.name} ·{" "}
										{new Date(question.createdAt).toLocaleString()}
									</p>
								</div>
								<span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
									{question.answer
										? t("store.answeredQuestions")
										: t("store.unansweredQuestions")}
								</span>
							</div>
							<p className="mt-4 text-muted-foreground">{question.question}</p>
							<textarea
								value={answers[question.id] || ""}
								onChange={(event) =>
									setAnswers((prev) => ({
										...prev,
										[question.id]: event.target.value,
									}))
								}
								placeholder={t("store.answerPlaceholder")}
								className="mt-4 min-h-24 w-full rounded border border-border p-3 text-sm outline-none focus:border-ring"
							/>
							<button
								type="button"
								onClick={() =>
									toast.promise(saveAnswer(question.id), {
										loading: t("store.savingAnswer"),
										success: t("store.answerSaved"),
										error: (error) => error.message,
									})
								}
								className="mt-3 rounded bg-accent px-5 py-2 text-sm text-accent-foreground hover:brightness-95"
							>
								{t("store.saveAnswer")}
							</button>
							<button
								type="button"
								onClick={() => {
									if (!confirm(t("store.deleteQuestionConfirm"))) return;
									toast.promise(deleteQuestion(question.id), {
										loading: t("store.deletingQuestion"),
										success: t("store.questionDeleted"),
										error: (error) => error.message,
									});
								}}
								className="ml-2 mt-3 rounded border border-danger-soft px-5 py-2 text-sm text-danger hover:bg-danger-soft"
							>
								{t("common.delete")}
							</button>
						</div>
					))}
				</div>
			)}
		</>
	);
}
