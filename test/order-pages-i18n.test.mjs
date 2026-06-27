import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const adminOrdersSource = new URL("../app/admin/orders/page.jsx", import.meta.url);
const storeOrdersSource = new URL("../app/store/orders/page.jsx", import.meta.url);

const hardcodedOrderPhrases = [
	"Search order, customer, store, product",
	"Search customer, order, product",
	"All order statuses",
	"All statuses",
	"All payments",
	"All payouts",
	"Updating order...",
	"Updating tracking...",
	"Updating payment...",
	"Updating payout...",
	"No orders found",
	"Qty:",
	"Price:",
];

describe("order management pages i18n", () => {
	it("localizes admin order operations and payout controls", async () => {
		const source = await readFile(adminOrdersSource, "utf8");

		assert.match(source, /useTranslation/);
		assert.match(source, /admin\.ordersAndPayouts/);
		assert.match(source, /ordersPage\.searchAdminPlaceholder/);
		assert.match(source, /ordersPage\.allPayouts/);
		assert.match(source, /ordersPage\.payoutAmount/);

		for (const phrase of hardcodedOrderPhrases) {
			assert.doesNotMatch(source, new RegExp(escapeRegex(phrase)));
		}
	});

	it("localizes seller order filtering and detail labels", async () => {
		const source = await readFile(storeOrdersSource, "utf8");

		assert.match(source, /ordersPage\.searchStorePlaceholder/);
		assert.match(source, /ordersPage\.quantityLabel/);
		assert.match(source, /ordersPage\.priceLabel/);
		assert.match(source, /common\.yes/);
		assert.match(source, /common\.no/);

		for (const phrase of hardcodedOrderPhrases) {
			assert.doesNotMatch(source, new RegExp(escapeRegex(phrase)));
		}
	});
});

function escapeRegex(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
