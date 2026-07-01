import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isKnownSettingKey,
	maskSecret,
	normalizeCurrencySymbol,
	normalizePublicUrl,
} from "../lib/site-settings.mjs";

describe("isKnownSettingKey", () => {
	it("accepts registered storage setting keys", () => {
		assert.equal(isKnownSettingKey("site_public_url"), true);
		assert.equal(isKnownSettingKey("site_currency_symbol"), true);
		assert.equal(isKnownSettingKey("resend_api_key"), true);
		assert.equal(isKnownSettingKey("password_reset_from"), true);
		assert.equal(isKnownSettingKey("storage_backend"), true);
		assert.equal(isKnownSettingKey("s3_endpoint"), true);
		assert.equal(isKnownSettingKey("s3_secret_access_key"), true);
	});

	it("rejects arbitrary keys", () => {
		assert.equal(isKnownSettingKey("random_setting"), false);
		assert.equal(isKnownSettingKey(""), false);
		assert.equal(isKnownSettingKey(undefined), false);
	});
});

describe("maskSecret", () => {
	it("masks non-empty secrets and leaves empty as empty", () => {
		assert.equal(maskSecret("super-secret-key"), "••••••••");
		assert.equal(maskSecret(""), "");
		assert.equal(maskSecret(undefined), "");
	});
});

describe("general setting normalization", () => {
	it("normalizes public URLs and compact currency symbols", () => {
		assert.equal(normalizePublicUrl("https://shop.example.com///"), "https://shop.example.com");
		assert.equal(normalizeCurrencySymbol("  KRW  "), "KRW");
		assert.equal(normalizeCurrencySymbol(""), "$");
	});
});
