import { json, jsonError, parseProduct, recordAuditLog, requireUser } from "@/lib/api";
import {
	normalizeProductImages,
	normalizeProductStockQuantity,
	normalizeProductTextField,
} from "@/lib/product-edit-form.mjs";
import { normalizeProductDeliveryFields } from "@/lib/digital-product.mjs";
import { createPublicProductDetailWhere } from "@/lib/product-list.mjs";
import prisma from "@/lib/prisma";
import { canManageStoreProducts } from "@/lib/store-access.mjs";

async function canManageProduct(user, productId) {
	const product = await prisma.product.findUnique({
		where: { id: productId },
		include: { store: { include: { user: true, staffMembers: true } } },
	});

	if (!product) return { error: jsonError("Product not found", 404) };
	const sellerCanManage = canManageStoreProducts(user, product.store);
	if (user.role === "admin" || sellerCanManage) {
		return { product };
	}

	return { error: jsonError("Forbidden", 403) };
}

export async function GET(_request, { params }) {
	const { productId } = await params;
	const product = await prisma.product.findFirst({
		where: createPublicProductDetailWhere(productId),
		include: {
			store: true,
			group: true,
			rating: { include: { user: true } },
		},
	});

	if (!product) return jsonError("Product not found", 404);
	return json({ product: parseProduct(product) });
}

export async function PATCH(request, { params }) {
	const { productId } = await params;
	const { user, error } = await requireUser();
	if (error) return error;

	const managed = await canManageProduct(user, productId);
	if (managed.error) return managed.error;

	const body = await request.json();
	const data = {};

	for (const field of ["name", "description", "category"]) {
		if (body[field] !== undefined) {
			try {
				data[field] = normalizeProductTextField(field, body[field]);
			} catch (error) {
				return jsonError(error.message);
			}
		}
	}
	if (body.groupId !== undefined) {
		const groupId = String(body.groupId || "").trim();
		if (!groupId) {
			data.groupId = null;
		} else {
			const group = await prisma.productGroup.findFirst({
				where: { id: groupId, isActive: true },
			});
			if (!group) return jsonError("Product group not found", 404);
			data.groupId = group.id;
			if (body.category === undefined) data.category = group.name;
		}
	}
	for (const field of ["mrp", "price"]) {
		if (body[field] !== undefined) data[field] = Number(body[field]);
	}
	if (body.inStock !== undefined) data.inStock = Boolean(body.inStock);
	if (body.isFeatured !== undefined) {
		if (user.role !== "admin") {
			return jsonError("Admin permission is required", 403);
		}
		data.isFeatured = Boolean(body.isFeatured);
	}
	if (body.stockQuantity !== undefined) {
		try {
			data.stockQuantity = normalizeProductStockQuantity(body.stockQuantity);
		} catch (error) {
			return jsonError(error.message);
		}
		if (data.stockQuantity === 0) data.inStock = false;
		if (data.stockQuantity > 0 && body.inStock === undefined) data.inStock = true;
	}
	if (
		body.deliveryType !== undefined ||
		body.digitalAssetUrl !== undefined ||
		body.digitalAssetName !== undefined
	) {
		try {
			const delivery = normalizeProductDeliveryFields({
				deliveryType: body.deliveryType ?? managed.product.deliveryType,
				digitalAssetUrl: body.digitalAssetUrl ?? managed.product.digitalAssetUrl,
				digitalAssetName: body.digitalAssetName ?? managed.product.digitalAssetName,
			});
			Object.assign(data, delivery);
			if (delivery.deliveryType === "digital") {
				data.stockQuantity = null;
				if (body.inStock === undefined) data.inStock = true;
			}
		} catch (error) {
			return jsonError(error.message);
		}
	}
	if (Array.isArray(body.images)) {
		const images = normalizeProductImages(body.images);
		if (!images.length) return jsonError("Missing required product fields");
		data.images = JSON.stringify(images);
	}
	const nextMrp = data.mrp ?? managed.product.mrp;
	const nextPrice = data.price ?? managed.product.price;
	if (
		!Number.isFinite(nextMrp) ||
		!Number.isFinite(nextPrice) ||
		nextMrp <= 0 ||
		nextPrice <= 0 ||
		nextPrice > nextMrp
	) {
		return jsonError("Invalid product pricing");
	}

	const product = await prisma.$transaction(async (tx) => {
		const updated = await tx.product.update({
			where: { id: productId },
			data,
			include: {
				store: true,
				group: true,
				rating: { include: { user: true } },
			},
		});
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_UPDATED",
			targetType: "product",
			targetId: updated.id,
			summary: `Updated product ${updated.name}`,
			metadata: {
				name: updated.name,
				storeId: updated.storeId,
				fields: Object.keys(data),
				actorRole: user.role,
			},
		});
		return updated;
	});

	return json({ product: parseProduct(product, { includeDigitalAsset: true }) });
}

export async function DELETE(_request, { params }) {
	const { productId } = await params;
	const { user, error } = await requireUser();
	if (error) return error;

	const managed = await canManageProduct(user, productId);
	if (managed.error) return managed.error;

	const orderItemCount = await prisma.orderItem.count({ where: { productId } });
	if (orderItemCount > 0) {
		await prisma.$transaction(async (tx) => {
			await tx.product.update({
				where: { id: productId },
				data: { isArchived: true, inStock: false },
			});
			await recordAuditLog(tx, {
				actorId: user.id,
				action: "PRODUCT_ARCHIVED",
				targetType: "product",
				targetId: productId,
				summary: `Archived product ${managed.product.name}`,
				metadata: {
					name: managed.product.name,
					storeId: managed.product.storeId,
					orderItemCount,
					actorRole: user.role,
				},
			});
		});
		return json({ ok: true, archived: true });
	}

	await prisma.$transaction(async (tx) => {
		await tx.product.delete({ where: { id: productId } });
		await recordAuditLog(tx, {
			actorId: user.id,
			action: "PRODUCT_DELETED",
			targetType: "product",
			targetId: productId,
			summary: `Deleted product ${managed.product.name}`,
			metadata: {
				name: managed.product.name,
				storeId: managed.product.storeId,
				actorRole: user.role,
			},
		});
	});
	return json({ ok: true, archived: false });
}
