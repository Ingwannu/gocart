export function resolveCurrentSessionUser(sessionUser, dbUser) {
	if (!sessionUser?.id || !dbUser?.id || sessionUser.id !== dbUser.id) {
		return null;
	}
	if (dbUser.isSuspended) return null;

	return {
		id: dbUser.id,
		name: dbUser.name,
		email: dbUser.email,
		image: dbUser.image,
		role: dbUser.role,
	};
}

export function applyCurrentSessionUser(session, token, dbUser) {
	const currentUser = resolveCurrentSessionUser(token, dbUser);
	return {
		...session,
		user: currentUser,
	};
}
