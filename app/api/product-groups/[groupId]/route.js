import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
	normalizeProductGroupPayload,
	resolveProductGroupWriteError,
} from "@/lib/product-groups.mjs";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { groupId } = await params;
	const existing = await prisma.productGroup.findUnique({ where: { id: groupId } });
	if (!existing) return jsonError("Group not found", 404);

	const body = await request.json();
	let data;
	try {
		data = normalizeProductGroupPayload(body, existing);
	} catch (error) {
		return jsonError(error.message);
	}

	try {
		const group = await prisma.$transaction(async (tx) => {
			const updated = await tx.productGroup.update({
				where: { id: groupId },
				data,
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "GROUP_UPDATED",
				targetType: "product_group",
				targetId: updated.id,
				summary: `Updated product group ${updated.name}`,
				metadata: {
					name: updated.name,
					slug: updated.slug,
					fields: Object.keys(data),
				},
			});
			return updated;
		});
		return json({ group });
	} catch (error) {
		const writeError = resolveProductGroupWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { groupId } = await params;
	try {
		const existing = await prisma.productGroup.findUnique({ where: { id: groupId } });
		await prisma.$transaction(async (tx) => {
			await tx.productGroup.delete({ where: { id: groupId } });
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "GROUP_DELETED",
				targetType: "product_group",
				targetId: groupId,
				summary: `Deleted product group ${existing?.name || groupId}`,
				metadata: { name: existing?.name || "", slug: existing?.slug || "" },
			});
		});
		return json({ ok: true });
	} catch (error) {
		const writeError = resolveProductGroupWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}
