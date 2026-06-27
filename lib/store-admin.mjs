const allowedStoreStatuses = new Set(["pending", "approved", "rejected"]);
const allowedStaffRoles = new Set(["viewer", "staff", "manager"]);

function requiredString(value, message) {
	const normalized = String(value || "").trim();
	if (!normalized) throw new Error(message);
	return normalized;
}

function normalizePositiveInteger(value, fallback) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function normalizeStoreUsername(username) {
	const normalized = requiredString(
		username,
		"Store username must be 3-40 lowercase letters, numbers, or dashes",
	).toLowerCase();

	if (!/^[a-z0-9-]{3,40}$/.test(normalized)) {
		throw new Error("Store username must be 3-40 lowercase letters, numbers, or dashes");
	}

	return normalized;
}

export function normalizeAdminStorePayload(body, existingStore = null) {
	const userEmail = body.userEmail
		? String(body.userEmail).trim().toLowerCase()
		: null;
	if (!userEmail && !existingStore) throw new Error("Missing owner email");

	const status = body.status || existingStore?.status || "approved";
	if (!allowedStoreStatuses.has(status)) throw new Error("Invalid store status");

	const data = {};
	for (const field of ["name", "description", "email", "contact", "address", "logo"]) {
		if (body[field] !== undefined) data[field] = String(body[field] || "").trim();
	}

	if (!existingStore) {
		data.name = requiredString(data.name, "Missing required store fields");
		data.email = requiredString(data.email, "Missing required store fields");
		data.contact = requiredString(data.contact, "Missing required store fields");
		data.address = requiredString(data.address, "Missing required store fields");
		data.description ||= "";
		data.logo ||= "";
	}

	if (body.username !== undefined || !existingStore) {
		data.username = normalizeStoreUsername(body.username);
	}

	if (body.status !== undefined || !existingStore) {
		data.status = status;
	}

	if (body.isActive !== undefined) {
		data.isActive = Boolean(body.isActive);
	} else if (!existingStore) {
		data.isActive = status === "approved";
	} else if (body.status === "approved") {
		data.isActive = true;
	} else if (body.status === "rejected") {
		data.isActive = false;
	}

	return { userEmail, data };
}

export function resolveGrantedOwnerRole(currentRole) {
	return currentRole === "user" ? "seller" : currentRole;
}

export function resolveStoreOwnerGrantBlock(user) {
	if (user?.isSuspended) {
		return { message: "Owner account is suspended", status: 409 };
	}
	return null;
}

export function resolveStoreStaffGrantBlock(user) {
	if (user?.isSuspended) {
		return { message: "Staff account is suspended", status: 409 };
	}
	return null;
}

export function resolveRevokedOwnerRole(currentRole) {
	return currentRole === "seller" ? "user" : currentRole;
}

export function createStoreOwnerTransferRoleUpdates({
	previousOwner,
	nextOwner,
} = {}) {
	if (!previousOwner || !nextOwner || previousOwner.id === nextOwner.id) return [];

	const updates = [];
	const previousRole = resolveRevokedOwnerRole(previousOwner.role);
	if (previousRole !== previousOwner.role) {
		updates.push({ id: previousOwner.id, role: previousRole });
	}

	const nextRole = resolveGrantedOwnerRole(nextOwner.role);
	if (nextRole !== nextOwner.role) {
		updates.push({ id: nextOwner.id, role: nextRole });
	}

	return updates;
}

export function createStoreRemovalRoleUpdate({ owner } = {}) {
	if (!owner) return null;
	const nextRole = resolveRevokedOwnerRole(owner.role);
	return nextRole === owner.role ? null : { id: owner.id, role: nextRole };
}

export function createAdminStoreWhere({ q, status, active } = {}) {
	const where = {};
	if (status && allowedStoreStatuses.has(status)) {
		where.status = status;
	}
	if (active === "true") where.isActive = true;
	if (active === "false") where.isActive = false;

	const query = String(q || "").trim();
	if (query) {
		where.OR = [
			{ name: { contains: query, mode: "insensitive" } },
			{ username: { contains: query, mode: "insensitive" } },
			{ email: { contains: query, mode: "insensitive" } },
			{ contact: { contains: query, mode: "insensitive" } },
			{ user: { email: { contains: query, mode: "insensitive" } } },
			{ user: { name: { contains: query, mode: "insensitive" } } },
		];
	}

	return where;
}

export function buildAdminStorePagination({ page, limit } = {}, total = 0) {
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

export function resolveStoreWriteError(error) {
	if (error?.code !== "P2002") return null;

	const target = Array.isArray(error.meta?.target)
		? error.meta.target
		: [String(error.meta?.target || "")];
	if (target.includes("username")) {
		return { message: "Store username already exists", status: 409 };
	}
	if (target.includes("userId")) {
		return { message: "Owner already has a store", status: 409 };
	}

	return { message: "Store already exists", status: 409 };
}

export function normalizeStoreStaffPayload(body = {}) {
	const userEmail = String(body.userEmail || "").trim().toLowerCase();
	if (!userEmail) throw new Error("Staff email is required");

	const role = body.role || "staff";
	if (!allowedStaffRoles.has(role)) throw new Error("Invalid staff role");

	return {
		userEmail,
		data: {
			role,
			isActive: body.isActive === undefined ? true : Boolean(body.isActive),
		},
	};
}

export function normalizeStoreStaffPatchPayload(body = {}) {
	const data = {};
	if (body.role !== undefined) {
		if (!allowedStaffRoles.has(body.role)) throw new Error("Invalid staff role");
		data.role = body.role;
	}
	if (body.isActive !== undefined) {
		data.isActive = Boolean(body.isActive);
	}
	if (Object.keys(data).length === 0) {
		throw new Error("No staff fields to update");
	}
	return data;
}

export function resolveStoreStaffWriteError(error) {
	if (error?.code === "P2002") {
		return { message: "User is already staff for this store", status: 409 };
	}
	if (error?.code === "P2025") {
		return { message: "Store staff member not found", status: 404 };
	}
	return null;
}
