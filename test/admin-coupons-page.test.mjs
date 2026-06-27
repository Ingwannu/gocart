import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/admin/coupons/page.jsx", import.meta.url);
const routeSource = new URL("../app/api/coupons/[code]/route.js", import.meta.url);

describe("AdminCoupons page destructive actions", () => {
	it("requires confirmation before deleting a coupon", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /window\.confirm\(t\("admin\.deleteCouponConfirm"\)\)/);
	});

	it("lets admins edit existing coupons without deleting and recreating them", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /editingCoupon/);
		assert.match(source, /handleSaveCoupon/);
		assert.match(source, /method: "PATCH"/);
		assert.match(source, /admin\.editCoupon/);
	});
});

describe("coupon detail API", () => {
	it("exposes a PATCH route for editable coupon fields", async () => {
		const source = await readFile(routeSource, "utf8");

		assert.match(source, /export async function PATCH/);
		assert.match(source, /normalizeAdminCouponPatchPayload/);
		assert.match(source, /COUPON_UPDATED/);
	});
});
