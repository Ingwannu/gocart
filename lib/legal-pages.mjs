export const legalPages = [
	{
		slug: "privacy",
		href: "/privacy",
		title: "Privacy Policy",
		updatedAt: "June 5, 2026",
		summary:
			"How Wicked Shop collects, uses, stores, and protects customer and seller data.",
		sections: [
			{
				heading: "Information we collect",
				body:
					"We collect account details, contact information, addresses, order activity, support messages, store profile data, uploaded product files, and technical data needed to keep the marketplace reliable.",
			},
			{
				heading: "How we use information",
				body:
					"We use this information to process orders, operate stores, provide support, prevent fraud, manage memberships and coupons, send password reset links, and improve search and marketplace quality.",
			},
			{
				heading: "Sharing and retention",
				body:
					"We share only the data needed for marketplace operations, such as buyer shipping details with the relevant seller and payment metadata with payment providers. We retain records while needed for legal, support, security, and accounting purposes.",
			},
			{
				heading: "Your choices",
				body:
					"You can update account details from your account page, request help through support, unsubscribe from newsletters, and ask us to review or remove data where applicable law allows.",
			},
		],
	},
	{
		slug: "terms",
		href: "/terms",
		title: "Terms of Service",
		updatedAt: "June 5, 2026",
		summary:
			"The rules for using Wicked Shop as a buyer, seller, store staff member, or administrator.",
		sections: [
			{
				heading: "Marketplace accounts",
				body:
					"Users are responsible for keeping account credentials secure and for providing accurate profile, address, and store information. Suspended accounts may lose access to ordering, store management, or support features.",
			},
			{
				heading: "Stores and products",
				body:
					"Sellers and authorized staff must publish accurate product information, prices, stock, images, attachments, and descriptions. Wicked Shop may archive products, suspend stores, or adjust permissions to protect buyers and the marketplace.",
			},
			{
				heading: "Orders and payments",
				body:
					"Orders are created when checkout is submitted. Payment status, payout status, tracking details, cancellation, and return handling are managed through Wicked Shop systems and applicable payment providers.",
			},
			{
				heading: "Acceptable use",
				body:
					"Users may not upload malicious files, misrepresent products, abuse support channels, manipulate reviews, or attempt to access administrative or store data without permission.",
			},
		],
	},
	{
		slug: "returns-policy",
		href: "/returns-policy",
		title: "Return and Refund Policy",
		updatedAt: "June 5, 2026",
		summary:
			"How customers request returns and how sellers and administrators review refund outcomes.",
		sections: [
			{
				heading: "Return window",
				body:
					"Customers can request a return for delivered orders through the order history page. Return requests should include a clear reason so support and store operators can review the case efficiently.",
			},
			{
				heading: "Review process",
				body:
					"Administrators review return requests, order status, product details, and customer notes before approving, rejecting, or refunding a request. Sellers may be contacted for fulfillment context.",
			},
			{
				heading: "Refunds",
				body:
					"Approved refunds are recorded with a refund amount and resolution note. Actual payment reversal timing can depend on the payment provider, bank, and order payment method.",
			},
			{
				heading: "Excluded cases",
				body:
					"Returns may be rejected when the order is not delivered, the request reason is incomplete, the product was misused, or the request conflicts with marketplace safety and abuse prevention policies.",
			},
		],
	},
];

export function getLegalPage(slug) {
	return legalPages.find((page) => page.slug === slug) || null;
}

export function getLegalFooterLinks() {
	return [
		{ labelKey: "footer.privacyPolicy", href: "/privacy" },
		{ labelKey: "footer.termsOfService", href: "/terms" },
		{ labelKey: "footer.returnPolicy", href: "/returns-policy" },
	];
}
