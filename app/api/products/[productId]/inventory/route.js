import {
	json,
	jsonError,
	parseInventoryAdjustment,
	parseProduct,
	recordAuditLog,
	requireUser,
} from "@/lib/api";
import {
	buildInventoryAdjustmentPagination,
	createInventoryUpdate,
	normalizeInventoryAdjustmentPayload,
	resolveInventoryWriteError,
} from "@/lib/inventory.mjs";
import prisma from "@/lib/prisma";
import { canManageStoreProducts } from "@/lib/store-access.mjs";

async function canManageInventory(user, productId) {
	const product = await prisma.product.findUnique({
		where: { id: productId },
		include: {
			store: { include: { user: true, staffMembers: true } },
			group: true,
			rating: { include: { user: true } },
		},
	});
	if (!product) return { error: jsonError("Product not found", 404) };
	if (user.role !== "admin" && !canManageStoreProducts(user, product.store)) {
		return { error: jsonError("Forbidden", 403) };
	}
	return { product };
}

export async function GET(request, { params }) {
	const { productId } = await params;
	const { user, error } = await requireUser();
	if (error) return error;

	const managed = await canManageInventory(user, productId);
	if (managed.error) return managed.error;

	const { searchParams } = new URL(request.url);
	const total = await prisma.inventoryAdjustment.count({ where: { productId } });
	const pagination = buildInventoryAdjustmentPagination(
		{
			page: searchParams.get("page"),
			limit: searchParams.get("limit"),
		},
		total,
	);
	const adjustments = await prisma.inventoryAdjustment.findMany({
		where: { productId },
		include: { actor: true },
		orderBy: { createdAt: "desc" },
		skip: pagination.skip,
		take: pagination.take,
	});

	return json({
		adjustments: adjustments.map(parseInventoryAdjustment),
		pagination,
	});
}

export async function POST(request, { params }) {
	const { productId } = await params;
	const { user, error } = await requireUser();
	if (error) return error;

	const managed = await canManageInventory(user, productId);
	if (managed.error) return managed.error;

	const body = await request.json();
	let payload;
	try {
		payload = normalizeInventoryAdjustmentPayload(body);
	} catch (error) {
		return jsonError(error.message);
	}

	let update;
	try {
		update = createInventoryUpdate({
			currentQuantity: managed.product.stockQuantity,
			payload,
		});
	} catch (error) {
		return jsonError(error.message);
	}

	let result;
	try {
		result = await prisma.$transaction(async (tx) => {
			const updatedProduct = await tx.product.update({
				where: { id: productId },
				data: update.productData,
				include: {
					store: true,
					group: true,
					rating: { include: { user: true } },
				},
			});
			const adjustment = await tx.inventoryAdjustment.create({
				data: {
					productId,
					actorId: user.id,
					delta: update.delta,
					previousQuantity: update.previousQuantity,
					nextQuantity: update.nextQuantity,
					reason: payload.reason,
				},
				include: { actor: true },
			});
			await recordAuditLog(tx, {
				actorId: user.id,
				action: "INVENTORY_ADJUSTED",
				targetType: "product",
				targetId: productId,
				summary: `Adjusted inventory for ${updatedProduct.name}`,
				metadata: {
					productId,
					productName: updatedProduct.name,
					mode: payload.mode,
					delta: update.delta,
					previousQuantity: update.previousQuantity,
					nextQuantity: update.nextQuantity,
					reason: payload.reason,
					actorRole: user.role,
				},
			});
			return { product: updatedProduct, adjustment };
		});
	} catch (error) {
		const writeError = resolveInventoryWriteError(error);
		if (writeError) return jsonError(writeError.message, writeError.status);
		throw error;
	}

	return json({
		product: parseProduct(result.product),
		adjustment: parseInventoryAdjustment(result.adjustment),
	});
}
