import { json, jsonError } from "@/lib/api";
import { validateLicenseKey } from "@/lib/license-key.mjs";
import {
	getLicensePublicKeyBase64,
	signLicensePayload,
} from "@/lib/license-signing.mjs";

// Public endpoint: sold products (Discord bots, Minecraft plugins) call this
// at startup to check their license. No session auth — the key itself is the
// credential. Responses are Ed25519-signed when LICENSE_SIGNING_PRIVATE_KEY is
// configured so clients can reject spoofed license servers.

// Best-effort in-memory throttle to slow down key brute-forcing. Per-process
// only (resets on deploy), which is fine for a deterrent; the real defense is
// the 20^20 key space.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const requestCounts = new Map();

function isRateLimited(clientId) {
	const now = Date.now();
	const entry = requestCounts.get(clientId);
	if (!entry || now > entry.resetAt) {
		requestCounts.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		if (requestCounts.size > 10_000) {
			for (const [key, value] of requestCounts) {
				if (now > value.resetAt) requestCounts.delete(key);
			}
		}
		return false;
	}
	entry.count += 1;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request) {
	const clientId =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (isRateLimited(clientId)) {
		return jsonError("Too many requests", 429);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonError("Invalid JSON body");
	}
	const key = String(body?.key || "").trim();
	if (!key) return jsonError("License key is required");
	const productId = String(body?.productId || "").trim();
	const instanceId = String(body?.instanceId || "").trim();
	// Client-supplied nonce is echoed inside the signed payload so clients can
	// tie a response to their request and reject replays.
	const nonce = String(body?.nonce || "").slice(0, 64);

	const result = await validateLicenseKey({ key, productId, instanceId });

	const payload = JSON.stringify({
		valid: result.ok,
		reason: result.ok ? null : result.reason,
		productId: result.license?.productId || productId || null,
		boundInstanceId: result.license?.boundInstanceId || null,
		nonce: nonce || null,
		signedAt: new Date().toISOString(),
	});
	const signature = signLicensePayload(payload);

	return json({
		valid: result.ok,
		reason: result.ok ? undefined : result.reason,
		license: result.ok
			? {
					productId: result.license.productId,
					productName: result.license.productName,
					status: result.license.status,
					boundInstanceId: result.license.boundInstanceId,
					createdAt: result.license.createdAt,
				}
			: undefined,
		payload,
		signature: signature || undefined,
		publicKey: signature ? getLicensePublicKeyBase64() : undefined,
	});
}
