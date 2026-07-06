import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { normalizeAuditLogPayload } from "@/lib/admin-audit-log.mjs";
import {
	resolveStoreManagementActor,
	resolveStoreManagementBlock,
} from "@/lib/store-access.mjs";
import { resolveCurrentSessionUser } from "@/lib/session-user.mjs";
import { resolveProductImages } from "@/lib/product-image.mjs";
import { serializeProductDigitalFields } from "@/lib/digital-product.mjs";

export async function getSessionUser() {
	const session = await getServerSession(authOptions);
	return session?.user || null;
}

export async function requireUser() {
	const sessionUser = await getSessionUser();
	if (!sessionUser?.id) {
		return { error: jsonError("Unauthorized", 401) };
	}

	const dbUser = await prisma.user.findUnique({
		where: { id: sessionUser.id },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			role: true,
			isSuspended: true,
		},
	});
	const user = resolveCurrentSessionUser(sessionUser, dbUser);
	if (!user) {
		return { error: jsonError("Unauthorized", 401) };
	}

	return { user };
}

export async function requireAdmin() {
	const { user, error } = await requireUser();
	if (error) return { error };
	if (user.role !== "admin") {
		return { error: jsonError("Forbidden", 403) };
	}
	return { user };
}

export async function requireSellerStore() {
	const { user, error } = await requireUser();
	if (error) return { error };

	const store =
		(await prisma.store.findUnique({
			where: { userId: user.id },
			include: { user: true, staffMembers: true },
		})) ||
		(await prisma.store.findFirst({
			where: { staffMembers: { some: { userId: user.id, isActive: true } } },
			include: { user: true, staffMembers: true },
		}));

	const block = resolveStoreManagementBlock(user, store);
	if (block) return { error: jsonError(block.message, block.status) };

	return { user: resolveStoreManagementActor(user, store), store };
}

export function json(data, init) {
	return NextResponse.json(data, init);
}

export function jsonError(message, status = 400) {
	return NextResponse.json({ error: message }, { status });
}

export function parseJsonField(value, fallback) {
	if (!value) return fallback;
	if (typeof value !== "string") return value;

	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

export function sanitizeUser(user) {
	if (!user) return user;
	const { password: _password, cart: _cart, ...safeUser } = user;
	return safeUser;
}

export function parseAuditLog(log) {
	if (!log) return null;

	return {
		...log,
		actor: sanitizeUser(log.actor),
		metadata: parseJsonField(log.metadata, {}),
	};
}

export async function recordAuditLog(tx, payload) {
	const client = tx || prisma;
	return client.adminAuditLog.create({
		data: normalizeAuditLogPayload(payload),
	});
}

export function parseStore(store) {
	if (!store) return null;

	return {
		...store,
		user: sanitizeUser(store.user),
		staffMembers: (store.staffMembers || []).map((member) => ({
			...member,
			user: sanitizeUser(member.user),
		})),
	};
}

export function parseRating(rating) {
	if (!rating) return null;

	return {
		...rating,
		user: sanitizeUser(rating.user),
		product: rating.product ? parseProduct(rating.product) : rating.product,
	};
}

export function parseReturnRequest(request) {
	if (!request) return null;

	return {
		...request,
		user: sanitizeUser(request.user),
		order: request.order ? parseOrder(request.order) : request.order,
	};
}

export function parseInventoryAdjustment(adjustment) {
	if (!adjustment) return null;

	return {
		...adjustment,
		actor: sanitizeUser(adjustment.actor),
	};
}

export function parseProduct(product, options = {}) {
	if (!product) return null;
	const { digitalAssetUrl: _digitalAssetUrl, ...safeProduct } = product;

	return {
		...safeProduct,
		...serializeProductDigitalFields(product, options),
		images: resolveProductImages(parseJsonField(product.images, [])),
		store: parseStore(product.store),
		group: product.group || null,
		rating: (product.rating || product.ratings || []).map(parseRating),
	};
}

export function parseOrder(order) {
	if (!order) return null;

	return {
		...order,
		user: sanitizeUser(order.user),
		store: parseStore(order.store),
		coupon: parseJsonField(order.coupon, null),
		returnRequest: parseReturnRequest(order.returnRequest),
		licenseKeys:
			order.licenseKeys?.map((license) => ({
				id: license.id,
				key: license.key,
				productId: license.productId,
				status: license.status,
				boundInstanceId: license.boundInstanceId || "",
				revokedAt: license.revokedAt,
			})) || undefined,
		orderItems:
			order.orderItems?.map((item) => ({
				...item,
				product: parseProduct(item.product),
			})) || [],
	};
}

export function normalizeAmount(value) {
	const amount = Number(value);
	return Number.isFinite(amount) ? amount : 0;
}
