import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createStripeWebhookSignature,
	extractStripeCheckoutOrderIds,
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
