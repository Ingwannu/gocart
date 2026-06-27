import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pageSource = new URL("../app/store/profile/page.jsx", import.meta.url);

describe("StoreProfilePage permissions", () => {
	it("renders the unauthorized state instead of the edit form when profile edit is not allowed", async () => {
		const source = await readFile(pageSource, "utf8");

		assert.match(source, /store\?\.permissions\?\.canEditProfile === false/);
		assert.match(source, /t\("store\.notAuthorized"\)/);
	});
});
