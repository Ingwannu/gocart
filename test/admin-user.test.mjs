import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createUserRoleChangeStoreUpdate,
	createAdminUserWhere,
	buildAdminUserPagination,
	normalizeAuthEmail,
	normalizeAdminUserCreatePayload,
	normalizeAdminUserPatchPayload,
	resolveAdminUserPatchBlock,
	normalizePublicSignupPayload,
	resolveAdminUserDeleteBlock,
	resolveUserWriteError,
} from "../lib/user-admin.mjs";

describe("normalizePublicSignupPayload", () => {
	it("normalizes a public signup payload", () => {
		assert.deepEqual(
			normalizePublicSignupPayload({
				name: " Test User ",
				email: " Test@Example.COM ",
				password: "password123",
			}),
			{
				name: "Test User",
				email: "test@example.com",
				password: "password123",
				role: "user",
			},
		);
	});

	it("rejects short passwords", () => {
		assert.throws(
			() =>
				normalizePublicSignupPayload({
					name: "A",
					email: "a@example.com",
					password: "short",
				}),
			/Password must be at least 8 characters/,
		);
	});

	it("requires matching password confirmation for public signup when requested", () => {
		assert.deepEqual(
			normalizePublicSignupPayload(
				{
					name: "Test User",
					email: "test@example.com",
					password: "password123",
					confirmPassword: "password123",
				},
				{ requirePasswordConfirmation: true },
			),
			{
				name: "Test User",
				email: "test@example.com",
				password: "password123",
				role: "user",
			},
		);
		assert.throws(
			() =>
				normalizePublicSignupPayload(
					{
						name: "Test User",
						email: "test@example.com",
						password: "password123",
						confirmPassword: "different123",
					},
					{ requirePasswordConfirmation: true },
				),
			/Passwords do not match/,
		);
		assert.throws(
			() =>
				normalizePublicSignupPayload(
					{
						name: "Test User",
						email: "test@example.com",
						password: "password123",
					},
					{ requirePasswordConfirmation: true },
				),
			/Password confirmation is required/,
		);
	});
});

describe("normalizeAuthEmail", () => {
	it("normalizes login emails the same way signup stores them", () => {
		assert.equal(normalizeAuthEmail(" Test@Example.COM "), "test@example.com");
	});

	it("returns null for invalid login email values", () => {
		assert.equal(normalizeAuthEmail("bad-email"), null);
		assert.equal(normalizeAuthEmail(""), null);
	});
});

describe("normalizeAdminUserCreatePayload", () => {
	it("allows admins to create users with explicit roles", () => {
		assert.deepEqual(
			normalizeAdminUserCreatePayload({
				name: "Seller",
				email: "seller@example.com",
				password: "password123",
				role: "seller",
			}),
			{
				name: "Seller",
				email: "seller@example.com",
				password: "password123",
				role: "seller",
			},
		);
	});
});

describe("normalizeAdminUserPatchPayload", () => {
	it("returns editable user fields including normalized email", () => {
		assert.deepEqual(
			normalizeAdminUserPatchPayload({
				name: "New Name",
				email: " New@Example.COM ",
				role: "member",
				isSuspended: true,
				password: "",
			}),
			{
				name: "New Name",
				email: "new@example.com",
				role: "member",
				isSuspended: true,
			},
		);
	});

	it("rejects invalid edited email addresses", () => {
		assert.throws(
			() =>
				normalizeAdminUserPatchPayload({
					email: "bad-email",
				}),
			/Invalid email/,
		);
	});

	it("rejects invalid suspension values", () => {
		assert.throws(
			() =>
				normalizeAdminUserPatchPayload({
					isSuspended: "yes",
				}),
			/Invalid suspension state/,
		);
	});
});

describe("createUserRoleChangeStoreUpdate", () => {
	it("deactivates an approved active store when owner role is revoked to user", () => {
		assert.deepEqual(
			createUserRoleChangeStoreUpdate({
				nextRole: "user",
				store: { id: "store_1", status: "approved", isActive: true },
			}),
			{ id: "store_1", isActive: false },
		);
	});

	it("leaves store state unchanged for store-capable roles and inactive stores", () => {
		assert.equal(
			createUserRoleChangeStoreUpdate({
				nextRole: "seller",
				store: { id: "store_1", status: "approved", isActive: true },
			}),
			null,
		);
		assert.equal(
			createUserRoleChangeStoreUpdate({
				nextRole: "user",
				store: { id: "store_1", status: "approved", isActive: false },
			}),
			null,
		);
	});
});

