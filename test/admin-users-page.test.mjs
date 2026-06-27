import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/admin/users/page.jsx", import.meta.url);
const apiSource = new URL("../app/api/users/[userId]/route.js", import.meta.url);

describe("AdminUsers page destructive actions", () => {
	it("requires confirmation before deleting a user", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /window\.confirm\(t\("admin\.deleteUserConfirm"\)\)/);
	});

	it("protects users with inventory adjustment history from hard deletion", async () => {
		const source = await readFile(apiSource, "utf8");

		assert.match(source, /prisma\.inventoryAdjustment\.count/);
		assert.match(source, /inventoryAdjustmentCount/);
	});
});
