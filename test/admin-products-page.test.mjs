import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/admin/products/page.jsx", import.meta.url);

describe("AdminProducts page merchandising controls", () => {
	it("lets admins toggle featured products for homepage merchandising", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /isFeatured/);
		assert.match(source, /admin\.featured/);
		assert.match(source, /admin\.featuredProducts/);
	});
});