describe("createAdminUserWhere", () => {
	it("combines text search and role filters", () => {
		assert.deepEqual(createAdminUserWhere({ q: "seller", role: "seller", status: "active" }), {
			role: "seller",
			isSuspended: false,
			OR: [
				{ name: { contains: "seller", mode: "insensitive" } },
				{ email: { contains: "seller", mode: "insensitive" } },
				{ store: { name: { contains: "seller", mode: "insensitive" } } },
				{ store: { username: { contains: "seller", mode: "insensitive" } } },
			],
		});
	});

	it("filters suspended users", () => {
		assert.deepEqual(createAdminUserWhere({ status: "suspended" }), {
			isSuspended: true,
		});
		assert.deepEqual(createAdminUserWhere({ status: "unknown" }), {});
	});
});

describe("buildAdminUserPagination", () => {
	it("normalizes admin user list pagination and clamps high limits", () => {
		assert.deepEqual(
			buildAdminUserPagination({ page: "4", limit: "999" }, 131),
			{
				page: 3,
				limit: 50,
				skip: 100,
				take: 50,
				total: 131,
				totalPages: 3,
				hasNextPage: false,
				hasPreviousPage: true,
			},
		);
	});

	it("falls back from invalid page and limit values", () => {
		assert.deepEqual(
			buildAdminUserPagination({ page: "bad", limit: "-1" }, 12),
			{
				page: 1,
				limit: 25,
				skip: 0,
				take: 25,
				total: 12,
				totalPages: 1,
				hasNextPage: false,
				hasPreviousPage: false,
			},
		);
	});
});

describe("resolveAdminUserPatchBlock", () => {
	it("blocks admins from suspending their own account", () => {
		assert.deepEqual(
			resolveAdminUserPatchBlock({ isSelf: true, nextIsSuspended: true }),
			{ message: "You cannot suspend yourself", status: 403 },
		);
	});

	it("allows admins to suspend other users", () => {
		assert.equal(
			resolveAdminUserPatchBlock({ isSelf: false, nextIsSuspended: true }),
			null,
		);
	});
});

describe("resolveAdminUserDeleteBlock", () => {
	it("blocks deleting the current admin account", () => {
		assert.deepEqual(resolveAdminUserDeleteBlock({ isSelf: true }), {
			message: "You cannot delete yourself",
			status: 403,
		});
	});

	it("blocks deleting users with stores, orders, payout, audit, or inventory history", () => {
		assert.deepEqual(resolveAdminUserDeleteBlock({ ownsStore: true }), {
			message: "User owns a store; reassign or delete the store first",
			status: 409,
		});
		assert.deepEqual(resolveAdminUserDeleteBlock({ buyerOrderCount: 1 }), {
			message: "User has order history and cannot be deleted",
			status: 409,
		});
		assert.deepEqual(resolveAdminUserDeleteBlock({ payoutEventCount: 1 }), {
			message: "User has admin payout history and cannot be deleted",
			status: 409,
		});
		assert.deepEqual(resolveAdminUserDeleteBlock({ auditLogCount: 1 }), {
			message: "User has audit log history and cannot be deleted",
			status: 409,
		});
		assert.deepEqual(resolveAdminUserDeleteBlock({ inventoryAdjustmentCount: 1 }), {
			message: "User has inventory adjustment history and cannot be deleted",
			status: 409,
		});
	});

	it("allows deleting users without protected history", () => {
		assert.equal(resolveAdminUserDeleteBlock(), null);
	});
});

describe("resolveUserWriteError", () => {
	it("maps duplicate email write errors to a conflict", () => {
		assert.deepEqual(
			resolveUserWriteError({ code: "P2002", meta: { target: ["email"] } }),
			{ message: "Email is already registered", status: 409 },
		);
		assert.equal(resolveUserWriteError({ code: "OTHER" }), null);
	});
});
