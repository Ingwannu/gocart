import { randomBytes } from "node:crypto";
import { isDigitalProduct } from "./digital-product.mjs";

// Lazy-load Prisma so pure helpers (e.g. resolveLicenseValidation) stay
// testable without a database connection.
let _prismaPromise;
function getPrisma(tx) {
	if (tx) return tx;
	if (!_prismaPromise) {
		_prismaPromise = import("./prisma.js").then((m) => m.default);
	}
	return _prismaPromise;
}

// Crockford-style alphabet without lookalikes (0/O, 1/I/L) so keys survive
// being read aloud or retyped from a screenshot.
const KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const KEY_GROUPS = 4;
const KEY_GROUP_LENGTH = 5;
export const LICENSE_KEY_PREFIX = "WS";

export const LICENSE_STATUS_ACTIVE = "ACTIVE";
export const LICENSE_STATUS_REVOKED = "REVOKED";

// Instance ids are caller-defined (Discord guild id, server IP, machine hash);
// cap the length so hostile clients cannot store arbitrary blobs.
const MAX_INSTANCE_ID_LENGTH = 190;

export function generateLicenseKey() {
	const groups = [];
	for (let g = 0; g < KEY_GROUPS; g += 1) {
		const bytes = randomBytes(KEY_GROUP_LENGTH);
		let group = "";
		for (let i = 0; i < KEY_GROUP_LENGTH; i += 1) {
			group += KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length];
		}
		groups.push(group);
	}
	return `${LICENSE_KEY_PREFIX}-${groups.join("-")}`;
}

export function isLicenseKeyFormat(value) {
	const key = String(value || "").trim().toUpperCase();
	const group = `[${KEY_ALPHABET}]{${KEY_GROUP_LENGTH}}`;
	const pattern = new RegExp(
		`^${LICENSE_KEY_PREFIX}(-${group}){${KEY_GROUPS}}$`,
	);
	return pattern.test(key);
}

export function normalizeLicenseKeyInput(value) {
	return String(value || "").trim().toUpperCase();
}

export function normalizeInstanceId(value) {
	return String(value || "").trim().slice(0, MAX_INSTANCE_ID_LENGTH);
}

/**
 * Find order items that should receive a license key. Digital products on a
 * paid order qualify; unlike download grants a license does not require an
 * uploaded asset (a product can be delivered out-of-band but still licensed).
 */
export function collectLicenseItems(order) {
	if (!order?.isPaid) return [];
	const items = order.orderItems || [];
	const seen = new Set();
	const licenseItems = [];
	for (const item of items) {
		const productId = item.productId || item.product?.id;
		if (!productId || seen.has(productId)) continue;
		if (!isDigitalProduct(item.product || {})) continue;
		seen.add(productId);
		licenseItems.push({ productId });
	}
	return licenseItems;
}

/**
 * Create license keys for every digital product in a paid order. Idempotent:
 * re-running on an already-licensed order only fills gaps for new items.
 */
export async function ensureOrderLicenseKeys(order, tx) {
	const client = await getPrisma(tx);
	const licenseItems = collectLicenseItems(order);
	if (!licenseItems.length) return [];

	const existing = await client.licenseKey.findMany({
		where: { orderId: order.id },
		select: { productId: true },
	});
	const existingProducts = new Set(existing.map((l) => l.productId));

	const created = [];
	for (const item of licenseItems) {
		if (existingProducts.has(item.productId)) continue;
		const license = await client.licenseKey.create({
			data: {
				key: generateLicenseKey(),
				orderId: order.id,
				productId: item.productId,
				userId: order.userId,
			},
		});
		created.push(license);
	}
	return created;
}

/**
 * Pure decision core for license validation, separated from Prisma so it can
 * be unit-tested. Returns { ok, reason?, bind? } where `bind` is the instance
 * id that should be persisted onto a previously unbound license.
 */
