import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	STRIPE_CHECKOUT_PAID_EVENT_TYPES,
	createStripeWebhookSignature,
	extractStripeCheckoutOrderIds,
	isPaidStripeCheckoutSession,
	verifyStripeWebhookSignature,
} from "../lib/stripe-webhook.mjs";

describe("verifyStripeWebhookSignature", () => {
	it("accepts a valid Stripe webhook signature", () => {
		const payload = JSON.stringify({ type: "checkout.session.completed" });
		const timestamp = 1764936000;
		const signature = createStripeWebhookSignature({
			payload,
			secret: "whsec_test",
			timestamp,
		});

		assert.equal(
			verifyStripeWebhookSignature({
				payload,
				header: `t=${timestamp},v1=${signature}`,
				secret: "whsec_test",
				now: timestamp + 60,
			}),
			true,
		);
	});

	it("rejects stale or mismatched signatures", () => {
		const payload = "{}";
		const timestamp = 1764936000;
		const signature = createStripeWebhookSignature({
			payload,
			secret: "whsec_test",
			timestamp,
		});

		assert.equal(
			verifyStripeWebhookSignature({
				payload,
				header: `t=${timestamp},v1=${signature}`,
				secret: "wrong",
				now: timestamp,
			}),
			false,
		);
		assert.equal(
			verifyStripeWebhookSignature({
				payload,
				header: `t=${timestamp},v1=${signature}`,
				secret: "whsec_test",
				now: timestamp + 301,
			}),
			false,
		);
	});
});

describe("extractStripeCheckoutOrderIds", () => {
	it("extracts compact comma-separated order metadata", () => {
		assert.deepEqual(
			extractStripeCheckoutOrderIds({
				metadata: { orderIds: " order_a,order_b,, " },
			}),
			["order_a", "order_b"],
		);
	});
});

describe("isPaidStripeCheckoutSession", () => {
	it("accepts settled and zero-amount sessions", () => {
		assert.equal(isPaidStripeCheckoutSession({ payment_status: "paid" }), true);
		assert.equal(
			isPaidStripeCheckoutSession({ payment_status: "no_payment_required" }),
			true,
		);
	});

	it("rejects unpaid sessions from delayed payment methods", () => {
		assert.equal(isPaidStripeCheckoutSession({ payment_status: "unpaid" }), false);
		assert.equal(isPaidStripeCheckoutSession({}), false);
		assert.equal(isPaidStripeCheckoutSession(null), false);
	});
});

describe("STRIPE_CHECKOUT_PAID_EVENT_TYPES", () => {
	it("covers completed and delayed-settlement success events", () => {
		assert.equal(
			STRIPE_CHECKOUT_PAID_EVENT_TYPES.has("checkout.session.completed"),
			true,
		);
		assert.equal(
			STRIPE_CHECKOUT_PAID_EVENT_TYPES.has("checkout.session.async_payment_succeeded"),
			true,
		);
		assert.equal(
			STRIPE_CHECKOUT_PAID_EVENT_TYPES.has("checkout.session.async_payment_failed"),
			false,
		);
	});
});
