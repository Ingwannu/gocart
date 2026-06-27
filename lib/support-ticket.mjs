const supportStatuses = new Set(["OPEN", "IN_PROGRESS", "RESOLVED"]);

function normalizeEmail(email) {
	const normalized = String(email || "").trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
		throw new Error("Invalid email");
	}
	return normalized;
}

function normalizeText(value, label, { min = 1, max = 5000 } = {}) {
	const normalized = String(value || "").trim();
	if (!normalized) throw new Error(`${label} is required`);
	if (normalized.length < min) {
		throw new Error(`${label} must be at least ${min} characters`);
	}
	if (normalized.length > max) {
		throw new Error(`${label} must be ${max} characters or fewer`);
	}
	return normalized;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function normalizeSupportStatus(status, fallback) {
	const normalized = String(status || fallback || "").trim().toUpperCase();
	if (!supportStatuses.has(normalized)) throw new Error("Invalid support status");
	return normalized;
}

function textContains(query) {
	return { contains: query, mode: "insensitive" };
}

export function normalizeSupportTicketPayload(body = {}) {
	return {
		name: normalizeText(body.name, "Name", { max: 120 }),
		email: normalizeEmail(body.email),
		subject: normalizeText(body.subject, "Subject", { max: 160 }),
		message: normalizeText(body.message, "Message", { min: 10, max: 5000 }),
	};
}

export function normalizeSupportTicketPatchPayload(body = {}) {
	const data = {};
	if (body.status !== undefined) {
		data.status = normalizeSupportStatus(body.status);
	}
	if (body.internalNote !== undefined) {
		data.internalNote = String(body.internalNote || "").trim().slice(0, 5000);
	}
	return data;
}

export function createSupportTicketWhere({ q, status } = {}) {
	const where = {};
	const normalizedStatus = String(status || "").trim().toUpperCase();
	if (supportStatuses.has(normalizedStatus)) where.status = normalizedStatus;

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ name: textContains(query) },
			{ email: textContains(query) },
			{ subject: textContains(query) },
			{ message: textContains(query) },
		];
	}

	return where;
}

export function buildSupportTicketPagination({ page, limit } = {}, total = 0) {
	const normalizedTotal = Math.max(0, normalizePositiveInteger(total, 0));
	const normalizedLimit = Math.min(normalizePositiveInteger(limit, 25), 50);
	const totalPages = Math.max(1, Math.ceil(normalizedTotal / normalizedLimit));
	const normalizedPage = Math.min(
		normalizePositiveInteger(page, 1),
		totalPages,
	);

	return {
		page: normalizedPage,
		limit: normalizedLimit,
		skip: (normalizedPage - 1) * normalizedLimit,
		take: normalizedLimit,
		total: normalizedTotal,
		totalPages,
		hasNextPage: normalizedPage < totalPages,
		hasPreviousPage: normalizedPage > 1,
	};
}

export function resolveSupportTicketWriteError(error) {
	if (error?.code === "P2025") {
		return { message: "Support ticket not found", status: 404 };
	}
	return null;
}
