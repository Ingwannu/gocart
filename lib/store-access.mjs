const storeManagementRoles = new Set(["seller", "member", "admin"]);
const staffOperatorRoles = new Set(["staff", "manager"]);

export function canAccessStoreManagement(user, store) {
	if (!user || !store || store.status !== "approved" || !store.isActive) {
		return false;
	}
	if (user.role === "admin") return true;
	if (store.userId === user.id && storeManagementRoles.has(user.role)) {
		return true;
	}
	if (
		(store.staffMembers || []).some(
			(member) => member.userId === user.id && member.isActive,
		)
	) {
		return true;
	}
	return false;
}

function hasStoreOwnerAccess(user, store) {
	return Boolean(
		user &&
			store &&
			(user.role === "admin" ||
				(store.userId === user.id && storeManagementRoles.has(user.role))),
	);
}

function hasActiveStaffRole(user, store, roles) {
	return Boolean(
		user &&
			(store?.staffMembers || []).some(
				(member) =>
					member.userId === user.id &&
					member.isActive &&
					roles.has(member.role),
			),
	);
}

export function canManageStoreProducts(user, store) {
	if (!canAccessStoreManagement(user, store)) return false;
	if (hasStoreOwnerAccess(user, store)) return true;
	return hasActiveStaffRole(user, store, staffOperatorRoles);
}

export function canManageStoreOrders(user, store) {
	return canManageStoreProducts(user, store);
}

export function canManageStoreQuestions(user, store) {
	return canManageStoreProducts(user, store);
}

export function canUploadStoreAssets(user, store) {
	return canManageStoreProducts(user, store);
}

export function canEditStoreProfile(user, store) {
	if (!canAccessStoreManagement(user, store)) return false;
	if (hasStoreOwnerAccess(user, store)) return true;
	return hasActiveStaffRole(user, store, new Set(["manager"]));
}

export function createStoreManagementPermissions(user, store) {
	return {
		canAccessStore: canAccessStoreManagement(user, store),
		canEditProfile: canEditStoreProfile(user, store),
		canManageProducts: canManageStoreProducts(user, store),
		canManageOrders: canManageStoreOrders(user, store),
		canManageQuestions: canManageStoreQuestions(user, store),
		canUploadAssets: canUploadStoreAssets(user, store),
	};
}

export function resolveStoreManagementBlock(user, store) {
	if (!store || store.status !== "approved" || !store.isActive) {
		return { message: "Seller store is not active", status: 403 };
	}
	if (!storeManagementRoles.has(user?.role)) {
		const isActiveStaff = (store.staffMembers || []).some(
			(member) => member.userId === user?.id && member.isActive,
		);
		if (!isActiveStaff) {
			return { message: "Seller permission is required", status: 403 };
		}
	}
	return null;
}

export function resolveStoreManagementActor(user) {
	return user;
}

export function sanitizeStoreManagementStore(store) {
	if (!store) return null;
	if (!store.user) return store;

	const { password: _password, cart: _cart, ...safeUser } = store.user;
	return {
		...store,
		user: safeUser,
		staffMembers: (store.staffMembers || []).map((member) => ({
			...member,
			user: member.user
				? (() => {
						const { password: _staffPassword, cart: _staffCart, ...safeStaff } =
							member.user;
						return safeStaff;
					})()
				: member.user,
		})),
	};
}

function normalizeOptionalText(value) {
	return String(value || "").trim();
}

function normalizeRequiredText(value, message) {
	const normalized = normalizeOptionalText(value);
	if (!normalized) throw new Error(message);
	return normalized;
}

export function normalizeSellerStoreProfilePayload(body = {}) {
	const data = {};
	if (body.name !== undefined) {
		data.name = normalizeRequiredText(body.name, "Store name is required");
	}
	if (body.description !== undefined) {
		data.description = normalizeOptionalText(body.description);
	}
	if (body.email !== undefined) {
		data.email = normalizeRequiredText(body.email, "Store email is required");
	}
	if (body.contact !== undefined) {
		data.contact = normalizeRequiredText(body.contact, "Store contact is required");
	}
	if (body.address !== undefined) {
		data.address = normalizeRequiredText(body.address, "Store address is required");
	}
	if (body.logo !== undefined) {
		data.logo = normalizeOptionalText(body.logo);
	}
	return data;
}
