import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canAnswerProductQuestion,
	canDeleteProductQuestion,
	createProductQuestionProductWhere,
	createProductQuestionWhere,
	normalizeProductQuestionAnswerPayload,
	normalizeProductQuestionPayload,
} from "../lib/product-question.mjs";

describe("normalizeProductQuestionPayload", () => {
	it("normalizes customer product questions", () => {
		assert.deepEqual(
			normalizeProductQuestionPayload({
				productId: " product_1 ",
				question: "  Does this include a cable? ",
			}),
			{
				productId: "product_1",
				question: "Does this include a cable?",
			},
		);
	});

	it("rejects missing or low quality questions", () => {
		assert.throws(
			() => normalizeProductQuestionPayload({ productId: "", question: "hello?" }),
			/Product is required/,
		);
		assert.throws(
			() =>
				normalizeProductQuestionPayload({
					productId: "product_1",
					question: "tiny",
				}),
			/Question must be at least 8 characters/,
		);
	});
});

describe("normalizeProductQuestionAnswerPayload", () => {
	it("normalizes seller answers and rejects blanks", () => {
		assert.deepEqual(
			normalizeProductQuestionAnswerPayload({ answer: "  Yes, cable included. " }),
			{ answer: "Yes, cable included." },
		);
		assert.throws(
			() => normalizeProductQuestionAnswerPayload({ answer: " " }),
			/Answer is required/,
		);
	});
});

describe("createProductQuestionWhere", () => {
	it("keeps public question lists limited to public products", () => {
		assert.deepEqual(
			createProductQuestionWhere({
				scope: "public",
				productId: "product_1",
			}),
			{
				productId: "product_1",
				product: {
					isArchived: false,
					inStock: true,
					OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
					store: { status: "approved", isActive: true },
				},
			},
		);
	});

	it("allows admins to inspect all questions with status filters", () => {
		assert.deepEqual(
			createProductQuestionWhere({
				scope: "admin",
				status: "answered",
			}),
			{
				answer: { not: "" },
			},
		);
	});

	it("keeps store scope locked while filtering unanswered questions", () => {
		assert.deepEqual(
			createProductQuestionWhere({
				scope: "store",
				storeId: "store_1",
				status: "unanswered",
				q: " cable ",
			}),
			{
				product: { storeId: "store_1" },
				answer: "",
				OR: [
					{ question: { contains: "cable", mode: "insensitive" } },
					{ answer: { contains: "cable", mode: "insensitive" } },
					{ product: { name: { contains: "cable", mode: "insensitive" } } },
					{ user: { name: { contains: "cable", mode: "insensitive" } } },
					{ user: { email: { contains: "cable", mode: "insensitive" } } },
				],
			},
		);
	});
});

describe("createProductQuestionProductWhere", () => {
	it("keeps question creation aligned with public product visibility", () => {
		assert.deepEqual(createProductQuestionProductWhere("product_1"), {
			id: "product_1",
			isArchived: false,
			inStock: true,
			OR: [{ stockQuantity: null }, { stockQuantity: { gt: 0 } }],
			store: { status: "approved", isActive: true },
		});
	});
});

describe("canAnswerProductQuestion", () => {
	it("allows admins and active store managers only", () => {
		const question = {
			product: {
				store: {
					userId: "owner_1",
					status: "approved",
					isActive: true,
					staffMembers: [
						{ userId: "viewer_1", role: "viewer", isActive: true },
						{ userId: "staff_1", role: "staff", isActive: true },
					],
				},
			},
		};

		assert.equal(canAnswerProductQuestion({ id: "admin_1", role: "admin" }, question), true);
		assert.equal(canAnswerProductQuestion({ id: "owner_1", role: "seller" }, question), true);
		assert.equal(canAnswerProductQuestion({ id: "viewer_1", role: "user" }, question), false);
		assert.equal(canAnswerProductQuestion({ id: "staff_1", role: "user" }, question), true);
		assert.equal(canAnswerProductQuestion({ id: "other", role: "user" }, question), false);
	});
});

describe("canDeleteProductQuestion", () => {
	it("uses the same admin and store-manager moderation boundary", () => {
		const question = {
			product: {
				store: {
					userId: "owner_1",
					status: "approved",
					isActive: true,
					staffMembers: [
						{ userId: "viewer_1", role: "viewer", isActive: true },
						{ userId: "staff_1", role: "staff", isActive: true },
					],
				},
			},
		};

		assert.equal(canDeleteProductQuestion({ id: "admin_1", role: "admin" }, question), true);
		assert.equal(canDeleteProductQuestion({ id: "owner_1", role: "seller" }, question), true);
		assert.equal(canDeleteProductQuestion({ id: "viewer_1", role: "user" }, question), false);
		assert.equal(canDeleteProductQuestion({ id: "staff_1", role: "user" }, question), true);
		assert.equal(canDeleteProductQuestion({ id: "asker_1", role: "user" }, { ...question, userId: "asker_1" }), false);
	});
});
