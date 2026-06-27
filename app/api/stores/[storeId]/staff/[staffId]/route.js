import { json, jsonError, parseStore, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeStoreStaffPatchPayload,
	resolveStoreStaffWriteError,
} from "@/lib/store-admin.mjs";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { storeId, staffId } = await params;
	const body = await request.json();
	let data;
	try {
		data = normalizeStoreStaffPatchPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let staff;
	try {
		staff = await prisma.$transaction(async (tx) => {
			const updated = await tx.storeStaff.update({
				where: { id: staffId, storeId },
				data,
				include: { user: true },
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_STAFF_UPDATED",
				targetType: "storeStaff",
				targetId: updated.id,
				summary: `Updated store staff access for ${updated.user.email}`,
				metadata: {
					storeId,
					staffEmail: updated.user.email,
					role: updated.role,
					isActive: updated.isActive,
				},
			});
			return updated;
		});
	} catch (error) {
		const writeError = resolveStoreStaffWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ staff: parseStore({ staffMembers: [staff] }).staffMembers[0] });
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { storeId, staffId } = await params;
	let staff;
	try {
		staff = await prisma.$transaction(async (tx) => {
			const deleted = await tx.storeStaff.delete({
				where: { id: staffId, storeId },
				include: { user: true },
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "STORE_STAFF_REVOKED",
				targetType: "storeStaff",
				targetId: deleted.id,
				summary: `Revoked store staff access for ${deleted.user.email}`,
				metadata: {
					storeId,
					staffEmail: deleted.user.email,
					role: deleted.role,
				},
			});
			return deleted;
		});
	} catch (error) {
		const writeError = resolveStoreStaffWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ staffId: staff.id });
}
