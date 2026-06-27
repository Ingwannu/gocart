import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminStorePagination,
	createAdminStoreWhere,
	createStoreRemovalRoleUpdate,
	createStoreOwnerTransferRoleUpdates,
	normalizeAdminStorePayload,
	normalizeStoreStaffPatchPayload,
	normalizeStoreStaffPayload,
	resolveGrantedOwnerRole,
	resolveStoreOwnerGrantBlock,
	resolveStoreStaffGrantBlock,
	resolveRevokedOwnerRole,
	resolveStoreStaffWriteError,
	resolveStoreWriteError,
} from "../lib/store-admin.mjs";

describe("normalizeAdminStorePayload", () => {
	it("defaults admin-created stores to approved and active", () => {
		const payload = normalizeAdminStorePayload({
			userEmail: " Seller@Example.COM ",
			username: " Gadget-Hub ",
			name: "Gadget Hub",
			email: "store@example.com",
			contact: "010-0000-0000",
			address: "Seoul",
		});

		assert.equal(payload.userEmail, "seller@example.com");
		assert.deepEqual(payload.data, {
			username: "gadget-hub",
			name: "Gadget Hub",
			description: "",
			email: "store@example.com",
			contact: "010-0000-0000",
			address: "Seoul",
			logo: "",
			status: "approved",
			isActive: true,
		});
	});

	it("allows admins to explicitly disable a store while creating it", () => {
		const payload = normalizeAdminStorePayload({
			userEmail: "seller@example.com",
			username: "seller-shop",
			name: "Seller Shop",
			email: "store@example.com",
			contact: "010",
			address: "Seoul",
			isActive: false,
		});

		assert.equal(payload.data.status, "approved");
		assert.equal(payload.data.isActive, false);
	});

	it("rejects invalid usernames and missing owner emails", () => {
		assert.throws(
			() =>
				normalizeAdminStorePayload({
					username: "Bad Name!",
					name: "Bad",
					email: "store@example.com",
					contact: "010",
					address: "Seoul",
				}),
			/Missing owner email/,
		);

		assert.throws(
			() =>
				normalizeAdminStorePayload({
					userEmail: "seller@example.com",
					username: "Bad Name!",
					name: "Bad",
					email: "store@example.com",
					contact: "010",
					address: "Seoul",
				}),
			/3-40 lowercase letters/,
		);
	});
});

describe("resolveGrantedOwnerRole", () => {
	it("grants seller role only to plain users", () => {
		assert.equal(resolveGrantedOwnerRole("user"), "seller");
		assert.equal(resolveGrantedOwnerRole("member"), "member");
		assert.equal(resolveGrantedOwnerRole("admin"), "admin");
		assert.equal(resolveGrantedOwnerRole("seller"), "seller");
	});
});

describe("resolveStoreOwnerGrantBlock", () => {
	it("blocks creating or transferring stores to suspended owners", () => {
		assert.deepEqual(
			resolveStoreOwnerGrantBlock({ isSuspended: true }),
			{ message: "Owner account is suspended", status: 409 },
		);
		assert.equal(resolveStoreOwnerGrantBlock({ isSuspended: false }), null);
	});
});

describe("resolveStoreStaffGrantBlock", () => {
	it("blocks granting store staff access to suspended users", () => {
		assert.deepEqual(
			resolveStoreStaffGrantBlock({ isSuspended: true }),
			{ message: "Staff account is suspended", status: 409 },
		);
		assert.equal(resolveStoreStaffGrantBlock({ isSuspended: false }), null);
	});
});

describe("resolveRevokedOwnerRole", () => {
	it("revokes seller role only from plain sellers", () => {
		assert.equal(resolveRevokedOwnerRole("seller"), "user");
		assert.equal(resolveRevokedOwnerRole("admin"), "admin");
		assert.equal(resolveRevokedOwnerRole("member"), "member");
	});
});

describe("createStoreOwnerTransferRoleUpdates", () => {
	it("grants the new plain owner and revokes the previous plain seller", () => {
		assert.deepEqual(
			createStoreOwnerTransferRoleUpdates({
				previousOwner: { id: "old", role: "seller" },
				nextOwner: { id: "new", role: "user" },
			}),
			[
				{ id: "old", role: "user" },
				{ id: "new", role: "seller" },
			],
		);
	});

	it("preserves elevated roles during ownership transfer", () => {
		assert.deepEqual(
			createStoreOwnerTransferRoleUpdates({
				previousOwner: { id: "old", role: "admin" },
				nextOwner: { id: "new", role: "member" },
			}),
			[],
		);
	});
});

