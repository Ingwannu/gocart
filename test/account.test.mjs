import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeAccountProfilePayload,
	normalizeAccountPasswordPayload,
	resolveAccountWriteError,
} from "../lib/account.mjs";

describe("normalizeAccountProfilePayload", () => {
	it("normalizes editable self-service account fields", () => {
		assert.deepEqual(
			normalizeAccountProfilePayload({
				name: "  Test User ",
				email: " USER@Example.COM ",
				image: " /uploads/avatar.png ",
				role: "admin",
				isSuspended: true,
			}),
			{
				name: "Test User",
				email: "user@example.com",
				image: "/uploads/avatar.png",
			},
		);
	});

	it("rejects blank names and invalid emails", () => {
		assert.throws(
			() => normalizeAccountProfilePayload({ name: "" }),
			/Name is required/,
		);
		assert.throws(
			() => normalizeAccountProfilePayload({ email: "bad-email" }),
			/Invalid email/,
		);
	});
});

describe("normalizeAccountPasswordPayload", () => {
	it("requires the current password and a strong new password", () => {
		assert.deepEqual(
			normalizeAccountPasswordPayload({
				currentPassword: "oldpassword123",
				newPassword: "newpassword123",
			}),
			{
				currentPassword: "oldpassword123",
				newPassword: "newpassword123",
			},
		);
	});

	it("rejects missing current passwords and short new passwords", () => {
		assert.throws(
			() =>
				normalizeAccountPasswordPayload({
					currentPassword: "",
					newPassword: "newpassword123",
				}),
			/Current password is required/,
		);
		assert.throws(
			() =>
				normalizeAccountPasswordPayload({
					currentPassword: "oldpassword123",
					newPassword: "short",
				}),
			/New password must be at least 8 characters/,
		);
	});
});

describe("resolveAccountWriteError", () => {
	it("maps duplicate account emails to an API conflict", () => {
		assert.deepEqual(
			resolveAccountWriteError({ code: "P2002", meta: { target: ["email"] } }),
			{ message: "Email is already registered", status: 409 },
		);
		assert.equal(resolveAccountWriteError({ code: "OTHER" }), null);
	});
});
