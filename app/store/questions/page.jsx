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
			<h1 className="mb-5 text-2xl text-slate-500">
				{t("store.productQuestions")}
			</h1>
			<div className="mb-5 max-w-5xl rounded-md border border-gray-200 bg-white p-4">
				<div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto]">
					<input
						type="search"
						value={q}
						onChange={(event) => setQ(event.target.value)}
						placeholder={t("store.searchQuestions")}
						className="h-10 rounded border border-gray-200 px-3 text-sm text-gray-700 outline-none focus:border-orange-400"
					/>
					<select
						value={status}
						onChange={(event) => setStatus(event.target.value)}
						className="h-10 rounded border border-gray-200 px-3 text-sm text-gray-700"
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
						className="h-10 rounded border border-gray-200 px-4 text-sm text-gray-700 hover:bg-gray-50"
					>
						{t("ordersPage.reset")}
					</button>
				</div>
			</div>
			{loading ? <Loading /> : null}
			{!loading && questions.length === 0 ? (
				<p className="text-slate-400">{t("store.noProductQuestions")}</p>
			) : (
				<div className="max-w-5xl space-y-4">
					{questions.map((question) => (
						<div
							key={question.id}
							className="rounded-md border border-gray-200 bg-white p-5 shadow-sm"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-sm font-medium text-slate-800">
										{question.product?.name}
									</p>
									<p className="mt-1 text-xs text-slate-400">
										{question.user?.name} ·{" "}
										{new Date(question.createdAt).toLocaleString()}
									</p>
								</div>
								<span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
									{question.answer
										? t("store.answeredQuestions")
										: t("store.unansweredQuestions")}
								</span>
							</div>
							<p className="mt-4 text-slate-600">{question.question}</p>
							<textarea
								value={answers[question.id] || ""}
								onChange={(event) =>
									setAnswers((prev) => ({
										...prev,
										[question.id]: event.target.value,
									}))
								}
								placeholder={t("store.answerPlaceholder")}
								className="mt-4 min-h-24 w-full rounded border border-gray-200 p-3 text-sm outline-none focus:border-orange-400"
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
								className="mt-3 rounded bg-[#1A1A1A] px-5 py-2 text-sm text-white hover:bg-orange-600"
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
								className="ml-2 mt-3 rounded border border-red-200 px-5 py-2 text-sm text-red-600 hover:bg-red-50"
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