describe("createStoreRemovalRoleUpdate", () => {
	it("revokes seller role when a store is removed or archived", () => {
		assert.deepEqual(
			createStoreRemovalRoleUpdate({ owner: { id: "owner", role: "seller" } }),
			{ id: "owner", role: "user" },
		);
	});

	it("preserves elevated owner roles when a store is removed or archived", () => {
		assert.equal(
			createStoreRemovalRoleUpdate({ owner: { id: "owner", role: "admin" } }),
			null,
		);
	});
});

describe("createAdminStoreWhere", () => {
	it("combines status, active, and text search filters", () => {
		assert.deepEqual(
			createAdminStoreWhere({ q: "kitchen", status: "approved", active: "true" }),
			{
				status: "approved",
				isActive: true,
				OR: [
					{ name: { contains: "kitchen", mode: "insensitive" } },
					{ username: { contains: "kitchen", mode: "insensitive" } },
					{ email: { contains: "kitchen", mode: "insensitive" } },
					{ contact: { contains: "kitchen", mode: "insensitive" } },
					{ user: { email: { contains: "kitchen", mode: "insensitive" } } },
					{ user: { name: { contains: "kitchen", mode: "insensitive" } } },
				],
			},
		);
	});
});

describe("buildAdminStorePagination", () => {
	it("normalizes admin store list pagination and clamps high limits", () => {
		assert.deepEqual(
			buildAdminStorePagination({ page: "5", limit: "999" }, 151),
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
			buildAdminStorePagination({ page: "bad", limit: "0" }, 18),
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

describe("resolveStoreWriteError", () => {
	it("maps store uniqueness races to specific conflicts", () => {
		assert.deepEqual(
			resolveStoreWriteError({ code: "P2002", meta: { target: ["username"] } }),
			{ message: "Store username already exists", status: 409 },
		);
		assert.deepEqual(
			resolveStoreWriteError({ code: "P2002", meta: { target: ["userId"] } }),
			{ message: "Owner already has a store", status: 409 },
		);
		assert.equal(resolveStoreWriteError({ code: "OTHER" }), null);
	});
});

describe("normalizeStoreStaffPayload", () => {
	it("normalizes store staff grants", () => {
		assert.deepEqual(
			normalizeStoreStaffPayload({
				userEmail: " Staff@Example.COM ",
				role: "manager",
				isActive: false,
			}),
			{
				userEmail: "staff@example.com",
				data: {
					role: "manager",
					isActive: false,
				},
			},
		);
		assert.deepEqual(
			normalizeStoreStaffPayload({
				userEmail: " viewer@example.com ",
				role: "viewer",
			}),
			{
				userEmail: "viewer@example.com",
				data: {
					role: "viewer",
					isActive: true,
				},
			},
		);
	});

	it("defaults staff grants and rejects invalid roles", () => {
		assert.deepEqual(normalizeStoreStaffPayload({ userEmail: "staff@example.com" }), {
			userEmail: "staff@example.com",
			data: { role: "staff", isActive: true },
		});
		assert.throws(
			() => normalizeStoreStaffPayload({ userEmail: "", role: "owner" }),
			/Staff email is required/,
		);
		assert.throws(
			() => normalizeStoreStaffPayload({ userEmail: "staff@example.com", role: "owner" }),
			/Invalid staff role/,
		);
	});
});

describe("normalizeStoreStaffPatchPayload", () => {
	it("updates only provided staff fields", () => {
		assert.deepEqual(
			normalizeStoreStaffPatchPayload({ isActive: false }),
			{ isActive: false },
		);
		assert.deepEqual(
			normalizeStoreStaffPatchPayload({ role: "manager" }),
			{ role: "manager" },
		);
		assert.deepEqual(
			normalizeStoreStaffPatchPayload({ role: "viewer" }),
			{ role: "viewer" },
		);
	});

	it("rejects invalid patch roles and empty patches", () => {
		assert.throws(
			() => normalizeStoreStaffPatchPayload({ role: "owner" }),
			/Invalid staff role/,
		);
		assert.throws(
			() => normalizeStoreStaffPatchPayload({}),
			/No staff fields to update/,
		);
	});
});

describe("resolveStoreStaffWriteError", () => {
	it("maps duplicate and missing staff writes to API errors", () => {
		assert.deepEqual(resolveStoreStaffWriteError({ code: "P2002" }), {
			message: "User is already staff for this store",
			status: 409,
		});
		assert.deepEqual(resolveStoreStaffWriteError({ code: "P2025" }), {
			message: "Store staff member not found",
			status: 404,
		});
		assert.equal(resolveStoreStaffWriteError({ code: "OTHER" }), null);
	});
});
