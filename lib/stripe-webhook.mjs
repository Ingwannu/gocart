import { createHmac, timingSafeEqual } from "node:crypto";

export function createStripeWebhookSignature({ payload, secret, timestamp }) {
	return createHmac("sha256", secret)
		.update(`${timestamp}.${payload}`)
		.digest("hex");
}

function parseStripeSignatureHeader(header) {
	return String(header || "")
		.split(",")
		.reduce(
			(result, pair) => {
				const [key, value] = pair.split("=");
				if (key === "t") result.timestamp = Number(value);
				if (key === "v1" && value) result.signatures.push(value);
				return result;
			},
			{ timestamp: 0, signatures: [] },
		);
}

export function verifyStripeWebhookSignature({
	payload,
	header,
	secret,
	now = Math.floor(Date.now() / 1000),
	toleranceSeconds = 300,
}) {
	if (!payload || !secret || !header) return false;

	const { timestamp, signatures } = parseStripeSignatureHeader(header);
	if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > toleranceSeconds) {
		return false;
	}

	const expected = createStripeWebhookSignature({ payload, secret, timestamp });
	const expectedBuffer = Buffer.from(expected, "hex");
	return signatures.some((signature) => {
		const signatureBuffer = Buffer.from(signature, "hex");
		return (
			signatureBuffer.length === expectedBuffer.length &&
			timingSafeEqual(signatureBuffer, expectedBuffer)
		);
	});
}

export function extractStripeCheckoutOrderIds(session) {
	return String(session?.metadata?.orderIds || "")
		.split(",")
		.map((orderId) => orderId.trim())
		.filter(Boolean);
}

// Event types that can carry a settled checkout session. `completed` fires for
// card payments; `async_payment_succeeded` fires later for delayed-settlement
// methods (bank debits, vouchers) whose `completed` event arrives unpaid.
export const STRIPE_CHECKOUT_PAID_EVENT_TYPES = new Set([
	"checkout.session.completed",
	"checkout.session.async_payment_succeeded",
]);

// A completed session is only safe to fulfill once Stripe reports the money as
// settled. `no_payment_required` covers fully-discounted (zero-amount) sessions.
export function isPaidStripeCheckoutSession(session) {
	const status = String(session?.payment_status || "");
	return status === "paid" || status === "no_payment_required";
}
