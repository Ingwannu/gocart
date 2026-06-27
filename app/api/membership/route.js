import {
	json,
	jsonError,
	recordAuditLog,
	requireUser,
	sanitizeUser,
} from "@/lib/api";
import {
	createMembershipUpgradeAuditPayload,
	createMembershipUpgradeData,
} from "@/lib/membership.mjs";
import prisma from "@/lib/prisma";

export async function POST() {
	const { user, error } = await requireUser();
	if (error) return error;

	const existing = await prisma.user.findUnique({ where: { id: user.id } });
	if (!existing || existing.isSuspended) return jsonError("Unauthorized", 401);

	const upgrade = createMembershipUpgradeData(existing);
	if (!upgrade.upgraded) {
		return json({ user: sanitizeUser(existing), upgraded: false });
	}

	const updated = await prisma.$transaction(async (tx) => {
		const account = await tx.user.update({
			where: { id: user.id },
			data: upgrade.data,
		});
		await recordAuditLog(tx, createMembershipUpgradeAuditPayload({ user: account }));
		return account;
	});

	return json({ user: sanitizeUser(updated), upgraded: true });
}
