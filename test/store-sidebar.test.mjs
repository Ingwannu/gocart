import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const sidebarSource = new URL("../components/store/StoreSidebar.jsx", import.meta.url);

describe("StoreSidebar permissions", () => {
	it("hides the store profile link when the current user cannot edit the profile", async () => {
		const source = await readFile(sidebarSource, "utf8");

		assert.match(source, /storeInfo\?\.permissions\?\.canEditProfile/);
		assert.match(source, /requiresProfileEdit/);
		assert.match(source, /requiresProductManagement/);
		assert.match(source, /requiresOrderManagement/);
		assert.match(source, /requiresQuestionManagement/);
		assert.match(source, /visibleSidebarLinks\.map/);
	});
});