export function resolveLicenseValidation({
	license,
	productId = "",
	instanceId = "",
} = {}) {
	if (!license) return { ok: false, reason: "unknown_key" };
	if (license.revokedAt || license.status !== LICENSE_STATUS_ACTIVE) {
		return { ok: false, reason: "revoked" };
	}
	if (license.order && !license.order.isPaid) {
		return { ok: false, reason: "unpaid" };
	}
	const requestedProduct = String(productId || "").trim();
	if (requestedProduct && license.productId !== requestedProduct) {
		return { ok: false, reason: "product_mismatch" };
	}
	const normalizedInstance = normalizeInstanceId(instanceId);
	if (license.boundInstanceId) {
		if (normalizedInstance && normalizedInstance !== license.boundInstanceId) {
			return { ok: false, reason: "instance_mismatch" };
		}
		return { ok: true };
	}
	if (normalizedInstance) {
		return { ok: true, bind: normalizedInstance };
	}
	return { ok: true };
}

/**
 * Validate a license key against the database, binding it to the first
 * instance that presents itself. Returns { ok, reason?, license? } with a
 * serializable license snapshot on success.
 */
export async function validateLicenseKey({ key, productId, instanceId }, tx) {
	const client = await getPrisma(tx);
	const normalizedKey = normalizeLicenseKeyInput(key);
	if (!isLicenseKeyFormat(normalizedKey)) {
		return { ok: false, reason: "unknown_key" };
	}

	let license = await client.licenseKey.findUnique({
		where: { key: normalizedKey },
		include: { product: true, order: true },
	});
	let result = resolveLicenseValidation({ license, productId, instanceId });

	if (result.ok && result.bind) {
		// Guarded bind: only claim the license while it is still unbound so two
		// racing instances cannot both bind. The loser re-resolves and fails
		// with instance_mismatch.
		const bound = await client.licenseKey.updateMany({
			where: { id: license.id, boundInstanceId: "" },
			data: { boundInstanceId: result.bind, boundAt: new Date() },
		});
		if (bound.count === 0) {
			license = await client.licenseKey.findUnique({
				where: { key: normalizedKey },
				include: { product: true, order: true },
			});
			result = resolveLicenseValidation({ license, productId, instanceId });
		} else {
			license = { ...license, boundInstanceId: result.bind };
		}
	}

	if (!result.ok) return { ok: false, reason: result.reason };

	await client.licenseKey.update({
		where: { id: license.id },
		data: {
			lastValidatedAt: new Date(),
			validationCount: { increment: 1 },
		},
	});

	return { ok: true, license: serializeLicenseKey(license) };
}

export function serializeLicenseKey(license) {
	if (!license) return null;
	return {
		id: license.id,
		key: license.key,
		productId: license.productId,
		productName: license.product?.name || "",
		status: license.status,
		boundInstanceId: license.boundInstanceId || "",
		boundAt: license.boundAt,
		revokedAt: license.revokedAt,
		createdAt: license.createdAt,
	};
}

export async function getLicenseKeysForOrder(orderId, tx) {
	const client = await getPrisma(tx);
	return client.licenseKey.findMany({
		where: { orderId },
		include: { product: true },
		orderBy: { createdAt: "asc" },
	});
}

/**
 * Revoke every license key on an order. Used when the order is refunded or
 * cancelled; idempotent (already-revoked keys are left untouched).
 */
export async function revokeOrderLicenseKeys(orderId, tx) {
	const client = await getPrisma(tx);
	return client.licenseKey.updateMany({
		where: { orderId, revokedAt: null },
		data: { status: LICENSE_STATUS_REVOKED, revokedAt: new Date() },
	});
}

export async function revokeLicenseKey(licenseId, tx) {
	const client = await getPrisma(tx);
	const license = await client.licenseKey.findUnique({ where: { id: licenseId } });
	if (!license) return null;
	return client.licenseKey.update({
		where: { id: licenseId },
		data: { status: LICENSE_STATUS_REVOKED, revokedAt: new Date() },
	});
}

/**
 * Restore a revoked key (e.g. refund reversed) and optionally clear its
 * instance binding so the buyer can activate on a new server/machine.
 */
export async function restoreLicenseKey(licenseId, { unbind = false } = {}, tx) {
	const client = await getPrisma(tx);
	const license = await client.licenseKey.findUnique({ where: { id: licenseId } });
	if (!license) return null;
	return client.licenseKey.update({
		where: { id: licenseId },
		data: {
			status: LICENSE_STATUS_ACTIVE,
			revokedAt: null,
			...(unbind ? { boundInstanceId: "", boundAt: null } : {}),
		},
	});
}
