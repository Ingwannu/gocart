function requiredString(value, label) {
	const normalized = String(value || "").trim();
	if (!normalized) throw new Error(`${label} is required`);
	return normalized;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function normalizeAuditLogPayload(payload = {}) {
	return {
		actorId: requiredString(payload.actorId, "Audit actor"),
		action: requiredString(payload.action, "Audit action").toUpperCase(),
		targetType: requiredString(payload.targetType, "Audit target type").toLowerCase(),
		targetId: requiredString(payload.targetId, "Audit target id"),
		summary: requiredString(payload.summary, "Audit summary"),
		metadata: JSON.stringify(payload.metadata || {}),
	};
}

export function createAdminAuditLogWhere({
	q,
	action,
	actorId,
	targetType,
	targetId,
} = {}) {
	const where = {};
	const normalizedAction = String(action || "").trim().toUpperCase();
	const normalizedActorId = String(actorId || "").trim();
	const normalizedTargetType = String(targetType || "").trim().toLowerCase();
	const normalizedTargetId = String(targetId || "").trim();

	if (normalizedAction) where.action = normalizedAction;
	if (normalizedActorId) where.actorId = normalizedActorId;
	if (normalizedTargetType) where.targetType = normalizedTargetType;
	if (normalizedTargetId) where.targetId = normalizedTargetId;

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ summary: { contains: query, mode: "insensitive" } },
			{ action: { contains: query, mode: "insensitive" } },
			{ targetType: { contains: query, mode: "insensitive" } },
			{ actor: { email: { contains: query, mode: "insensitive" } } },
			{ actor: { name: { contains: query, mode: "insensitive" } } },
		];
	}

	return where;
}

export function buildAdminAuditLogPagination({ page, limit } = {}, total = 0) {
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
