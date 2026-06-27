import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canAccessStoreManagement,
	canEditStoreProfile,
	canManageStoreOrders,
	canManageStoreProducts,
	canManageStoreQuestions,
	canUploadStoreAssets,
	createStoreManagementPermissions,
	normalizeSellerStoreProfilePayload,
	resolveStoreManagementActor,
	resolveStoreManagementBlock,
	sanitizeStoreManagementStore,
} from "../lib/store-access.mjs";

const activeStore = { id: "store_1", status: "approved", isActive: true };

describe("canAccessStoreManagement", () => {
	it("requires an approved active store and a store-capable role", () => {
		assert.equal(
			canAccessStoreManagement({ id: "owner", role: "seller" }, {
				...activeStore,
				userId: "owner",
			}),
			true,
		);
		assert.equal(
			canAccessStoreManagement({ id: "owner", role: "member" }, {
				...activeStore,
				userId: "owner",
			}),
			true,
		);
		assert.equal(
			canAccessStoreManagement({ id: "admin", role: "admin" }, activeStore),
			true,
		);
		assert.equal(
			canAccessStoreManagement({ id: "someone", role: "seller" }, {
				...activeStore,
				userId: "owner",
			}),
			false,
		);
		assert.equal(
			canAccessStoreManagement({ id: "someone", role: "seller" }, activeStore),
			false,
		);
		assert.equal(
			canAccessStoreManagement({ id: "owner", role: "seller" }, { ...activeStore, userId: "owner", isActive: false }),
			false,
		);
		assert.equal(canAccessStoreManagement({ id: "owner", role: "seller" }, null), false);
	});

	it("allows active store staff to manage the assigned store only", () => {
		const store = {
			...activeStore,
			userId: "owner",
			staffMembers: [
				{ userId: "staff", isActive: true },
				{ userId: "inactive", isActive: false },
			],
		};
		assert.equal(canAccessStoreManagement({ id: "staff", role: "user" }, store), true);
		assert.equal(canAccessStoreManagement({ id: "inactive", role: "user" }, store), false);
		assert.equal(canAccessStoreManagement({ id: "other", role: "user" }, store), false);
	});
});

describe("store staff role permissions", () => {
	it("keeps viewers read-only while staff and managers can operate store workflows", () => {
		const store = {
			...activeStore,
			userId: "owner",
			staffMembers: [
				{ userId: "viewer", role: "viewer", isActive: true },
				{ userId: "staff", role: "staff", isActive: true },
				{ userId: "manager", role: "manager", isActive: true },
			],
		};

		assert.equal(canAccessStoreManagement({ id: "viewer", role: "user" }, store), true);
		assert.equal(canManageStoreProducts({ id: "viewer", role: "user" }, store), false);
		assert.equal(canManageStoreOrders({ id: "viewer", role: "user" }, store), false);
		assert.equal(canManageStoreQuestions({ id: "viewer", role: "user" }, store), false);
		assert.equal(canUploadStoreAssets({ id: "viewer", role: "user" }, store), false);

		for (const id of ["staff", "manager"]) {
			const user = { id, role: "user" };
			assert.equal(canManageStoreProducts(user, store), true);
			assert.equal(canManageStoreOrders(user, store), true);
			assert.equal(canManageStoreQuestions(user, store), true);
			assert.equal(canUploadStoreAssets(user, store), true);
		}
	});
});

describe("canEditStoreProfile", () => {
	it("allows owners, admins, and active managers to edit the public store profile", () => {
		const store = {
			...activeStore,
			userId: "owner",
			staffMembers: [
				{ userId: "manager", role: "manager", isActive: true },
				{ userId: "staff", role: "staff", isActive: true },
				{ userId: "inactive-manager", role: "manager", isActive: false },
			],
		};

		assert.equal(canEditStoreProfile({ id: "owner", role: "seller" }, store), true);
		assert.equal(canEditStoreProfile({ id: "admin", role: "admin" }, store), true);
		assert.equal(canEditStoreProfile({ id: "manager", role: "user" }, store), true);
		assert.equal(canEditStoreProfile({ id: "staff", role: "user" }, store), false);
		assert.equal(canEditStoreProfile({ id: "inactive-manager", role: "user" }, store), false);
	});
});

describe("createStoreManagementPermissions", () => {
	it("exposes the current user's store management permissions", () => {
		const store = {
			...activeStore,
			userId: "owner",
			staffMembers: [
				{ userId: "manager", role: "manager", isActive: true },
				{ userId: "staff", role: "staff", isActive: true },
			],
		};

		assert.deepEqual(createStoreManagementPermissions({ id: "manager", role: "user" }, store), {
			canAccessStore: true,
			canEditProfile: true,
			canManageProducts: true,
			canManageOrders: true,
			canManageQuestions: true,
			canUploadAssets: true,
		});
		assert.deepEqual(createStoreManagementPermissions({ id: "staff", role: "user" }, store), {
			canAccessStore: true,
			canEditProfile: false,
			canManageProducts: true,
			canManageOrders: true,
			canManageQuestions: true,
			canUploadAssets: true,
		});
	});
});

describe("resolveStoreManagementBlock", () => {
	it("returns a permission block when role was revoked even if the store exists", () => {
		assert.deepEqual(
			resolveStoreManagementBlock({ role: "user" }, activeStore),
			{ message: "Seller permission is required", status: 403 },
		);
	});

	it("returns the inactive-store block when no usable store exists", () => {
		assert.deepEqual(resolveStoreManagementBlock({ role: "seller" }, null), {
			message: "Seller store is not active",
			status: 403,
		});
	});
});

describe("resolveStoreManagementActor", () => {
	it("keeps the current staff user as the audit actor instead of replacing them with the owner", () => {
		const staff = { id: "staff_1", role: "user", email: "staff@example.com" };
		const owner = { id: "owner_1", role: "seller", email: "owner@example.com" };

		assert.equal(
			resolveStoreManagementActor(staff, { user: owner }),
			staff,
		);
	});
});

describe("sanitizeStoreManagementStore", () => {
	it("removes sensitive owner fields from store management responses", () => {
		const store = sanitizeStoreManagementStore({
			id: "store_1",
			name: "Store",
			user: {
				id: "user_1",
				name: "Seller",
				email: "seller@example.com",
				role: "seller",
				password: "hashed-password",
				cart: "{\"product\":1}",
			},
		});

		assert.deepEqual(store.user, {
			id: "user_1",
			name: "Seller",
			email: "seller@example.com",
			role: "seller",
		});
		assert.equal("password" in store.user, false);
		assert.equal("cart" in store.user, false);
	});
});

describe("normalizeSellerStoreProfilePayload", () => {
	it("allows sellers to edit public store profile fields", () => {
		assert.deepEqual(
			normalizeSellerStoreProfilePayload({
				name: " Updated Store ",
				description: " Updated description ",
				email: " store@example.com ",
				contact: " 010-0000-0000 ",
				address: " Seoul ",
				logo: " /uploads/logo.png ",
				status: "rejected",
				isActive: false,
				username: "new-name",
			}),
			{
				name: "Updated Store",
				description: "Updated description",
				email: "store@example.com",
				contact: "010-0000-0000",
				address: "Seoul",
				logo: "/uploads/logo.png",
			},
		);
	});

	it("rejects blank required public profile fields", () => {
		assert.throws(
			() =>
				normalizeSellerStoreProfilePayload({
					name: "",
				}),
			/Store name is required/,
		);
	});
});
