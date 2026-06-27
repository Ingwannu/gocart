import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sidebarSource = new URL("../components/admin/AdminSidebar.jsx", import.meta.url);

describe("AdminSidebar navigation", () => {
	it("links every operational admin section without hardcoded labels", async () => {
		const source = await readFile(sidebarSource, "utf8");

		assert.match(source, /admin\.orderPayouts/);
		assert.equal(source.includes('href: "/admin/orders"'), true);
		assert.match(source, /admin\.approveStore/);
		assert.equal(source.includes('href: "/admin/approve"'), true);
		assert.equal(source.includes("Orders / Payouts"), false);
	});
});
