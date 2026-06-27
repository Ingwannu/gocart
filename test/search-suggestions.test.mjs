import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildSearchSuggestionWhere,
	normalizeSearchSuggestionQuery,
	parseSearchSuggestions,
} from "../lib/search-suggestions.mjs";

describe("normalizeSearchSuggestionQuery", () => {
	it("trims queries and clamps limits", () => {
		assert.deepEqual(
			normalizeSearchSuggestionQuery({ q: "  keyboard  ", limit: "99" }),
			{ query: "keyboard", limit: 8 },
		);
	});

	it("rejects queries shorter than two characters", () => {
		assert.deepEqual(normalizeSearchSuggestionQuery({ q: " a " }), {
			query: "",
			limit: 6,
		});
	});
});

describe("buildSearchSuggestionWhere", () => {
	it("creates public product, category, group, and store filters", () => {
		assert.deepEqual(buildSearchSuggestionWhere("desk"), {
			products: {
				inStock: true,
				isArchived: false,
				OR: [
					{ stockQuantity: null },
					{ stockQuantity: { gt: 0 } },
				],
				store: { status: "approved", isActive: true },
				AND: [
					{
							OR: [
								{ name: { contains: "desk", mode: "insensitive" } },
								{ description: { contains: "desk", mode: "insensitive" } },
								{ category: { contains: "desk", mode: "insensitive" } },
								{ store: { name: { contains: "desk", mode: "insensitive" } } },
							],
					},
				],
			},
			groups: {
				isActive: true,
				OR: [
					{ name: { contains: "desk", mode: "insensitive" } },
					{ description: { contains: "desk", mode: "insensitive" } },
				],
			},
			categories: {
				isActive: true,
				OR: [
					{ name: { contains: "desk", mode: "insensitive" } },
					{ description: { contains: "desk", mode: "insensitive" } },
				],
			},
			stores: {
				status: "approved",
				isActive: true,
				OR: [
					{ name: { contains: "desk", mode: "insensitive" } },
					{ username: { contains: "desk", mode: "insensitive" } },
					{ description: { contains: "desk", mode: "insensitive" } },
				],
			},
		});
	});
});

describe("parseSearchSuggestions", () => {
	it("returns compact suggestion payloads", () => {
		assert.deepEqual(
			parseSearchSuggestions({
				products: [
					{
						id: "product_1",
						name: "Desk Lamp",
						category: "Lighting",
						price: 29,
						images: '["/lamp.png"]',
						store: { username: "lights", name: "Lights" },
					},
					{
						id: "product_2",
						name: "Desk Chair",
						category: "Office",
						price: 99,
						images: '[{"src":"/chair.png"},{"src":""}]',
						store: { username: "office", name: "Office" },
					},
				],
				groups: [{ slug: "lighting", name: "Lighting" }],
				categories: [{ name: "Lighting", slug: "lighting" }],
				stores: [{ username: "lights", name: "Lights" }],
			}),
			{
				products: [
					{
						id: "product_1",
						name: "Desk Lamp",
						category: "Lighting",
						price: 29,
						image: "/lamp.png",
						href: "/product/product_1",
						storeName: "Lights",
					},
					{
						id: "product_2",
						name: "Desk Chair",
						category: "Office",
						price: 99,
						image: "/chair.png",
						href: "/product/product_2",
						storeName: "Office",
					},
				],
				groups: [{ name: "Lighting", href: "/shop?group=lighting" }],
				categories: [{ name: "Lighting", href: "/shop?category=Lighting" }],
				stores: [{ name: "Lights", href: "/shop/lights" }],
			},
		);
	});
});
