import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sourceFile = new URL("../components/admin/StoreInfo.jsx", import.meta.url);

describe("StoreInfo", () => {
	it("localizes store status badges and application metadata", async () => {
		const source = await readFile(sourceFile, "utf8");

		assert.match(source, /useTranslation/);
		assert.match(source, /formatStoreStatus/);
		assert.match(source, /admin\.appliedOn/);
		assert.doesNotMatch(source, /{store\.status}/);
		assert.doesNotMatch(source, /Applied\s+on/);
	});
});
