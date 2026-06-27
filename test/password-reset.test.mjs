import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createPasswordResetExpiry,
	createPasswordResetBaseUrl,
	hashPasswordResetToken,
	normalizePasswordResetConfirmPayload,
	normalizePasswordResetRequestPayload,
} from "../lib/password-reset.mjs";

describe("normalizePasswordResetRequestPayload", () => {
	it("normalizes reset request emails", () => {
		assert.deepEqual(
			normalizePasswordResetRequestPayload({ email: " Test@Example.COM " }),
			{ email: "test@example.com" },
		);
	});

	it("rejects invalid reset request emails", () => {
		assert.throws(
			() => normalizePasswordResetRequestPayload({ email: "bad-email" }),
			/Invalid email/,
		);
	});
});

describe("normalizePasswordResetConfirmPayload", () => {
	it("normalizes reset tokens and accepts strong passwords", () => {
		assert.deepEqual(
			normalizePasswordResetConfirmPayload({
				token: " abc123 ",
				password: "newpassword123",
			}),
			{ token: "abc123", password: "newpassword123" },
		);
	});

	it("rejects blank tokens and short passwords", () => {
		assert.throws(
			() =>
				normalizePasswordResetConfirmPayload({
					token: "",
					password: "newpassword123",
				}),
			/Reset token is required/,
		);
		assert.throws(
			() =>
				normalizePasswordResetConfirmPayload({
					token: "abc123",
					password: "short",
				}),
			/Password must be at least 8 characters/,
		);
	});
});

describe("password reset token helpers", () => {
	it("hashes tokens deterministically without storing the raw token", () => {
		const first = hashPasswordResetToken("token-value");
		const second = hashPasswordResetToken("token-value");
		assert.equal(first, second);
		assert.notEqual(first, "token-value");
		assert.equal(first.length, 64);
	});

	it("creates a one hour expiry by default", () => {
		assert.equal(
			createPasswordResetExpiry(new Date("2026-06-05T00:00:00.000Z")).toISOString(),
			"2026-06-05T01:00:00.000Z",
		);
	});

	it("prefers configured public URLs over bind-all request origins", () => {
		assert.equal(
			createPasswordResetBaseUrl({
				env: { NEXTAUTH_URL: "https://shop.example.com/" },
				requestOrigin: "http://0.0.0.0:3001",
			}),
			"https://shop.example.com",
		);
		assert.equal(
			createPasswordResetBaseUrl({
				env: {},
				requestOrigin: "http://localhost:3001",
			}),
			"http://localhost:3001",
		);
	});
});
