import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveAdminRouteRedirect,
	resolveStoreRouteRedirect,
} from "../lib/route-guards.mjs";

describe("resolveAdminRouteRedirect", () => {
	it("allows admins and redirects everyone else before rendering admin pages", () => {
		assert.equal(resolveAdminRouteRedirect({ id: "admin", role: "admin" }), null);
		assert.equal(resolveAdminRouteRedirect(null), "/login?callbackUrl=/admin");
		assert.equal(resolveAdminRouteRedirect({ id: "user", role: "user" }), "/");
	});
});

describe("resolveStoreRouteRedirect", () => {
	it("allows users with an approved active store and redirects blocked sellers", () => {
		assert.equal(
			resolveStoreRouteRedirect(
				{ id: "seller", role: "seller" },
				{
					id: "store",
					userId: "seller",
					status: "approved",
					isActive: true,
					user: { id: "seller", role: "seller" },
				},
			),
			null,
		);
		assert.equal(resolveStoreRouteRedirect(null, null), "/login?callbackUrl=/store");
		assert.equal(
			resolveStoreRouteRedirect(
				{ id: "seller", role: "seller" },
				{ id: "store", status: "approved", isActive: false },
			),
			"/",
		);
		assert.equal(
			resolveStoreRouteRedirect(
				{ id: "other-seller", role: "seller" },
				{
					id: "store",
					userId: "seller",
					status: "approved",
					isActive: true,
					user: { id: "seller", role: "seller" },
				},
			),
			"/",
		);
		assert.equal(
			resolveStoreRouteRedirect(
				{ id: "staff", role: "user" },
				{
					id: "store",
					userId: "seller",
					status: "approved",
					isActive: true,
					user: { id: "seller", role: "seller" },
					staffMembers: [{ userId: "staff", isActive: true }],
				},
			),
			null,
		);
		assert.equal(
			resolveStoreRouteRedirect(
				{ id: "seller", role: "user" },
				{
					id: "store",
					userId: "seller",
					status: "approved",
					isActive: true,
					user: { id: "seller", role: "user" },
				},
			),
			"/",
		);
	});
});
