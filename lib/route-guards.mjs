import { canAccessStoreManagement } from "./store-access.mjs";

export function resolveAdminRouteRedirect(user) {
	if (!user?.id) return "/login?callbackUrl=/admin";
	return user.role === "admin" ? null : "/";
}

export function resolveStoreRouteRedirect(user, store) {
	if (!user?.id) return "/login?callbackUrl=/store";
	return canAccessStoreManagement(user, store) ? null : "/";
}
