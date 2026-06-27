import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveProductImageSrc,
	resolveProductImages,
} from "../lib/product-image.mjs";

describe("resolveProductImageSrc", () => {
	it("accepts string image URLs", () => {
		assert.equal(resolveProductImageSrc(" /uploads/product.png "), "/uploads/product.png");
	});

	it("unwraps Next static image imports to their src value", () => {
		assert.equal(
			resolveProductImageSrc({ src: "/_next/static/media/product.png" }),
			"/_next/static/media/product.png",
		);
	});

	it("falls back when image data is missing or invalid", () => {
		assert.equal(resolveProductImageSrc({ src: "" }), "/placeholder.png");
		assert.equal(resolveProductImageSrc(null), "/placeholder.png");
	});
});

describe("resolveProductImages", () => {
	it("returns normalized image URLs and guarantees one fallback image", () => {
		assert.deepEqual(
			resolveProductImages([{ src: "/static.png" }, " /uploads/a.png ", null]),
			["/static.png", "/uploads/a.png"],
		);
		assert.deepEqual(resolveProductImages([]), ["/placeholder.png"]);
	});
});
