import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildOrderPagination,
	buildOrderQuery,
	canManageOrderForStore,
	createOrderWhere,
	createOrderStockRestoreItems,
	isAllowedOrderStatusTransition,
	normalizeOrderFulfillmentPayload,
} from "../lib/order-filters.mjs";

describe("createOrderWhere", () => {
	it("keeps buyer scope locked to the current user while adding search and status filters", () => {
		assert.deepEqual(
			createOrderWhere({
				scope: "buyer",
				userId: "user_1",
				q: "gadget",
				status: "PROCESSING",
			}),
			{
				userId: "user_1",
				status: "PROCESSING",
				OR: [
					{ id: { contains: "gadget", mode: "insensitive" } },
					{ user: { name: { contains: "gadget", mode: "insensitive" } } },
					{ user: { email: { contains: "gadget", mode: "insensitive" } } },
					{ store: { name: { contains: "gadget", mode: "insensitive" } } },
					{ store: { username: { contains: "gadget", mode: "insensitive" } } },
					{ trackingCarrier: { contains: "gadget", mode: "insensitive" } },
					{ trackingNumber: { contains: "gadget", mode: "insensitive" } },
					{
						orderItems: {
							some: {
								product: { name: { contains: "gadget", mode: "insensitive" } },
							},
						},
					},
				],
			},
		);
	});

	it("keeps store scope locked to the seller store and supports paid filters", () => {
		assert.deepEqual(
			createOrderWhere({
				scope: "store",
				storeId: "store_1",
				paid: "false",
			}),
			{
				storeId: "store_1",
				isPaid: false,
			},
		);
	});

	it("allows admin payout and payment filters without adding user or store scope", () => {
		assert.deepEqual(
			createOrderWhere({
				scope: "admin",
				payoutStatus: "READY",
				paid: "true",
			}),
			{
				payoutStatus: "READY",
				isPaid: true,
			},
		);
	});

	it("ignores invalid enum and boolean filter values", () => {
		assert.deepEqual(
			createOrderWhere({
				scope: "admin",
				status: "cancelled",
				payoutStatus: "done",
				paid: "sometimes",
			}),
			{},
		);
	});
});

describe("normalizeOrderFulfillmentPayload", () => {
	it("normalizes seller-editable tracking fields", () => {
		assert.deepEqual(
			normalizeOrderFulfillmentPayload({
				trackingCarrier: "  CJ 대한통운 ",
				trackingNumber: "  1234-5678 ",
				trackingUrl: " https://track.example.com/1234 ",
				payoutStatus: "PAID",
			}),
			{
				trackingCarrier: "CJ 대한통운",
				trackingNumber: "1234-5678",
				trackingUrl: "https://track.example.com/1234",
			},
		);
	});

	it("allows clearing tracking fields and rejects invalid tracking URLs", () => {
		assert.deepEqual(
			normalizeOrderFulfillmentPayload({
				trackingCarrier: "",
				trackingNumber: "",
				trackingUrl: "",
			}),
			{
				trackingCarrier: "",
				trackingNumber: "",
				trackingUrl: "",
			},
		);
		assert.throws(
			() => normalizeOrderFulfillmentPayload({ trackingUrl: "javascript:alert(1)" }),
			/Tracking URL must start with http/,
		);
	});
});

describe("canManageOrderForStore", () => {
	it("allows active store staff to manage store orders", () => {
		const order = {
			store: {
				id: "store_1",
				userId: "owner",
				status: "approved",
				isActive: true,
				staffMembers: [
					{ userId: "viewer", role: "viewer", isActive: true },
					{ userId: "staff", role: "staff", isActive: true },
					{ userId: "inactive", isActive: false },
				],
			},
		};

		assert.equal(canManageOrderForStore({ id: "viewer", role: "user" }, order), false);
		assert.equal(canManageOrderForStore({ id: "staff", role: "user" }, order), true);
		assert.equal(canManageOrderForStore({ id: "inactive", role: "user" }, order), false);
		assert.equal(canManageOrderForStore({ id: "owner", role: "seller" }, order), true);
		assert.equal(canManageOrderForStore({ id: "admin", role: "admin" }, order), true);
	});
});

describe("isAllowedOrderStatusTransition", () => {
	it("allows buyers and sellers to cancel only orders that have not shipped", () => {
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "user",
				isBuyer: true,
				currentStatus: "ORDER_PLACED",
				nextStatus: "CANCELLED",
			}),
			true,
		);
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "user",
				isBuyer: true,
				currentStatus: "PROCESSING",
				nextStatus: "CANCELLED",
			}),
			false,
		);
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "seller",
				currentStatus: "PROCESSING",
				nextStatus: "CANCELLED",
			}),
			true,
		);
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "seller",
				currentStatus: "SHIPPED",
				nextStatus: "CANCELLED",
			}),
			false,
		);
	});

	it("allows admins to cancel non-delivered orders and rejects reversing cancelled orders", () => {
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "admin",
				currentStatus: "SHIPPED",
				nextStatus: "CANCELLED",
			}),
			true,
		);
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "admin",
				currentStatus: "DELIVERED",
				nextStatus: "CANCELLED",
			}),
			false,
		);
		assert.equal(
			isAllowedOrderStatusTransition({
				actorRole: "admin",
				currentStatus: "CANCELLED",
				nextStatus: "PROCESSING",
			}),
			false,
		);
	});
});

describe("createOrderStockRestoreItems", () => {
	it("restores tracked stock only when an order first enters cancelled status", () => {
		assert.deepEqual(
			createOrderStockRestoreItems({
				currentStatus: "PROCESSING",
				nextStatus: "CANCELLED",
				orderItems: [
					{ quantity: 2, product: { id: "tracked", stockQuantity: 1 } },
					{ quantity: 3, product: { id: "untracked", stockQuantity: null } },
				],
			}),
			[{ productId: "tracked", quantity: 2 }],
		);

		assert.deepEqual(
			createOrderStockRestoreItems({
				currentStatus: "CANCELLED",
				nextStatus: "CANCELLED",
				orderItems: [{ quantity: 2, product: { id: "tracked", stockQuantity: 1 } }],
			}),
			[],
		);
	});
});

describe("buildOrderQuery", () => {
	it("builds compact order list API URLs with only active filters", () => {
		assert.equal(
			buildOrderQuery({
				scope: "buyer",
				q: "  gadget ",
				status: "PROCESSING",
				paid: "",
				payoutStatus: "READY",
			}),
			"/api/orders?scope=buyer&q=gadget&status=PROCESSING&payoutStatus=READY",
		);
	});

	it("keeps page state after the first page", () => {
		assert.equal(
			buildOrderQuery({ scope: "admin", q: "order", page: 3 }),
			"/api/orders?scope=admin&q=order&page=3",
		);
		assert.equal(buildOrderQuery({ scope: "buyer", page: 1 }), "/api/orders?scope=buyer");
	});
});

describe("buildOrderPagination", () => {
	it("normalizes order list pagination and clamps high limits", () => {
		assert.deepEqual(buildOrderPagination({ page: "4", limit: "999" }, 151), {
			page: 4,
			limit: 50,
			skip: 150,
			take: 50,
			total: 151,
			totalPages: 4,
			hasNextPage: false,
			hasPreviousPage: true,
		});
	});

	it("falls back from invalid pagination values", () => {
		assert.deepEqual(buildOrderPagination({ page: "bad", limit: "0" }, 18), {
			page: 1,
			limit: 25,
			skip: 0,
			take: 25,
			total: 18,
			totalPages: 1,
			hasNextPage: false,
			hasPreviousPage: false,
		});
	});
});
