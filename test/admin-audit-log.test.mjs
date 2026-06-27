import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildAdminAuditLogPagination,
	createAdminAuditLogWhere,
	normalizeAuditLogPayload,
} from "../lib/admin-audit-log.mjs";

describe("normalizeAuditLogPayload", () => {
	it("normalizes audit log fields and serializes metadata", () => {
		assert.deepEqual(
			normalizeAuditLogPayload({
				actorId: " admin_1 ",
				action: " USER_SUSPENDED ",
				targetType: " user ",
				targetId: " user_1 ",
				summary: " Suspended user@example.com ",
				metadata: { email: "user@example.com" },
			}),
			{
				actorId: "admin_1",
				action: "USER_SUSPENDED",
				targetType: "user",
				targetId: "user_1",
				summary: "Suspended user@example.com",
				metadata: '{"email":"user@example.com"}',
			},
		);
	});

	it("rejects missing required audit fields", () => {
		assert.throws(
			() => normalizeAuditLogPayload({ actorId: "admin_1", action: "USER_UPDATED" }),
			/Audit target type is required/,
		);
	});
});

describe("createAdminAuditLogWhere", () => {
	it("combines text, action, actor, and target filters", () => {
		assert.deepEqual(
			createAdminAuditLogWhere({
				q: "seller",
				action: "STORE_CREATED",
				actorId: "admin_1",
				targetType: "store",
			}),
			{
				action: "STORE_CREATED",
				actorId: "admin_1",
				targetType: "store",
				OR: [
					{ summary: { contains: "seller", mode: "insensitive" } },
					{ action: { contains: "seller", mode: "insensitive" } },
					{ targetType: { contains: "seller", mode: "insensitive" } },
					{ actor: { email: { contains: "seller", mode: "insensitive" } } },
					{ actor: { name: { contains: "seller", mode: "insensitive" } } },
				],
			},
		);
	});
});

describe("buildAdminAuditLogPagination", () => {
	it("normalizes audit log pagination and clamps excessive limits", () => {
		assert.deepEqual(
			buildAdminAuditLogPagination({ page: "5", limit: "999" }, 151),
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
});
