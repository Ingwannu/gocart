import { createHash, randomBytes } from "node:crypto";
import { normalizeAuthEmail } from "./user-admin.mjs";

function normalizePassword(password) {
	const value = String(password || "");
	if (value.length < 8) throw new Error("Password must be at least 8 characters");
	return value;
}

export function normalizePasswordResetRequestPayload(body = {}) {
	const email = normalizeAuthEmail(body.email);
	if (!email) throw new Error("Invalid email");
	return { email };
}

export function normalizePasswordResetConfirmPayload(body = {}) {
	const token = String(body.token || "").trim();
	if (!token) throw new Error("Reset token is required");
	return {
		token,
		password: normalizePassword(body.password),
	};
}

export function createPasswordResetToken() {
	return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token) {
	return createHash("sha256").update(String(token)).digest("hex");
}

export function createPasswordResetExpiry(now = new Date(), minutes = 60) {
	return new Date(now.getTime() + minutes * 60 * 1000);
}

export function createPasswordResetBaseUrl({
	env = process.env,
	requestOrigin = "",
} = {}) {
	return String(env.NEXTAUTH_URL || requestOrigin || "").replace(/\/$/, "");
}

export function buildPasswordResetUrl(origin, token) {
	const baseUrl = String(origin || "").replace(/\/$/, "");
	return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}
