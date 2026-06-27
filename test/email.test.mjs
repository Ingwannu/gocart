import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildPasswordResetEmail,
	isResendEmailConfigured,
	sendEmailWithResend,
} from "../lib/email.mjs";

describe("isResendEmailConfigured", () => {
	it("requires a Resend API key and from address", () => {
		assert.equal(
			isResendEmailConfigured({
				RESEND_API_KEY: "re_test",
				PASSWORD_RESET_FROM: "Wicked Shop <noreply@example.com>",
			}),
			true,
		);
		assert.equal(isResendEmailConfigured({ RESEND_API_KEY: "re_test" }), false);
	});
});

describe("buildPasswordResetEmail", () => {
	it("builds a plain text and html password reset message", () => {
		const email = buildPasswordResetEmail({
			to: "buyer@example.com",
			resetUrl: "https://shop.example.com/reset-password?token=abc",
		});

		assert.equal(email.to, "buyer@example.com");
		assert.equal(email.subject, "Reset your Wicked Shop password");
		assert.match(email.text, /https:\/\/shop\.example\.com\/reset-password\?token=abc/);
		assert.match(email.html, /href="https:\/\/shop\.example\.com\/reset-password\?token=abc"/);
	});
});

describe("sendEmailWithResend", () => {
	it("sends email through the Resend API", async () => {
		const calls = [];
		const result = await sendEmailWithResend({
			email: {
				to: "buyer@example.com",
				subject: "Subject",
				text: "Text",
				html: "<p>Text</p>",
			},
			env: {
				RESEND_API_KEY: "re_test",
				PASSWORD_RESET_FROM: "Wicked Shop <noreply@example.com>",
			},
			fetchImpl: async (url, init) => {
				calls.push({ url, init, body: JSON.parse(init.body) });
				return {
					ok: true,
					json: async () => ({ id: "email_123" }),
				};
			},
		});

		assert.deepEqual(result, { id: "email_123" });
		assert.equal(calls[0].url, "https://api.resend.com/emails");
		assert.equal(calls[0].init.headers.Authorization, "Bearer re_test");
		assert.equal(calls[0].body.from, "Wicked Shop <noreply@example.com>");
		assert.deepEqual(calls[0].body.to, ["buyer@example.com"]);
	});
});
