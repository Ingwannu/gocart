import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getLegalFooterLinks,
	getLegalPage,
	legalPages,
} from "../lib/legal-pages.mjs";

describe("legalPages", () => {
	it("defines launch-critical legal pages with real public routes", () => {
		assert.deepEqual(
			legalPages.map((page) => page.href),
			["/privacy", "/terms", "/returns-policy"],
		);
		for (const page of legalPages) {
			assert.ok(page.title.length > 8);
			assert.ok(page.sections.length >= 3);
			assert.ok(page.sections.every((section) => section.body.length > 40));
		}
	});
});

describe("getLegalPage", () => {
	it("finds legal page content by slug", () => {
		assert.equal(getLegalPage("privacy").title, "Privacy Policy");
		assert.equal(getLegalPage("missing"), null);
	});
});

describe("getLegalFooterLinks", () => {
	it("keeps footer legal links off the home page", () => {
		assert.deepEqual(getLegalFooterLinks(), [
			{ labelKey: "footer.privacyPolicy", href: "/privacy" },
			{ labelKey: "footer.termsOfService", href: "/terms" },
			{ labelKey: "footer.returnPolicy", href: "/returns-policy" },
		]);
	});
});
