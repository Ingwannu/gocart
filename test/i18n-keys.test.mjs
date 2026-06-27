import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const sourceRoots = ["app", "components"];
const staticTranslationKeyPattern = /\bt\(\s*["'`]([a-zA-Z0-9_.-]+)["'`]/g;
const en = loadDictionary("lib/i18n/en.js", "en");
const ko = loadDictionary("lib/i18n/ko.js", "ko");

function loadDictionary(filePath, variableName) {
	const source = readFileSync(filePath, "utf8");
	const executableSource = source.replace(
		new RegExp(`export\\s+default\\s+${variableName}\\s*;\\s*$`),
		`return ${variableName};`,
	);
	return Function(executableSource)();
}

function listSourceFiles(root) {
	const entries = readdirSync(root).flatMap((entry) => {
		const filePath = path.join(root, entry);
		const stats = statSync(filePath);
		if (stats.isDirectory()) return listSourceFiles(filePath);
		return filePath;
	});

	return entries.filter((filePath) => /\.(js|jsx|mjs)$/.test(filePath));
}

function extractStaticTranslationKeys() {
	const keys = new Set();
	for (const root of sourceRoots) {
		for (const filePath of listSourceFiles(root)) {
			const source = readFileSync(filePath, "utf8");
			for (const match of source.matchAll(staticTranslationKeyPattern)) {
				keys.add(match[1]);
			}
		}
	}
	return [...keys].sort();
}

function hasTranslation(dictionary, key) {
	return key.split(".").every((part, index, parts) => {
		const next = parts.slice(0, index + 1).reduce((value, current) => value?.[current], dictionary);
		return index === parts.length - 1
			? typeof next === "string" || typeof next === "function"
			: Boolean(next && typeof next === "object");
	});
}

describe("static i18n keys", () => {
	it("has every statically-used translation key in both locales", () => {
		const keys = extractStaticTranslationKeys();
		const missing = keys.flatMap((key) => {
			const entries = [];
			if (!hasTranslation(en, key)) entries.push(`en:${key}`);
			if (!hasTranslation(ko, key)) entries.push(`ko:${key}`);
			return entries;
		});

		assert.deepEqual(missing, []);
	});
});
