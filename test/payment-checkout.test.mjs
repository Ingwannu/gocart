import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildStripeCheckoutParams,
	createStripeCheckoutSession,
	isStripeCheckoutConfigured,
} from "../lib/payment-checkout.mjs";

describe("isStripeCheckoutConfigured", () => {
	it("requires both a secret key and a usable application URL", () => {
		assert.equal(
			isStripeCheckoutConfigured({
				STRIPE_SECRET_KEY: "sk_test_123",
				NEXTAUTH_URL: "http://localhost:3001",
			}),
			true,
		);
		assert.equal(isStripeCheckoutConfigured({ STRIPE_SECRET_KEY: "sk_test_123" }), false);
		assert.equal(isStripeCheckoutConfigured({ NEXTAUTH_URL: "http://localhost:3001" }), false);
	});
});

describe("buildStripeCheckoutParams", () => {
	it("builds a Stripe Checkout form payload from created orders", () => {
		const params = buildStripeCheckoutParams({
			orders: [{ id: "order_a", total: 12.34 }, { id: "order_b", total: 5 }],
			user: { id: "user_1", email: "buyer@example.com" },
			baseUrl: "http://localhost:3001/",
			currency: "KRW",
		});

		assert.equal(params.get("mode"), "payment");
		assert.equal(params.get("customer_email"), "buyer@example.com");
		assert.equal(params.get("success_url"), "http://localhost:3001/orders?checkout=success");
		assert.equal(params.get("cancel_url"), "http://localhost:3001/cart?checkout=cancelled");
		assert.equal(params.get("metadata[userId]"), "user_1");
		assert.equal(params.get("metadata[orderIds]"), "order_a,order_b");
		assert.equal(params.get("line_items[0][price_data][currency]"), "krw");
		assert.equal(params.get("line_items[0][price_data][unit_amount]"), "1734");
		assert.equal(params.get("line_items[0][quantity]"), "1");
	});
});

describe("createStripeCheckoutSession", () => {
	it("posts checkout params to Stripe and returns the redirect URL", async () => {
		const calls = [];
		const result = await createStripeCheckoutSession({
			orders: [{ id: "order_1", total: 20 }],
			user: { id: "user_1", email: "buyer@example.com" },
			baseUrl: "http://localhost:3001",
			env: { STRIPE_SECRET_KEY: "sk_test_123", STRIPE_CURRENCY: "usd" },
			fetchImpl: async (url, init) => {
				calls.push({ url, init });
				return {
					ok: true,
					json: async () => ({
						id: "cs_test_123",
						url: "https://checkout.stripe.test/session",
					}),
				};
			},
		});

		assert.deepEqual(result, {
			id: "cs_test_123",
			url: "https://checkout.stripe.test/session",
		});
		assert.equal(calls[0].url, "https://api.stripe.com/v1/checkout/sessions");
		assert.equal(calls[0].init.method, "POST");
		assert.equal(calls[0].init.headers.Authorization, "Bearer sk_test_123");
		assert.equal(calls[0].init.body.get("metadata[orderIds]"), "order_1");
	});
});
