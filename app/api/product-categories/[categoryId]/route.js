import { json, jsonError, recordAuditLog, requireAdmin } from "@/lib/api";
import {
	normalizeProductCategoryPayload,
	resolveProductCategoryWriteError,
} from "@/lib/product-categories.mjs";
import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { categoryId } = await params;
	const existing = await prisma.productCategory.findUnique({
		where: { id: categoryId },
	});
	if (!existing) return jsonError("Category not found", 404);

	const body = await request.json();
	let data;
	try {
		data = normalizeProductCategoryPayload(body, existing);
	} catch (error) {
		return jsonError(error.message);
	}

	try {
		const category = await prisma.$transaction(async (tx) => {
			const updated = await tx.productCategory.update({
				where: { id: categoryId },
				data,
			});
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "CATEGORY_UPDATED",
				targetType: "product_category",
				targetId: updated.id,
				summary: `Updated product category ${updated.name}`,
				metadata: {
					name: updated.name,
					slug: updated.slug,
					fields: Object.keys(data),
				},
			});
			return updated;
		});
		return json({ category });
	} catch (error) {
		const writeError = resolveProductCategoryWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}

export async function DELETE(_request, { params }) {
	const { user: admin, error } = await requireAdmin();
	if (error) return error;

	const { categoryId } = await params;
	try {
		const existing = await prisma.productCategory.findUnique({
			where: { id: categoryId },
		});
		await prisma.$transaction(async (tx) => {
			await tx.productCategory.delete({ where: { id: categoryId } });
			await recordAuditLog(tx, {
				actorId: admin.id,
				action: "CATEGORY_DELETED",
				targetType: "product_category",
				targetId: categoryId,
				summary: `Deleted product category ${existing?.name || categoryId}`,
				metadata: { name: existing?.name || "", slug: existing?.slug || "" },
			});
		});
		return json({ ok: true });
	} catch (error) {
		const writeError = resolveProductCategoryWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}
}
