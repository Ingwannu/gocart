import { json, jsonError, parseStore, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	createStoreRemovalRoleUpdate,
	createStoreOwnerTransferRoleUpdates,
	normalizeAdminStorePayload,
	resolveGrantedOwnerRole,
	resolveStoreOwnerGrantBlock,
	resolveStoreWriteError,
} from "@/lib/store-admin.mjs";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { storeId } = await params;
	const body = await request.json();
	const existingStore = await prisma.store.findUnique({
		where: { id: storeId },
		include: { user: true, staffMembers: { include: { user: true } } },
	});
	if (!existingStore) return jsonError("Store not found", 404);

	let payload;
	try {
		payload = normalizeAdminStorePayload(body, existingStore);
	} catch (error) {
		return jsonError(error.message);
	}

	let nextOwner = null;
	if (payload.userEmail && payload.userEmail !== existingStore.user.email) {
		nextOwner = await prisma.user.findUnique({
			where: { email: payload.userEmail },
		});
		if (!nextOwner) return jsonError("Owner user not found", 404);
		const ownerBlock = resolveStoreOwnerGrantBlock(nextOwner);
		if (ownerBlock) return jsonError(ownerBlock.message, ownerBlock.status);

		const ownerStore = await prisma.store.findUnique({
			where: { userId: nextOwner.id },
		});
		if (ownerStore && ownerStore.id !== storeId) {
			return jsonError("Owner already has a store", 409);
		}
	}

	if (
		payload.data.username &&
		payload.data.username !== existingStore.username
	) {
		const usernameStore = await prisma.store.findUnique({
			where: { username: payload.data.username },
		});
		if (usernameStore && usernameStore.id !== storeId) {
			return jsonError("Store username already exists", 409);
		}
	}

	let store;
	try {
		store = await prisma.$transaction(async (tx) => {
			const updated = await tx.store.update({
				where: { id: storeId },
				data: {
					...payload.data,
					...(nextOwner ? { userId: nextOwner.id } : {}),
				},
				include: { user: true, staffMembers: { include: { user: true } } },
			});

			const roleUpdates = nextOwner
				? createStoreOwnerTransferRoleUpdates({
						previousOwner: existingStore.user,
						nextOwner,
					})
				: [
						{
							id: existingStore.user.id,
							role: resolveGrantedOwnerRole(existingStore.user.role),
						},
					].filter((entry) => entry.role !== existingStore.user.role);

			for (const roleUpdate of roleUpdates) {
				await tx.user.update({
					where: { id: roleUpdate.id },
					data: { role: roleUpdate.role },
				});
				if (updated.user.id === roleUpdate.id) {
					updated.user.role = roleUpdate.role;
				}
			}
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_UPDATED",
				targetType: "store",
				targetId: updated.id,
				summary: `Updated store ${updated.name}`,
				metadata: {
					name: updated.name,
					username: updated.username,
					ownerEmail: updated.user.email,
					status: updated.status,
					isActive: updated.isActive,
					fields: Object.keys(payload.data),
					ownerChanged: Boolean(nextOwner),
				},
			});

			return updated;
		});
	} catch (error) {
		const writeError = resolveStoreWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ store: parseStore(store) });
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { storeId } = await params;
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		include: { user: true, staffMembers: { include: { user: true } } },
	});
	if (!store) return jsonError("Store not found", 404);

	const orderCount = await prisma.order.count({ where: { storeId } });
	const result = await prisma.$transaction(async (tx) => {
		const ownerRoleUpdate = createStoreRemovalRoleUpdate({ owner: store.user });
		if (orderCount > 0) {
			const updated = await tx.store.update({
				where: { id: storeId },
				data: { status: "rejected", isActive: false },
				include: { user: true, staffMembers: { include: { user: true } } },
			});
			await tx.product.updateMany({
				where: { storeId },
				data: { isArchived: true, inStock: false },
			});
			if (ownerRoleUpdate) {
				await tx.user.update({
					where: { id: ownerRoleUpdate.id },
					data: { role: ownerRoleUpdate.role },
				});
				updated.user.role = ownerRoleUpdate.role;
			}
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_ARCHIVED",
				targetType: "store",
				targetId: store.id,
				summary: `Archived store ${store.name}`,
				metadata: {
					name: store.name,
					username: store.username,
					ownerEmail: store.user.email,
					orderCount,
				},
			});
			return { archived: true, store: updated };
		}

		await tx.store.delete({ where: { id: storeId } });
		if (ownerRoleUpdate) {
			await tx.user.update({
				where: { id: ownerRoleUpdate.id },
				data: { role: ownerRoleUpdate.role },
			});
		}
		await recordAuditLog(tx, {
			actorId: admin.id,
			action: "STORE_DELETED",
			targetType: "store",
			targetId: store.id,
			summary: `Deleted store ${store.name}`,
			metadata: {
				name: store.name,
				username: store.username,
				ownerEmail: store.user.email,
			},
		});
		return { archived: false };
	});

	return json({
		ok: true,
		archived: result.archived,
		store: result.store ? parseStore(result.store) : null,
	});
}
