import { canManageStoreQuestions } from "./store-access.mjs";

function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

function normalizeText(value, { min, max, emptyMessage, shortMessage, longMessage }) {
	const normalized = String(value || "").trim();
	if (!normalized) throw new Error(emptyMessage);
	if (normalized.length < min) throw new Error(shortMessage);
	if (normalized.length > max) throw new Error(longMessage);
	return normalized;
}

export function normalizeProductQuestionPayload(body = {}) {
	const productId = String(body.productId || "").trim();
	if (!productId) throw new Error("Product is required");
	return {
		productId,
		question: normalizeText(body.question, {
			min: 8,
			max: 1000,
			emptyMessage: "Question is required",
			shortMessage: "Question must be at least 8 characters",
			longMessage: "Question is too long",
		}),
	};
}

export function normalizeProductQuestionAnswerPayload(body = {}) {
	return {
		answer: normalizeText(body.answer, {
			min: 1,
			max: 2000,
			emptyMessage: "Answer is required",
			shortMessage: "Answer is required",
			longMessage: "Answer is too long",
		}),
	};
}

export function createProductQuestionProductWhere(productId) {
	const where = {
		isArchived: false,
		inStock: true,
		OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
		store: { status: "approved", isActive: true },
	};
	if (productId) where.id = productId;
	return where;
}

export function createProductQuestionWhere({
	scope = "public",
	productId,
	storeId,
	status,
	q,
} = {}) {
	const where = {};
	if (productId) where.productId = productId;
	if (scope === "public") where.product = createProductQuestionProductWhere();
	if (scope === "store" && storeId) where.product = { storeId };
	if (status === "answered") where.answer = { not: "" };
	if (status === "unanswered") where.answer = "";

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ question: textContains(query) },
			{ answer: textContains(query) },
			{ product: { name: textContains(query) } },
			{ user: { name: textContains(query) } },
			{ user: { email: textContains(query) } },
		];
	}

	return where;
}

export function canAnswerProductQuestion(user, question) {
	if (user?.role === "admin") return true;
	return canManageStoreQuestions(user, question?.product?.store);
}

export function canDeleteProductQuestion(user, question) {
	return canAnswerProductQuestion(user, question);
}
