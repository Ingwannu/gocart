import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isKnownSettingKey,
	maskSecret,
} from "../lib/site-settings.mjs";

describe("isKnownSettingKey", () => {
	it("accepts registered storage setting keys", () => {
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
