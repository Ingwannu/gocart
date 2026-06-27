import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminCouponPagination,
	createAdminCouponWhere,
	normalizeAdminCouponPayload,
	normalizeAdminCouponPatchPayload,
	normalizeCheckoutCouponCode,
	resolveCheckoutCouponBlock,
	resolveCouponWriteError,
} from "../lib/coupon-admin.mjs";

describe("normalizeAdminCouponPayload", () => {
	it("normalizes admin-created coupons and preserves public usability", () => {
		assert.deepEqual(
			normalizeAdminCouponPayload({
				code: " save10 ",
				description: " Save ten ",
				discount: "10",
				forNewUser: true,
				forMember: false,
				isPublic: true,
				expiresAt: "2026-12-31",
			}),
			{
				code: "SAVE10",
				description: "Save ten",
				discount: 10,
				forNewUser: true,
				forMember: false,
				isPublic: true,
				expiresAt: new Date("2026-12-31"),
			},
		);
	});

	it("rejects missing fields and invalid discounts", () => {
		assert.throws(
			() =>
				normalizeAdminCouponPayload({
					code: "BAD",
					description: "Bad",
					discount: "101",
					expiresAt: "2026-12-31",
				}),
			/Invalid coupon discount/,
		);
	});
});

describe("normalizeAdminCouponPatchPayload", () => {
	it("normalizes editable coupon fields without requiring the coupon code", () => {
		assert.deepEqual(
			normalizeAdminCouponPatchPayload({
				description: " Launch promo ",
				discount: "15",
				forNewUser: true,
				forMember: false,
				isPublic: true,
				expiresAt: "2026-12-31",
			}),
			{
				description: "Launch promo",
				discount: 15,
				forNewUser: true,
				forMember: false,
				isPublic: true,
				expiresAt: new Date("2026-12-31"),
			},
		);
	});

	it("rejects empty coupon edits and invalid editable values", () => {
		assert.throws(() => normalizeAdminCouponPatchPayload({}), /No coupon fields/);
		assert.throws(
			() => normalizeAdminCouponPatchPayload({ discount: "0" }),
			/Invalid coupon discount/,
		);
		assert.throws(
			() => normalizeAdminCouponPatchPayload({ expiresAt: "not-a-date" }),
			/Invalid coupon expiry date/,
		);
		assert.throws(
			() => normalizeAdminCouponPatchPayload({ description: " " }),
			/Coupon description is required/,
		);
	});
});

describe("createAdminCouponWhere", () => {
	it("combines text, audience, and expiry filters", () => {
		const now = new Date("2026-06-05T00:00:00.000Z");

		assert.deepEqual(
			createAdminCouponWhere({
				q: "save",
				audience: "public",
				expiry: "active",
				now,
			}),
			{
				isPublic: true,
				expiresAt: { gte: now },
				OR: [
					{ code: { contains: "save", mode: "insensitive" } },
					{ description: { contains: "save", mode: "insensitive" } },
				],
			},
		);
	});

	it("filters new-user and member coupons", () => {
		assert.deepEqual(createAdminCouponWhere({ audience: "new" }), {
			forNewUser: true,
		});
		assert.deepEqual(createAdminCouponWhere({ audience: "member" }), {
			forMember: true,
		});
	});
});

describe("buildAdminCouponPagination", () => {
	it("normalizes coupon list pagination and clamps high limits", () => {
		assert.deepEqual(
			buildAdminCouponPagination({ page: "4", limit: "999" }, 151),
			{
				page: 4,
				limit: 50,
				skip: 150,
				take: 50,
				total: 151,
				totalPages: 4,
				hasNextPage: false,
				hasPreviousPage: true,
			},
		);
	});

	it("falls back from invalid pagination values", () => {
		assert.deepEqual(
			buildAdminCouponPagination({ page: "bad", limit: "0" }, 18),
			{
				page: 1,
				limit: 25,
				skip: 0,
				take: 25,
				total: 18,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		);
	});
});

describe("resolveCouponWriteError", () => {
	it("maps duplicate and missing coupon writes to API errors", () => {
		assert.deepEqual(resolveCouponWriteError({ code: "P2002" }), {
			message: "Coupon code already exists",
			status: 409,
		});
		assert.deepEqual(resolveCouponWriteError({ code: "P2025" }), {
			message: "Coupon not found",
			status: 404,
		});
		assert.equal(resolveCouponWriteError({ code: "OTHER" }), null);
	});
});

describe("checkout coupon validation", () => {
	const now = new Date("2026-06-06T00:00:00.000Z");
	const validCoupon = {
		code: "SAVE10",
		discount: 10,
		expiresAt: new Date("2026-06-07T00:00:00.000Z"),
		isPublic: true,
		forMember: false,
		forNewUser: false,
	};

	it("normalizes checkout coupon payloads before lookup", () => {
		assert.equal(normalizeCheckoutCouponCode({ code: " save10 " }), "SAVE10");
		assert.equal(normalizeCheckoutCouponCode(" member-only "), "MEMBER-ONLY");
		assert.equal(normalizeCheckoutCouponCode(""), null);
		assert.equal(normalizeCheckoutCouponCode(null), null);
	});

	it("rejects requested coupons that are missing, expired, private, or unauthorized", () => {
		assert.deepEqual(
			resolveCheckoutCouponBlock({ requestedCode: "SAVE10", coupon: null, now }),
			{ message: "Coupon is invalid or expired", status: 404 },
		);
		assert.deepEqual(
			resolveCheckoutCouponBlock({
				requestedCode: "OLD",
				coupon: {
					...validCoupon,
					expiresAt: new Date("2026-06-05T00:00:00.000Z"),
				},
				now,
			}),
			{ message: "Coupon is invalid or expired", status: 404 },
		);
		assert.deepEqual(
			resolveCheckoutCouponBlock({
				requestedCode: "PRIVATE",
				coupon: { ...validCoupon, isPublic: false },
				now,
			}),
			{ message: "Coupon is not publicly available", status: 403 },
		);
		assert.deepEqual(
			resolveCheckoutCouponBlock({
				requestedCode: "MEMBER",
				coupon: { ...validCoupon, forMember: true },
				userRole: "user",
				now,
			}),
			{ message: "Coupon is for members only", status: 403 },
		);
		assert.deepEqual(
			resolveCheckoutCouponBlock({
				requestedCode: "NEW",
				coupon: { ...validCoupon, forNewUser: true },
				previousOrderCount: 1,
				now,
			}),
			{ message: "Coupon is for new users only", status: 403 },
		);
	});

	it("allows valid public coupons and empty coupon payloads", () => {
		assert.equal(resolveCheckoutCouponBlock({ requestedCode: null }), null);
		assert.equal(
			resolveCheckoutCouponBlock({
				requestedCode: "SAVE10",
				coupon: validCoupon,
				userRole: "user",
				previousOrderCount: 0,
				now,
			}),
			null,
		);
	});
});
