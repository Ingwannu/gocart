import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAccountExport } from "../lib/account-export.mjs";

describe("buildAccountExport", () => {
	it("exports account-owned data without password or cart internals", () => {
		const exported = buildAccountExport({
			user: {
				id: "user_1",
				name: "Test User",
				email: "test@example.com",
				password: "hashed-password",
				cart: "{\"product\":1}",
				role: "user",
				isSuspended: false,
				createdAt: new Date("2026-06-05T00:00:00.000Z"),
			},
			addresses: [{ id: "addr_1", city: "Seoul" }],
			orders: [{ id: "order_1", total: 20 }],
			ratings: [{ id: "rating_1", rating: 5 }],
			returnRequests: [{ id: "return_1", reason: "Changed mind" }],
			supportTickets: [{ id: "ticket_1", subject: "Help" }],
			newsletterSubscriptions: [{ id: "news_1", isActive: true }],
			wishlistItems: [{ id: "wish_1", productId: "product_1" }],
			productQuestions: [{ id: "question_1", question: "Does it fit?" }],
		});

		assert.equal(exported.version, 1);
		assert.deepEqual(exported.account, {
			id: "user_1",
			name: "Test User",
			email: "test@example.com",
			image: "",
			role: "user",
			isSuspended: false,
			createdAt: "2026-06-05T00:00:00.000Z",
		});
		assert.equal(exported.password, undefined);
		assert.equal(exported.cart, undefined);
		assert.deepEqual(exported.summary, {
			addresses: 1,
			orders: 1,
			ratings: 1,
			returnRequests: 1,
			supportTickets: 1,
			newsletterSubscriptions: 1,
			wishlistItems: 1,
			productQuestions: 1,
		});
	});

	it("keeps the account export stable when the user model has no created timestamp", () => {
		const exported = buildAccountExport({
			user: {
				id: "user_without_created_at",
				name: "No Timestamp",
				email: "timestamp@example.com",
				role: "user",
				isSuspended: false,
			},
		});

		assert.equal(exported.account.createdAt, null);
	});
});
