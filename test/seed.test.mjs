import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const seedSource = new URL("../prisma/seed.js", import.meta.url);
const seedPath = fileURLToPath(seedSource);

describe("prisma seed", () => {
	it("restores admin credentials and role when the admin account already exists", async () => {
		const source = await readFile(seedSource, "utf8");

		assert.match(source, /update:\s*{[^}]*password:\s*hashedPassword/s);
		assert.match(source, /update:\s*{[^}]*role:\s*"admin"/s);
		assert.match(source, /update:\s*{[^}]*isSuspended:\s*false/s);
	});

	it("keeps seed import-safe so tests can inspect helpers without touching the database", async () => {
		const source = await readFile(seedSource, "utf8");

		assert.match(source, /require\.main\s*===\s*module/);
		assert.match(source, /module\.exports/);
	});

	it("is valid CommonJS before running against PostgreSQL", () => {
		const result = spawnSync(process.execPath, ["--check", seedPath], {
			encoding: "utf8",
		});

		assert.equal(result.status, 0, result.stderr);
	});
});
