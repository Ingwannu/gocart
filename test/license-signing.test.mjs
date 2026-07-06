import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	generateLicenseSigningKeyPair,
	getLicensePublicKeyBase64,
	isLicenseSigningConfigured,
	signLicensePayload,
	verifyLicensePayload,
} from "../lib/license-signing.mjs";

describe("license signing", () => {
	it("signs and verifies a payload roundtrip", () => {
		const { privateKeyBase64, publicKeyBase64 } = generateLicenseSigningKeyPair();
		const payload = JSON.stringify({ valid: true, nonce: "abc" });

		const signature = signLicensePayload(payload, privateKeyBase64);
		assert.ok(signature);
		assert.equal(verifyLicensePayload(payload, signature, publicKeyBase64), true);
	});

	it("rejects tampered payloads and wrong keys", () => {
		const { privateKeyBase64, publicKeyBase64 } = generateLicenseSigningKeyPair();
		const other = generateLicenseSigningKeyPair();
		const payload = JSON.stringify({ valid: true });
		const signature = signLicensePayload(payload, privateKeyBase64);

		assert.equal(
			verifyLicensePayload(JSON.stringify({ valid: false }), signature, publicKeyBase64),
			false,
		);
		assert.equal(
			verifyLicensePayload(payload, signature, other.publicKeyBase64),
			false,
		);
		assert.equal(verifyLicensePayload(payload, "not-base64!", publicKeyBase64), false);
	});

	it("derives the public key from the private key", () => {
		const { privateKeyBase64, publicKeyBase64 } = generateLicenseSigningKeyPair();
		assert.equal(getLicensePublicKeyBase64(privateKeyBase64), publicKeyBase64);
	});

	it("degrades gracefully when no key is configured", () => {
		assert.equal(isLicenseSigningConfigured("garbage"), false);
		assert.equal(signLicensePayload("payload", "garbage"), null);
		assert.equal(getLicensePublicKeyBase64("garbage"), null);
	});
});
