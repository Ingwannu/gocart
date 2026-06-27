export function createMembershipUpgradeData(user = {}) {
	if (user.role !== "user") {
		return { data: {}, upgraded: false };
	}

	return { data: { role: "member" }, upgraded: true };
}

export function createMembershipUpgradeAuditPayload({ user }) {
	return {
		actorId: user.id,
		action: "MEMBERSHIP_UPGRADED",
		targetType: "user",
		targetId: user.id,
		summary: `Upgraded ${user.email} to Plus membership`,
		metadata: { email: user.email, role: "member" },
	};
}
