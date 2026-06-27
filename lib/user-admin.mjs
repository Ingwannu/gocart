const allowedRoles = new Set(["user", "member", "seller", "admin"]);
const storeCapableRoles = new Set(["member", "seller", "admin"]);
const allowedStatuses = new Set(["active", "suspended"]);

function normalizeEmail(email) {
	const normalized = String(email || "").trim().toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
		throw new Error("Invalid email");
	}
	return normalized;
}

export function normalizeAuthEmail(email) {
	try {
		return normalizeEmail(email);
	} catch {
		return null;
	}
}

function normalizePassword(password, required = true) {
	const value = String(password || "");
	if (!value && !required) return null;
	if (value.length < 8) throw new Error("Password must be at least 8 characters");
	return value;
}

function normalizeRole(role, fallback = "user") {
	const value = String(role || fallback).trim().toLowerCase();
	if (!allowedRoles.has(value)) throw new Error("Invalid user role");
	return value;
}

function normalizeSuspensionState(value) {
	if (typeof value !== "boolean") throw new Error("Invalid suspension state");
	return value;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function normalizePublicSignupPayload(
	body,
	{ requirePasswordConfirmation = false } = {},
) {
	const name = String(body.name || "").trim();
	if (!name) throw new Error("Name is required");
	const password = normalizePassword(body.password);
	if (requirePasswordConfirmation) {
		const confirmPassword = String(body.confirmPassword || "");
		if (!confirmPassword) throw new Error("Password confirmation is required");
		if (password !== confirmPassword) throw new Error("Passwords do not match");
	}
	return {
		name,
		email: normalizeEmail(body.email),
		password,
		role: "user",
	};
}

export function normalizeAdminUserCreatePayload(body) {
	const payload = normalizePublicSignupPayload(body);
	return {
		...payload,
		role: normalizeRole(body.role),
	};
}

export function normalizeAdminUserPatchPayload(body) {
	const data = {};
	if (body.name !== undefined) {
		const name = String(body.name || "").trim();
		if (!name) throw new Error("Name is required");
		data.name = name;
	}
	if (body.email !== undefined) {
		data.email = normalizeEmail(body.email);
	}
	if (body.role !== undefined) {
		data.role = normalizeRole(body.role);
	}
	if (body.isSuspended !== undefined) {
		data.isSuspended = normalizeSuspensionState(body.isSuspended);
	}
	if (body.password) {
		data.password = normalizePassword(body.password, false);
	}
	return data;
}

export function createUserRoleChangeStoreUpdate({ nextRole, store } = {}) {
	if (
		nextRole &&
		!storeCapableRoles.has(nextRole) &&
		store?.status === "approved" &&
		store?.isActive
	) {
		return { id: store.id, isActive: false };
	}

	return null;
}

export function createAdminUserWhere({ q, role, status } = {}) {
	const where = {};
	const normalizedRole = role ? String(role).trim().toLowerCase() : "";
	if (normalizedRole && allowedRoles.has(normalizedRole)) {
		where.role = normalizedRole;
	}

	const normalizedStatus = status ? String(status).trim().toLowerCase() : "";
	if (allowedStatuses.has(normalizedStatus)) {
		where.isSuspended = normalizedStatus === "suspended";
	}

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ name: { contains: query, mode: "insensitive" } },
			{ email: { contains: query, mode: "insensitive" } },
			{ store: { name: { contains: query, mode: "insensitive" } } },
			{ store: { username: { contains: query, mode: "insensitive" } } },
		];
	}

	return where;
}

export function buildAdminUserPagination({ page, limit } = {}, total = 0) {
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

export function resolveAdminUserPatchBlock({
	isSelf = false,
	nextIsSuspended,
} = {}) {
	if (isSelf && nextIsSuspended === true) {
		return { message: "You cannot suspend yourself", status: 403 };
	}

	return null;
}

export function resolveAdminUserDeleteBlock({
	isSelf = false,
	ownsStore = false,
	buyerOrderCount = 0,
	payoutEventCount = 0,
	auditLogCount = 0,
	inventoryAdjustmentCount = 0,
} = {}) {
	if (isSelf) {
		return { message: "You cannot delete yourself", status: 403 };
	}
	if (ownsStore) {
		return {
			message: "User owns a store; reassign or delete the store first",
			status: 409,
		};
	}
	if (buyerOrderCount > 0) {
		return {
			message: "User has order history and cannot be deleted",
			status: 409,
		};
	}
	if (payoutEventCount > 0) {
		return {
			message: "User has admin payout history and cannot be deleted",
			status: 409,
		};
	}
	if (auditLogCount > 0) {
		return {
			message: "User has audit log history and cannot be deleted",
			status: 409,
		};
	}
	if (inventoryAdjustmentCount > 0) {
		return {
			message: "User has inventory adjustment history and cannot be deleted",
			status: 409,
		};
	}

	return null;
}

export function resolveUserWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "Email is already registered", status: 409 };
	}

	return null;
}
