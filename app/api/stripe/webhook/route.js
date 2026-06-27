import { json, jsonError } from "@/lib/api";
import prisma from "@/lib/prisma";
import { ensureOrderDownloadGrants } from "@/lib/download-grant.mjs";
import {
	extractStripeCheckoutOrderIds,
	verifyStripeWebhookSignature,
} from "@/lib/stripe-webhook.mjs";

export async function POST(request) {
	const payload = await request.text();
	const signature = request.headers.get("stripe-signature");
	const secret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!secret) return jsonError("Stripe webhook is not configured", 503);
	if (
		!verifyStripeWebhookSignature({
			payload,
			header: signature,
			secret,
		})
	) {
		return jsonError("Invalid Stripe webhook signature", 400);
	}

	const event = JSON.parse(payload);
	if (event.type !== "checkout.session.completed") {
		return json({ received: true, ignored: true });
	}

	const session = event.data?.object;
	const orderIds = extractStripeCheckoutOrderIds(session);
	if (!orderIds.length || !session?.id) {
		return jsonError("Stripe checkout session is missing order metadata", 400);
	}

	const updated = await prisma.order.updateMany({
		where: {
			id: { in: orderIds },
			paymentMethod: "STRIPE",
			paymentReference: session.id,
		},
		data: { isPaid: true },
	});

	if (updated.count > 0) {
		const paidOrders = await prisma.order.findMany({
			where: { id: { in: orderIds }, isPaid: true },
			include: { orderItems: { include: { product: true } } },
		});
		for (const order of paidOrders) {
			try {
				await ensureOrderDownloadGrants(order);
			} catch (error) {
				console.error("Failed to issue download grants for order", order.id, error);
			}
		}
	}

	return json({ received: true, paidOrders: updated.count });
}
