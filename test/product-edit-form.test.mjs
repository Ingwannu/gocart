import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeProductEditForm,
	normalizeProductImages,
	normalizeProductTextField,
} from "../lib/product-edit-form.mjs";

describe("normalizeProductEditForm", () => {
	it("converts editable product form fields into an API payload", () => {
		const payload = normalizeProductEditForm({
			name: " Cat Sticker ",
			description: "## Details",
			category: "Hobbies & Crafts",
			groupId: "group_1",
			mrp: "12000",
			price: "9000",
			inStock: true,
			stockQuantity: "12",
			images: ["data:image/png;base64,a", "", "data:image/png;base64,b"],
		});

		assert.deepEqual(payload, {
			name: "Cat Sticker",
			description: "## Details",
			category: "Hobbies & Crafts",
			groupId: "group_1",
			mrp: 12000,
			price: 9000,
			inStock: true,
			stockQuantity: 12,
			images: ["data:image/png;base64,a", "data:image/png;base64,b"],
			deliveryType: "physical",
			digitalAssetName: "",
			digitalAssetUrl: "",
		});
	});

	it("converts digital product form fields into downloadable product payloads", () => {
		const payload = normalizeProductEditForm({
			name: " Source Pack ",
			description: "Download after purchase",
			category: "Code",
			mrp: "100",
			price: "50",
			inStock: true,
			stockQuantity: "",
				images: ["/uploads/preview.png"],
				deliveryType: "digital",
				digitalAssetName: " source.zip ",
				digitalAssetUrl: " private://uploads/abc123-source.zip ",
			});

		assert.deepEqual(payload, {
			name: "Source Pack",
			description: "Download after purchase",
			category: "Code",
			groupId: null,
			mrp: 100,
			price: 50,
			inStock: true,
			stockQuantity: null,
			images: ["/uploads/preview.png"],
				deliveryType: "digital",
				digitalAssetName: "source.zip",
				digitalAssetUrl: "private://uploads/abc123-source.zip",
			});
	});

	it("rejects invalid pricing before calling the API", () => {
		assert.throws(
			() =>
				normalizeProductEditForm({
					name: "Bad",
					description: "Bad",
					category: "Others",
					mrp: "100",
					price: "200",
					inStock: true,
					stockQuantity: "",
					images: ["data:image/png;base64,a"],
				}),
			/Invalid product pricing/,
		);
	});

	it("rejects invalid stock quantities", () => {
		assert.throws(
			() =>
				normalizeProductEditForm({
					name: "Bad",
					description: "Bad",
					category: "Others",
					mrp: "200",
					price: "100",
					inStock: true,
					stockQuantity: "-1",
					images: ["data:image/png;base64,a"],
				}),
			/Invalid stock quantity/,
		);
	});
});

describe("normalizeProductTextField", () => {
	it("trims required product text fields", () => {
		assert.equal(normalizeProductTextField("name", "  Product  "), "Product");
		assert.equal(normalizeProductTextField("category", "  Group  "), "Group");
	});

	it("rejects blank product text fields", () => {
		assert.throws(
			() => normalizeProductTextField("description", "   "),
			/Missing required product fields/,
		);
	});
});

describe("normalizeProductImages", () => {
	it("trims image URLs and removes blanks", () => {
		assert.deepEqual(normalizeProductImages([" /a.png ", "", null, "/b.png"]), [
			"/a.png",
			"/b.png",
		]);
	});

	it("unwraps image objects to URL strings before saving products", () => {
		assert.deepEqual(
			normalizeProductImages([
				{ src: "/placeholder.png" },
				{ src: " /uploads/product.png " },
				{ src: "" },
			]),
			["/placeholder.png", "/uploads/product.png"],
		);
	});
});
