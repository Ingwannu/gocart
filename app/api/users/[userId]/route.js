import bcrypt from "bcryptjs";
import {
	json,
	jsonError,
	recordAuditLog,
	requireAdmin,
	sanitizeUser,
} from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	createUserRoleChangeStoreUpdate,
	normalizeAdminUserPatchPayload,
	resolveAdminUserPatchBlock,
	resolveAdminUserDeleteBlock,
	resolveUserWriteError,
} from "@/lib/user-admin.mjs";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { userId } = await params;
	const body = await request.json();
	let data;
	try {
		data = normalizeAdminUserPatchPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}
	if (data.password) data.password = await bcrypt.hash(data.password, 10);
	if (admin.id === userId && data.role && data.role !== "admin") {
		return jsonError("You cannot remove your own admin role", 403);
	}
	const block = resolveAdminUserPatchBlock({
		isSelf: admin.id === userId,
		nextIsSuspended: data.isSuspended,
	});
	if (block) return jsonError(block.message, block.status);

	let user;
	try {
		user = await prisma.$transaction(async (tx) => {
			const existing = await tx.user.findUnique({
				where: { id: userId },
				include: { store: true },
			});
			if (!existing) return null;

			const storeUpdate = createUserRoleChangeStoreUpdate({
				nextRole: data.role,
				store: existing.store,
			});
			if (storeUpdate) {
				await tx.store.update({
					where: { id: storeUpdate.id },
					data: { isActive: storeUpdate.isActive },
				});
			}

			const updated = await tx.user.update({
				where: { id: userId },
				data,
				include: { store: true },
			});

			await recordAuditLog(tx, {
				actorId: admin.id,
				action:
					data.isSuspended === true
						? "USER_SUSPENDED"
						: data.isSuspended === false
							? "USER_RESTORED"
							: "USER_UPDATED",
				targetType: "user",
				targetId: updated.id,
				summary: `Updated user ${updated.email}`,
				metadata: {
					email: updated.email,
					role: updated.role,
					isSuspended: updated.isSuspended,
					fields: Object.keys(data).filter((field) => field !== "password"),
					passwordChanged: Boolean(data.password),
				},
			});
			return updated;
		});
	} catch (error) {
		const writeError = resolveUserWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
	if (!user) return jsonError("User not found", 404);

	return json({ user: sanitizeUser(user) });
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { userId } = await params;
	const [
		targetUser,
		store,
		buyerOrderCount,
		payoutEventCount,
		auditLogCount,
		inventoryAdjustmentCount,
	] = await Promise.all([
			prisma.user.findUnique({
				where: { id: userId },
				select: { id: true, email: true },
			}),
			prisma.store.findUnique({ where: { userId }, select: { id: true } }),
			prisma.order.count({ where: { userId } }),
			prisma.payoutEvent.count({ where: { adminId: userId } }),
			prisma.adminAuditLog.count({ where: { actorId: userId } }),
			prisma.inventoryAdjustment.count({ where: { actorId: userId } }),
		]);
	if (!targetUser) return jsonError("User not found", 404);

	const block = resolveAdminUserDeleteBlock({
		isSelf: admin.id === userId,
		ownsStore: Boolean(store),
		buyerOrderCount,
		payoutEventCount,
		auditLogCount,
		inventoryAdjustmentCount,
	});
	if (block) return jsonError(block.message, block.status);

	await prisma.$transaction(async (tx) => {
		await tx.user.delete({ where: { id: userId } });
		await recordAuditLog(tx, {
			actorId: admin.id,
			action: "USER_DELETED",
			targetType: "user",
			targetId: targetUser.id,
			summary: `Deleted user ${targetUser.email}`,
			metadata: { email: targetUser.email },
		});
	});
	return json({ ok: true });
}
