import { json, jsonError, parseStore, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeStoreStaffPayload,
	resolveStoreStaffGrantBlock,
	resolveStoreStaffWriteError,
} from "@/lib/store-admin.mjs";

export async function GET(_request, { params }) {
	const { error } = await requireAdmin();
	if (error) return error;

	const { storeId } = await params;
	const store = await prisma.store.findUnique({
		where: { id: storeId },
		include: { user: true, staffMembers: { include: { user: true } } },
	});
	if (!store) return jsonError("Store not found", 404);

	return json({ store: parseStore(store), staff: parseStore(store).staffMembers });
}

export async function POST(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { storeId } = await params;
	const body = await request.json();
	let payload;
	try {
		payload = normalizeStoreStaffPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	const store = await prisma.store.findUnique({
		where: { id: storeId },
		include: { user: true },
	});
	if (!store) return jsonError("Store not found", 404);

	const staffUser = await prisma.user.findUnique({
		where: { email: payload.userEmail },
	});
	if (!staffUser) return jsonError("Staff user not found", 404);
	const staffBlock = resolveStoreStaffGrantBlock(staffUser);
	if (staffBlock) return jsonError(staffBlock.message, staffBlock.status);
	if (staffUser.id === store.userId) {
		return jsonError("Store owner already has access", 409);
	}

	let staff;
	try {
		staff = await prisma.$transaction(async (tx) => {
			const created = await tx.storeStaff.create({
				data: {
					storeId,
					userId: staffUser.id,
					...payload.data,
				},
				include: { user: true },
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_STAFF_GRANTED",
				targetType: "storeStaff",
				targetId: created.id,
				summary: `Granted store staff access to ${staffUser.email}`,
				metadata: {
					storeId,
					staffEmail: staffUser.email,
					role: created.role,
					isActive: created.isActive,
				},
			});
			return created;
		});
	} catch (error) {
		const writeError = resolveStoreStaffWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json(
		{ staff: parseStore({ staffMembers: [staff] }).staffMembers[0] },
		{ status: 201 },
	);
}
