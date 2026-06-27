import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const legacyRoute = new URL(
	"../app/api/orders/[orderId]/downloads/[productId]/route.js",
	import.meta.url,
);
const tokenRoute = new URL(
	"../app/api/downloads/[grantId]/route.js",
	import.meta.url,
);

describe("digital download routes", () => {
	it("legacy order endpoint redirects to token-protected download", async () => {
		const source = await readFile(legacyRoute, "utf8");
		assert.match(source, /getDownloadGrantsForOrder/);
		assert.match(source, /NextResponse\.redirect/);
	});

	it("token endpoint enforces grants and supports S3 presign", async () => {
		const source = await readFile(tokenRoute, "utf8");
		assert.match(source, /consumeDownloadGrant/);
		assert.match(source, /findDownloadGrantByToken/);
		assert.match(source, /presignGet/);
		assert.match(source, /getObjectStream|presignGet/);
		assert.match(source, /const consumed = await consumeDownloadGrant\(token\)/);
		assert.match(source, /if \(!consumed\.ok\) return jsonError/);
		assert.doesNotMatch(source, /consumeDownloadGrant\(token\)\.catch\(\(\) => \{\}\)/);
	});
});
