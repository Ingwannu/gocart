const STRIPE_CHECKOUT_URL = "https://api.stripe.com/v1/checkout/sessions";

export function isStripeCheckoutConfigured(env = process.env) {
	return Boolean(env.STRIPE_SECRET_KEY?.trim() && env.NEXTAUTH_URL?.trim());
}

export function buildStripeCheckoutParams({
	orders,
	user,
	baseUrl,
	currency = "usd",
}) {
	const orderIds = orders.map((order) => order.id);
	const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
	const normalizedBaseUrl = String(baseUrl || "").replace(/\/+$/, "");
	const params = new URLSearchParams();

	params.set("mode", "payment");
	params.set("success_url", `${normalizedBaseUrl}/orders?checkout=success`);
	params.set("cancel_url", `${normalizedBaseUrl}/cart?checkout=cancelled`);
	params.set("customer_email", user.email);
	params.set("metadata[userId]", user.id);
	params.set("metadata[orderIds]", orderIds.join(","));
	params.set("line_items[0][price_data][currency]", currency.toLowerCase());
	params.set("line_items[0][price_data][product_data][name]", "Wicked Shop order");
	params.set(
		"line_items[0][price_data][product_data][description]",
		`Orders ${orderIds.join(", ")}`,
	);
	params.set(
		"line_items[0][price_data][unit_amount]",
		String(Math.max(0, Math.round(total * 100))),
	);
	params.set("line_items[0][quantity]", "1");

	return params;
}

export async function createStripeCheckoutSession({
	orders,
	user,
	baseUrl,
	env = process.env,
	fetchImpl = fetch,
}) {
	if (!env.STRIPE_SECRET_KEY?.trim()) {
		throw new Error("Stripe checkout is not configured");
	}

	const params = buildStripeCheckoutParams({
		orders,
		user,
		baseUrl,
		currency: env.STRIPE_CURRENCY || "usd",
	});
	const response = await fetchImpl(STRIPE_CHECKOUT_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	});
	const data = await response.json();

	if (!response.ok) {
		throw new Error(data?.error?.message || "Stripe checkout failed");
	}
	if (!data?.url || !data?.id) {
		throw new Error("Stripe checkout response is missing a redirect URL");
	}

	return { id: data.id, url: data.url };
}
