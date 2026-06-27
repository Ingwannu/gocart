import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/admin/stores/page.jsx", import.meta.url);

describe("AdminStores page destructive actions", () => {
	it("requires confirmation before revoking store staff access", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /window\.confirm\(t\("admin\.revokeStaffConfirm"\)\)/);
	});

	it("localizes store status option labels", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /admin\.storeStatusApproved/);
		assert.match(source, /admin\.storeStatusPending/);
		assert.match(source, /admin\.storeStatusRejected/);
		assert.doesNotMatch(source, />approved</);
		assert.doesNotMatch(source, />pending</);
		assert.doesNotMatch(source, />rejected</);
	});
});
