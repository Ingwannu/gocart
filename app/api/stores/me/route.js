import { json, jsonError, recordAuditLog, requireUser } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	canAccessStoreManagement,
	canEditStoreProfile,
	createStoreManagementPermissions,
	normalizeSellerStoreProfilePayload,
	sanitizeStoreManagementStore,
} from "@/lib/store-access.mjs";

function parseManagedStore(user, store) {
	const safeStore = sanitizeStoreManagementStore(store);
	return safeStore
		? {
				...safeStore,
				permissions: createStoreManagementPermissions(user, store),
			}
		: safeStore;
}

export async function GET() {
	const { user, error } = await requireUser();
	if (error) return error;

	const store = await prisma.store.findUnique({
		where: { userId: user.id },
		include: { user: true, staffMembers: true },
	}) || await prisma.store.findFirst({
		where: { staffMembers: { some: { userId: user.id, isActive: true } } },
		include: { user: true, staffMembers: true },
	});

	if (!canAccessStoreManagement(user, store)) {
		return json({ store: null });
	}

	return json({ store: parseManagedStore(user, store) });
}

export async function PATCH(request) {
	const { user, error } = await requireUser();
	if (error) return error;

	const store = await prisma.store.findUnique({
		where: { userId: user.id },
		include: { user: true, staffMembers: true },
	}) || await prisma.store.findFirst({
		where: { staffMembers: { some: { userId: user.id, isActive: true } } },
		include: { user: true, staffMembers: true },
	});

	if (!canAccessStoreManagement(user, store)) {
		return jsonError("Seller store is not active", 403);
	}
	if (!canEditStoreProfile(user, store)) {
		return jsonError("Store manager permission is required", 403);
	}

	const body = await request.json();
	let data;
	try {
		data = normalizeSellerStoreProfilePayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const updated = await prisma.$transaction(async (tx) => {
		const nextStore = await tx.store.update({
			where: { id: store.id },
			data,
			include: { user: true, staffMembers: true },
		});
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "STORE_PROFILE_UPDATED",
			targetType: "store",
			targetId: store.id,
			summary: `Updated store profile ${nextStore.name}`,
			metadata: {
				name: nextStore.name,
				username: nextStore.username,
				fields: Object.keys(data),
				actorRole: user.role,
			},
		});
		return nextStore;
	});

	return json({ store: parseManagedStore(user, updated) });
}
