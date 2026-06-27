import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import {
	normalizeAdminCouponPatchPayload,
	resolveCouponWriteError,
} from "@/lib/coupon-admin.mjs";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { code } = await params;
	const normalizedCode = code.toUpperCase();
	const body = await request.json();
	let data;
	try {
		data = normalizeAdminCouponPatchPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let coupon;
	try {
		coupon = await prisma.$transaction(async (tx) => {
			const updated = await tx.coupon.update({
				where: { code: normalizedCode },
				data,
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "COUPON_UPDATED",
				targetType: "coupon",
				targetId: normalizedCode,
				summary: `Updated coupon ${normalizedCode}`,
				metadata: {
					code: normalizedCode,
					discount: updated.discount,
					isPublic: updated.isPublic,
					fields: Object.keys(data),
				},
			});
			return updated;
		});
	} catch (error) {
		const writeError = resolveCouponWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ coupon });
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { code } = await params;
	const normalizedCode = code.toUpperCase();
	try {
		const existing = await prisma.coupon.findUnique({
			where: { code: normalizedCode },
		});
		await prisma.$transaction(async (tx) => {
			await tx.coupon.delete({
				where: { code: normalizedCode },
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "COUPON_DELETED",
				targetType: "coupon",
				targetId: normalizedCode,
				summary: `Deleted coupon ${normalizedCode}`,
				metadata: {
					code: normalizedCode,
					discount: existing?.discount || 0,
					isPublic: Boolean(existing?.isPublic),
				},
			});
		});
	} catch (error) {
		const writeError = resolveCouponWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({ ok: true });
}
