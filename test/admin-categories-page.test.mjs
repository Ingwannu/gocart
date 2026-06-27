import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/admin/categories/page.jsx", import.meta.url);

describe("AdminCategories page destructive actions", () => {
	it("requires confirmation before deleting a product category", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /window\.confirm\(t\("admin\.deleteCategoryConfirm"\)\)/);
	});
});
