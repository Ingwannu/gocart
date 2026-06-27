import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildSupportTicketPagination,
	createSupportTicketWhere,
	normalizeSupportTicketPayload,
	normalizeSupportTicketPatchPayload,
	resolveSupportTicketWriteError,
} from "../lib/support-ticket.mjs";

describe("normalizeSupportTicketPayload", () => {
	it("normalizes public contact ticket fields", () => {
		assert.deepEqual(
			normalizeSupportTicketPayload({
				name: "  Customer ",
				email: " Customer@Example.COM ",
				subject: "  Order question ",
				message: "  Where is my order? ",
				status: "RESOLVED",
			}),
			{
				name: "Customer",
				email: "customer@example.com",
				subject: "Order question",
				message: "Where is my order?",
			},
		);
	});

	it("rejects invalid emails and short messages", () => {
		assert.throws(
			() =>
				normalizeSupportTicketPayload({
					name: "Customer",
					email: "bad-email",
					subject: "Question",
					message: "Where is my order?",
				}),
			/Invalid email/,
		);
		assert.throws(
			() =>
				normalizeSupportTicketPayload({
					name: "Customer",
					email: "customer@example.com",
					subject: "Question",
					message: "short",
				}),
			/Message must be at least 10 characters/,
		);
	});
});

describe("normalizeSupportTicketPatchPayload", () => {
	it("allows admins to update status and internal note", () => {
		assert.deepEqual(
			normalizeSupportTicketPatchPayload({
				status: "resolved",
				internalNote: "  replied by email ",
				message: "ignore public field",
			}),
			{
				status: "RESOLVED",
				internalNote: "replied by email",
			},
		);
	});

	it("rejects invalid ticket statuses", () => {
		assert.throws(
			() => normalizeSupportTicketPatchPayload({ status: "deleted" }),
			/Invalid support status/,
		);
	});
});

describe("createSupportTicketWhere", () => {
	it("combines status and text search filters", () => {
		assert.deepEqual(createSupportTicketWhere({ q: "order", status: "OPEN" }), {
			status: "OPEN",
			OR: [
				{ name: { contains: "order", mode: "insensitive" } },
				{ email: { contains: "order", mode: "insensitive" } },
				{ subject: { contains: "order", mode: "insensitive" } },
				{ message: { contains: "order", mode: "insensitive" } },
			],
		});
	});
});

describe("buildSupportTicketPagination", () => {
	it("normalizes support ticket pagination", () => {
		assert.deepEqual(buildSupportTicketPagination({ page: "3", limit: "999" }, 121), {
			page: 3,
			limit: 50,
			skip: 100,
			take: 50,
			total: 121,
			totalPages: 3,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});
});

describe("resolveSupportTicketWriteError", () => {
	it("maps missing ticket updates to API errors", () => {
		assert.deepEqual(resolveSupportTicketWriteError({ code: "P2025" }), {
			message: "Support ticket not found",
			status: 404,
		});
		assert.equal(resolveSupportTicketWriteError({ code: "OTHER" }), null);
	});
});
