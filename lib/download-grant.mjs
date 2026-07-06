import { randomBytes } from "node:crypto";
import { isPrivateUploadUrl } from "./upload.mjs";
import { isDigitalProduct } from "./digital-product.mjs";

// Lazy-load Prisma so pure helpers (e.g. collectDigitalGrantItems) stay
// testable without a database connection.
let _prismaPromise;
function getPrisma(tx) {
	if (tx) return tx;
	if (!_prismaPromise) {
		_prismaPromise = import("./prisma.js").then((m) => m.default);
	}
	return _prismaPromise;
}


// Default download grant policy. Sellers can override per-grant via the admin
// or store order UI; these are the safe fallbacks when none is set.
export const DEFAULT_MAX_DOWNLOADS = 5;
export const DEFAULT_GRANT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

function generateToken() {
	return randomBytes(32).toString("hex");
}

/**
 * Find digital order items that should receive a download grant. Only paid
 * orders with digital products qualify. Returns a normalized list of
 * { productId, digitalAssetUrl, digitalAssetName }.
 */
export function collectDigitalGrantItems(order) {
	if (!order?.isPaid) return [];
	const items = order.orderItems || [];
	const seen = new Set();
	const digitalItems = [];
	for (const item of items) {
		const productId = item.productId || item.product?.id;
		if (!productId || seen.has(productId)) continue;
		const product = item.product || {};
		if (!isDigitalProduct(product)) continue;
		if (!isPrivateUploadUrl(product.digitalAssetUrl)) continue;
		seen.add(productId);
		digitalItems.push({
			productId,
			digitalAssetUrl: product.digitalAssetUrl,
			digitalAssetName: product.digitalAssetName || "",
		});
	}
	return digitalItems;
}

/**
 * Create download grants for every digital product in a paid order. Idempotent:
 * re-running on an already-granted order only fills gaps for new items. Returns
 * the created grant records.
 */
export async function ensureOrderDownloadGrants(order, tx) {
	const client = await getPrisma(tx);
	const digitalItems = collectDigitalGrantItems(order);
	if (!digitalItems.length) return [];

	const existing = await client.downloadGrant.findMany({
		where: { orderId: order.id },
		select: { productId: true },
	});
	const existingProducts = new Set(existing.map((g) => g.productId));
	const expiresAt = new Date(Date.now() + DEFAULT_GRANT_TTL_MS);

	const grants = [];
	for (const item of digitalItems) {
		if (existingProducts.has(item.productId)) continue;
		const grant = await client.downloadGrant.create({
			data: {
				token: generateToken(),
				orderId: order.id,
				productId: item.productId,
				userId: order.userId,
				maxDownloads: DEFAULT_MAX_DOWNLOADS,
				expiresAt,
			},
		});
		grants.push(grant);
	}
	return grants;
}

/**
 * Resolve a grant by token and verify it remains valid for download. On
 * success, atomically increments the download counter so concurrent requests
 * cannot blow past the cap. Returns { ok, grant } or { ok:false, error, status }.
 */
export async function consumeDownloadGrant(token, tx) {
	const client = await getPrisma(tx);
	const grant = await client.downloadGrant.findUnique({
		where: { token: String(token || "") },
		include: { product: true },
	});
	if (!grant) return { ok: false, error: "Download link is invalid", status: 404 };
	if (grant.revokedAt) {
		return { ok: false, error: "Download link has been revoked", status: 403 };
	}
	if (grant.expiresAt && grant.expiresAt.getTime() < Date.now()) {
		return { ok: false, error: "Download link has expired", status: 403 };
	}
	if (grant.downloadCount >= grant.maxDownloads) {
		return {
			ok: false,
			error: "Download limit reached. Request a new link from the seller.",
			status: 403,
		};
	}
	if (!isPrivateUploadUrl(grant.product?.digitalAssetUrl)) {
		return { ok: false, error: "Download file is not available", status: 404 };
	}

	let updated;
	try {
		updated = await client.downloadGrant.update({
			where: {
				id: grant.id,
				// Guard against races: only increment while under the cap.
				downloadCount: { lt: grant.maxDownloads },
			},
			data: { downloadCount: { increment: 1 } },
		});
	} catch (error) {
		if (error?.code === "P2025") {
			return {
				ok: false,
				error: "Download limit reached. Request a new link from the seller.",
				status: 403,
			};
		}
		throw error;
	}
	if (!updated) {
		return {
			ok: false,
			error: "Download limit reached. Request a new link from the seller.",
			status: 403,
		};
	}
	return { ok: true, grant: { ...grant, downloadCount: updated.downloadCount } };
}

/**
 * Peek at a grant without consuming it. Used by admin/store UI to show status.
 */
export async function getDownloadGrantsForOrder(orderId, tx) {
	const client = await getPrisma(tx);
	return client.downloadGrant.findMany({
		where: { orderId },
		include: { product: true },
		orderBy: { createdAt: "asc" },
	});
}

/**
 * Revoke a grant so it can no longer be used. Used when a buyer requests a
 * refund/dispute or a seller wants to invalidate a leaked link.
 */
export async function revokeDownloadGrant(grantId, tx) {
	const client = await getPrisma(tx);
	const grant = await client.downloadGrant.findUnique({
		where: { id: grantId },
	});
	if (!grant) return null;
	return client.downloadGrant.update({
		where: { id: grantId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

/**
 * Revoke every grant on an order. Used when the order is refunded or
 * cancelled; idempotent (already-revoked grants are left untouched).
 */
export async function revokeOrderDownloadGrants(orderId, tx) {
	const client = await getPrisma(tx);
	return client.downloadGrant.updateMany({
		where: { orderId, revokedAt: null },
		data: { revokedAt: new Date() },
	});
}

/**
 * Reissue a grant: reset download count and extend expiry. The token stays the
 * same so existing links sent to the buyer keep working.
 */
export async function reissueDownloadGrant(grantId, tx) {
	const client = await getPrisma(tx);
	const grant = await client.downloadGrant.findUnique({
		where: { id: grantId },
	});
	if (!grant) return null;
	const expiresAt = new Date(Date.now() + DEFAULT_GRANT_TTL_MS);
	return client.downloadGrant.update({
		where: { id: grantId },
		data: {
			downloadCount: 0,
			expiresAt,
			revokedAt: null,
		},
	});
}

/**
 * Look up a grant by token without consuming it. Used by the download endpoint
 * before deciding whether to presign (S3) or stream (local).
 */
export async function findDownloadGrantByToken(token, tx) {
	const client = await getPrisma(tx);
	return client.downloadGrant.findUnique({
		where: { token: String(token || "") },
		include: { product: true },
	});
}
