import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

describe("storage abstraction", () => {
	it("local backend round-trips a private digital asset", async () => {
		const tmp = await mkdtemp(path.join(tmpdir(), "wickedshop-storage-"));
		const cwd = process.cwd();
		process.chdir(tmp);
		try {
			const { putObject, getObjectStream, deleteObject } = await import(
				"../lib/storage.mjs"
			);
			const storedUrl = "private://uploads/abc123-source-code.zip";
			const bytes = Buffer.from("console.log('hello')\n");
			await putObject({
				storedUrl,
				body: bytes,
				contentType: "application/zip",
			});
			const { stream, contentType, contentLength } =
				await getObjectStream(storedUrl);
			const chunks = [];
			for await (const chunk of stream) chunks.push(chunk);
			const retrieved = Buffer.concat(chunks);
			assert.equal(retrieved.toString(), "console.log('hello')\n");
			assert.equal(contentType, "application/zip");
			assert.equal(contentLength, bytes.length);
			await deleteObject(storedUrl);
			await assert.rejects(() => stat(path.join(tmp, "storage", "private", "uploads", "abc123-source-code.zip")));
		} finally {
			process.chdir(cwd);
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it("local backend round-trips a public image asset", async () => {
		const tmp = await mkdtemp(path.join(tmpdir(), "wickedshop-storage-"));
		const cwd = process.cwd();
		process.chdir(tmp);
		try {
			const { putObject, getObjectStream } = await import("../lib/storage.mjs");
			const storedUrl = "/uploads/abc123-cat-photo.png";
			const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
			await putObject({
				storedUrl,
				body: bytes,
				contentType: "image/png",
			});
			const { stream, contentType } = await getObjectStream(storedUrl);
			const chunks = [];
			for await (const chunk of stream) chunks.push(chunk);
			assert.deepEqual(Buffer.concat(chunks), bytes);
			assert.equal(contentType, "image/png");
		} finally {
			process.chdir(cwd);
			await rm(tmp, { recursive: true, force: true });
		}
	});

	it("presignGet returns null on the local backend", async () => {
		const { presignGet } = await import("../lib/storage.mjs");
		const url = await presignGet("private://uploads/abc123-x.zip");
		assert.equal(url, null);
	});
});
