import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTranslation } from "../lib/i18n/format.mjs";

describe("formatTranslation", () => {
	it("replaces named variables in translation strings", () => {
		assert.equal(
			formatTranslation("전체 {total}개 중 {current}개 표시", {
				total: 8,
				current: 4,
			}),
			"전체 8개 중 4개 표시",
		);
	});

	it("leaves unknown variables visible", () => {
		assert.equal(formatTranslation("Showing {current} of {total}", { current: 2 }), "Showing 2 of {total}");
	});
});
