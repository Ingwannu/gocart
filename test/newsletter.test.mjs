import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildNewsletterPagination,
	createNewsletterWhere,
	normalizeNewsletterPayload,
	resolveNewsletterWriteError,
} from "../lib/newsletter.mjs";

describe("normalizeNewsletterPayload", () => {
	it("normalizes public newsletter subscription emails", () => {
		assert.deepEqual(
			normalizeNewsletterPayload({ email: "  News@Example.COM " }),
			{ email: "news@example.com" },
		);
	});

	it("rejects invalid subscription emails", () => {
		assert.throws(
			() => normalizeNewsletterPayload({ email: "bad-email" }),
			/Invalid email/,
		);
	});
});

describe("createNewsletterWhere", () => {
	it("combines email search and active filters", () => {
		assert.deepEqual(createNewsletterWhere({ q: "news", status: "active" }), {
			isActive: true,
			email: { contains: "news", mode: "insensitive" },
		});
		assert.deepEqual(createNewsletterWhere({ status: "inactive" }), {
			isActive: false,
		});
	});
});

describe("buildNewsletterPagination", () => {
	it("normalizes subscriber pagination", () => {
		assert.deepEqual(buildNewsletterPagination({ page: "3", limit: "999" }, 121), {
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

describe("resolveNewsletterWriteError", () => {
	it("maps duplicate subscriber writes to a conflict", () => {
		assert.deepEqual(resolveNewsletterWriteError({ code: "P2002" }), {
			message: "Email is already subscribed",
			status: 409,
		});
		assert.equal(resolveNewsletterWriteError({ code: "OTHER" }), null);
	});
});
