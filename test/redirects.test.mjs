import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { normalizeInternalRedirect } from "../lib/redirects.mjs";

const loginPage = new URL("../app/(public)/login/page.jsx", import.meta.url);
const loadingPage = new URL("../app/(public)/loading/page.jsx", import.meta.url);

describe("normalizeInternalRedirect", () => {
	it("allows internal paths with query strings and hashes", () => {
		assert.equal(normalizeInternalRedirect("/admin"), "/admin");
		assert.equal(
			normalizeInternalRedirect("/shop?search=plugin#results"),
			"/shop?search=plugin#results",
		);
	});

	it("rejects external, protocol-relative, and non-path redirects", () => {
		assert.equal(normalizeInternalRedirect("https://evil.example/admin"), "/");
		assert.equal(normalizeInternalRedirect("//evil.example/admin"), "/");
		assert.equal(normalizeInternalRedirect("javascript:alert(1)"), "/");
		assert.equal(normalizeInternalRedirect("\\\\evil.example\\admin"), "/");
		assert.equal(normalizeInternalRedirect("", "/fallback"), "/fallback");
	});
});

describe("public redirect pages", () => {
	it("sanitizes login callbackUrl before navigating", async () => {
		const source = await readFile(loginPage, "utf8");
		assert.match(source, /normalizeInternalRedirect/);
		assert.match(source, /callbackUrl/);
		assert.doesNotMatch(source, /router\.push\("\/"\)/);
	});

	it("sanitizes loading nextUrl before delayed navigation", async () => {
		const source = await readFile(loadingPage, "utf8");
		assert.match(source, /normalizeInternalRedirect/);
		assert.match(source, /nextUrl/);
		assert.match(source, /clearTimeout/);
	});
});
