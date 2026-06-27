export function normalizeAdminCouponPayload(body) {
	const code = String(body.code || "").trim().toUpperCase();
	const description = String(body.description || "").trim();
	const discount = Number(body.discount);
	const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

	if (!code || !description || !body.discount || !expiresAt) {
		throw new Error("Missing required coupon fields");
	}
	if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
		throw new Error("Invalid coupon discount");
	}
	if (Number.isNaN(expiresAt.getTime())) {
		throw new Error("Invalid coupon expiry date");
	}

	return {
		code,
		description,
		discount,
		forNewUser: Boolean(body.forNewUser),
		forMember: Boolean(body.forMember),
		isPublic: Boolean(body.isPublic),
		expiresAt,
	};
}

export function normalizeAdminCouponPatchPayload(body) {
	const data = {};

	if (body.description !== undefined) {
		const description = String(body.description || "").trim();
		if (!description) throw new Error("Coupon description is required");
		data.description = description;
	}

	if (body.discount !== undefined) {
		const discount = Number(body.discount);
		if (!Number.isFinite(discount) || discount <= 0 || discount > 100) {
			throw new Error("Invalid coupon discount");
		}
		data.discount = discount;
	}

	if (body.expiresAt !== undefined) {
		const expiresAt = new Date(body.expiresAt);
		if (Number.isNaN(expiresAt.getTime())) {
			throw new Error("Invalid coupon expiry date");
		}
		data.expiresAt = expiresAt;
	}

	for (const field of ["forNewUser", "forMember", "isPublic"]) {
		if (body[field] !== undefined) data[field] = Boolean(body[field]);
	}

	if (Object.keys(data).length === 0) {
		throw new Error("No coupon fields to update");
	}

	return data;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function createAdminCouponWhere({ q, audience, expiry, now = new Date() } = {}) {
	const where = {};

	if (audience === "public") where.isPublic = true;
	if (audience === "new") where.forNewUser = true;
	if (audience === "member") where.forMember = true;

	if (expiry === "active") where.expiresAt = { gte: now };
	if (expiry === "expired") where.expiresAt = { lt: now };

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ code: { contains: query, mode: "insensitive" } },
			{ description: { contains: query, mode: "insensitive" } },
		];
	}

	return where;
}

export function buildAdminCouponPagination({ page, limit } = {}, total = 0) {
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

export function resolveCouponWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Coupon code already exists", status: 409 };
	}
	if (error?.code === "P2025") {
		return { message: "Coupon not found", status: 404 };
	}

	return null;
}

export function normalizeCheckoutCouponCode(couponPayload) {
	const code =
		typeof couponPayload === "string" ? couponPayload : couponPayload?.code;
	const normalized = String(code || "").trim().toUpperCase();
	return normalized || null;
}

export function resolveCheckoutCouponBlock({
	requestedCode,
	coupon,
	userRole = "user",
	previousOrderCount = 0,
	now = new Date(),
} = {}) {
	if (!requestedCode) return null;
	if (!coupon || coupon.expiresAt < now) {
		return { message: "Coupon is invalid or expired", status: 404 };
	}
	if (!coupon.isPublic) {
		return { message: "Coupon is not publicly available", status: 403 };
	}
	if (coupon.forMember && !["member", "admin"].includes(userRole)) {
		return { message: "Coupon is for members only", status: 403 };
	}
	if (coupon.forNewUser && previousOrderCount > 0) {
		return { message: "Coupon is for new users only", status: 403 };
	}

	return null;
}
