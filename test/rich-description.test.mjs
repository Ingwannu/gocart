import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	appendDescriptionAsset,
	plainRichDescription,
	renderRichDescription,
} from "../lib/rich-description.mjs";

describe("renderRichDescription", () => {
	it("renders markdown blocks and inline formatting", () => {
		const html = renderRichDescription(
			"## Detail\n\n**Bold** text\n\n![cat](/uploads/cat.png)",
		);

		assert.match(html, /<h2>Detail<\/h2>/);
		assert.match(html, /<strong>Bold<\/strong> text/);
		assert.match(html, /<img alt="cat" src="\/uploads\/cat.png"/);
	});

	it("allows a small safe html and style subset", () => {
		const html = renderRichDescription(
			'<div style="color: red; position: fixed"><span style="font-weight: 700">Notice</span></div>',
		);

		assert.match(html, /<div style="color: red">/);
		assert.match(html, /<span style="font-weight: 700">Notice<\/span>/);
		assert.doesNotMatch(html, /position/);
	});

	it("removes scripts and event handlers", () => {
		const html = renderRichDescription(
			'<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)">',
		);

		assert.doesNotMatch(html, /script/);
		assert.doesNotMatch(html, /onerror/);
		assert.doesNotMatch(html, /javascript/);
	});
});

describe("appendDescriptionAsset", () => {
	it("appends image files as markdown images and other files as links", () => {
		assert.equal(
			appendDescriptionAsset("Intro", {
				name: "cat.png",
				url: "/uploads/cat.png",
				type: "image/png",
			}),
			"Intro\n\n![cat.png](/uploads/cat.png)",
		);
		assert.equal(
			appendDescriptionAsset("Intro", {
				name: "manual.pdf",
				url: "/uploads/manual.pdf",
				type: "application/pdf",
			}),
			"Intro\n\n[manual.pdf](/uploads/manual.pdf)",
		);
	});
});

describe("plainRichDescription", () => {
	it("strips rich markup for compact management tables", () => {
		assert.equal(
			plainRichDescription("## Title\n\n**Body** <b>HTML</b>"),
			"Title Body HTML",
		);
	});
});
