import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildReturnRequestPagination,
	createReturnRequestWhere,
	normalizeAdminReturnRequestPatchPayload,
	normalizeReturnRequestPayload,
	resolveReturnRequestBlock,
	resolveReturnRequestWriteError,
} from "../lib/return-request.mjs";

describe("normalizeReturnRequestPayload", () => {
	it("normalizes buyer return request details", () => {
		assert.deepEqual(
			normalizeReturnRequestPayload({
				orderId: " order_1 ",
				reason: "  Product arrived damaged and cannot be used. ",
			}),
			{
				orderId: "order_1",
				reason: "Product arrived damaged and cannot be used.",
			},
		);
	});

	it("rejects missing order ids and vague reasons", () => {
		assert.throws(
			() => normalizeReturnRequestPayload({ orderId: "", reason: "bad" }),
			/Return reason is too short/,
		);
		assert.throws(
			() => normalizeReturnRequestPayload({ orderId: "", reason: "Long enough reason" }),
			/Order is required/,
		);
	});
});

describe("normalizeAdminReturnRequestPatchPayload", () => {
	it("normalizes admin status, note, and refund amount updates", () => {
		assert.deepEqual(
			normalizeAdminReturnRequestPatchPayload({
				status: "APPROVED",
				resolutionNote: "  Replacement approved. ",
				refundAmount: "12.345",
			}),
			{
				status: "APPROVED",
				resolutionNote: "Replacement approved.",
				refundAmount: 12.35,
			},
		);
	});

	it("rejects invalid statuses and refund amounts", () => {
		assert.throws(
			() => normalizeAdminReturnRequestPatchPayload({ status: "DONE" }),
			/Invalid return status/,
		);
		assert.throws(
			() => normalizeAdminReturnRequestPatchPayload({ refundAmount: "-1" }),
			/Invalid refund amount/,
		);
	});

	it("rounds half-cent refund amounts up consistently", () => {
		assert.deepEqual(
			normalizeAdminReturnRequestPatchPayload({ refundAmount: "7.255" }),
			{ refundAmount: 7.26 },
		);
	});
});

describe("resolveReturnRequestBlock", () => {
	it("allows the buyer to request returns for delivered orders only", () => {
		assert.equal(
			resolveReturnRequestBlock({
				order: { userId: "buyer_1", status: "DELIVERED" },
				userId: "buyer_1",
			}),
			null,
		);
		assert.deepEqual(
			resolveReturnRequestBlock({
				order: { userId: "buyer_1", status: "SHIPPED" },
				userId: "buyer_1",
			}),
			{ message: "Only delivered orders can be returned", status: 403 },
		);
	});

	it("blocks missing orders and orders owned by another buyer", () => {
		assert.deepEqual(resolveReturnRequestBlock({ order: null, userId: "buyer_1" }), {
			message: "Order not found",
			status: 404,
		});
		assert.deepEqual(
			resolveReturnRequestBlock({
				order: { userId: "buyer_2", status: "DELIVERED" },
				userId: "buyer_1",
			}),
			{ message: "Order not found", status: 404 },
		);
	});
});

describe("createReturnRequestWhere", () => {
	it("combines scope, status, and search filters", () => {
		assert.deepEqual(
			createReturnRequestWhere({
				scope: "buyer",
				userId: "buyer_1",
				status: "REQUESTED",
				q: "keyboard",
			}),
			{
				userId: "buyer_1",
				status: "REQUESTED",
				OR: [
					{ id: { contains: "keyboard", mode: "insensitive" } },
					{ orderId: { contains: "keyboard", mode: "insensitive" } },
					{ reason: { contains: "keyboard", mode: "insensitive" } },
					{ resolutionNote: { contains: "keyboard", mode: "insensitive" } },
					{ user: { name: { contains: "keyboard", mode: "insensitive" } } },
					{ user: { email: { contains: "keyboard", mode: "insensitive" } } },
					{ order: { store: { name: { contains: "keyboard", mode: "insensitive" } } } },
				],
			},
		);
	});

	it("keeps admin scope global and ignores invalid statuses", () => {
		assert.deepEqual(
			createReturnRequestWhere({ scope: "admin", status: "done" }),
			{},
		);
	});
});

describe("buildReturnRequestPagination", () => {
	it("normalizes return request pagination", () => {
		assert.deepEqual(buildReturnRequestPagination({ page: "2", limit: "999" }, 76), {
			page: 2,
			limit: 50,
			skip: 50,
			take: 50,
			total: 76,
			totalPages: 2,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});
});

describe("resolveReturnRequestWriteError", () => {
	it("maps duplicate and missing return request writes to API errors", () => {
		assert.deepEqual(resolveReturnRequestWriteError({ code: "P2002" }), {
			message: "Return request already exists for this order",
			status: 409,
		});
		assert.deepEqual(resolveReturnRequestWriteError({ code: "P2025" }), {
			message: "Return request not found",
			status: 404,
		});
	});
});
