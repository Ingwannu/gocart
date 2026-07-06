import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as upload from "../lib/upload.mjs";
import { resolvePrivateUpload } from "../lib/private-upload-storage.mjs";

const {
	buildStoredUpload,
	canUploadAssets,
	isPrivateUploadUrl,
	validateUploadFileMeta,
} = upload;

describe("validateUploadFileMeta", () => {
	it("accepts raster images for public uploads", () => {
		for (const [name, type] of [
			["cat.png", "image/png"],
			["photo.jpg", "image/jpeg"],
			["photo.jpeg", "image/jpeg"],
			["banner.webp", "image/webp"],
			["anim.gif", "image/gif"],
		]) {
			assert.equal(
				validateUploadFileMeta({ name, type, size: 1024 }).ok,
				true,
				`expected ${name} to be accepted as a public upload`,
			);
		}
	});

	it("rejects browser-renderable non-images for public uploads", () => {
		for (const [name, type] of [
			["icon.svg", "image/svg+xml"],
			["page.html", "text/html"],
			["app.js", "text/javascript"],
			["manual.pdf", "application/pdf"],
			["source-code.zip", "application/zip"],
			["fake.png", "text/html"],
		]) {
			assert.equal(
				validateUploadFileMeta({ name, type, size: 1024 }).ok,
				false,
				`expected ${name} (${type}) to be rejected as a public upload`,
			);
		}
	});

	it("accepts attachments and archives for private digital downloads", () => {
		assert.equal(
			validateUploadFileMeta(
				{ name: "manual.pdf", type: "application/pdf", size: 1024 },
				{ visibility: "private" },
			).ok,
			true,
		);
		assert.equal(
			validateUploadFileMeta(
				{ name: "source-code.zip", type: "application/zip", size: 1024 },
				{ visibility: "private" },
			).ok,
			true,
		);
	});

	it("accepts source-code extensions for private digital downloads", () => {
		for (const name of [
			"app.js",
			"server.mjs",
			"utils.cjs",
			"main.ts",
			"widget.tsx",
			"app.py",
			"main.go",
			"lib.rs",
			"index.html",
			"styles.css",
			"config.yml",
			"Dockerfile",
			"install.sh",
			"page.php",
			"icon.svg",
		]) {
			assert.equal(
				validateUploadFileMeta(
					{ name, type: "application/octet-stream", size: 1024 },
					{ visibility: "private" },
				).ok,
				true,
				`expected ${name} to be accepted`,
			);
		}
	});

	it("keeps rejecting native executables even for private uploads", () => {
		assert.equal(
			validateUploadFileMeta(
				{ name: "installer.exe", type: "application/x-msdownload", size: 1024 },
				{ visibility: "private" },
			).ok,
			false,
		);
		assert.equal(
			validateUploadFileMeta(
				{ name: "setup.bat", type: "application/x-msdownload", size: 1024 },
				{ visibility: "private" },
			).ok,
			false,
		);
		assert.equal(
			validateUploadFileMeta(
				{ name: "script.cmd", type: "application/octet-stream", size: 1024 },
				{ visibility: "private" },
			).ok,
			false,
		);
	});

	it("accepts files up to 300 GB and rejects larger", () => {
		const justUnder = 300 * 1024 * 1024 * 1024;
		assert.equal(
			validateUploadFileMeta(
				{ name: "big-bundle.zip", type: "application/zip", size: justUnder },
				{ visibility: "private" },
			).ok,
			true,
		);
		assert.equal(
			validateUploadFileMeta(
				{ name: "too-big.zip", type: "application/zip", size: justUnder + 1 },
				{ visibility: "private" },
			).ok,
			false,
		);
	});

	it("rejects empty files", () => {
		assert.equal(
			validateUploadFileMeta({
				name: "empty.txt",
				type: "text/plain",
				size: 0,
			}).ok,
			false,
		);
	});
});

describe("buildStoredUpload", () => {
	it("creates a safe public upload URL and filesystem path", () => {
		assert.deepEqual(
			buildStoredUpload({
				uploadId: "abc123",
				name: "../../Cat Photo.PNG",
				type: "image/png",
			}),
			{
				fileName: "abc123-cat-photo.png",
				relativeUrl: "/uploads/abc123-cat-photo.png",
				publicPath: "uploads/abc123-cat-photo.png",
			},
		);
	});

	it("uses the MIME type extension instead of an unsafe original extension", () => {
		assert.deepEqual(
			buildStoredUpload({
				uploadId: "abc123",
				name: "invoice.exe",
				type: "application/pdf",
			}),
			{
				fileName: "abc123-invoice.pdf",
				relativeUrl: "/uploads/abc123-invoice.pdf",
				publicPath: "uploads/abc123-invoice.pdf",
			},
		);
	});

	it("falls back to filename extension for source-code assets", () => {
		const stored = buildStoredUpload({
			uploadId: "abc123",
			name: "index.tsx",
			type: "text/plain",
		});
		assert.equal(stored.fileName, "abc123-index.tsx");
		assert.equal(stored.relativeUrl, "/uploads/abc123-index.tsx");
	});

	it("creates private upload tokens outside the public uploads URL space", () => {
		const stored = buildStoredUpload({
			uploadId: "abc123",
			name: "source-code.zip",
			type: "application/zip",
			visibility: "private",
		});

		assert.equal(stored.fileName, "abc123-source-code.zip");
		assert.equal(stored.relativeUrl, "private://uploads/abc123-source-code.zip");
		assert.equal(stored.publicPath, null);
	});

	it("resolves only safe private upload tokens to storage paths", () => {
		assert.equal(isPrivateUploadUrl("private://uploads/abc123-source-code.zip"), true);
		assert.equal(isPrivateUploadUrl("/uploads/abc123-source-code.zip"), false);
		assert.equal(isPrivateUploadUrl("private://uploads/../source-code.zip"), false);

		const uploadFile = resolvePrivateUpload("private://uploads/abc123-source-code.zip");
		assert.equal(uploadFile.fileName, "abc123-source-code.zip");
		assert.equal(uploadFile.contentType, "application/zip");
		assert.match(uploadFile.storagePath, /storage[/\\]private[/\\]uploads[/\\]abc123-source-code\.zip$/);
		assert.equal(resolvePrivateUpload("https://example.com/source-code.zip"), null);
	});
});

describe("canUploadAssets", () => {
	it("allows admins without a seller store", () => {
		assert.equal(canUploadAssets({ role: "admin" }, null), true);
	});

	it("allows sellers only for their own approved active store", () => {
		assert.equal(
			canUploadAssets(
				{ id: "owner", role: "seller" },
				{ userId: "owner", status: "approved", isActive: true },
			),
			true,
		);
		assert.equal(
			canUploadAssets(
				{ id: "owner", role: "seller" },
				{ userId: "owner", status: "pending", isActive: true },
			),
			false,
		);
		assert.equal(
			canUploadAssets(
				{ id: "other-seller", role: "seller" },
				{ userId: "owner", status: "approved", isActive: true },
			),
			false,
		);
	});

	it("allows active store staff to upload product and description assets", () => {
		assert.equal(
			canUploadAssets(
				{ id: "staff", role: "user" },
				{
					userId: "owner",
					status: "approved",
					isActive: true,
					staffMembers: [{ userId: "staff", role: "staff", isActive: true }],
				},
			),
			true,
		);
	});

	it("blocks read-only viewers from uploading assets", () => {
		assert.equal(
			canUploadAssets(
				{ id: "viewer", role: "user" },
				{
					userId: "owner",
					status: "approved",
					isActive: true,
					staffMembers: [{ userId: "viewer", role: "viewer", isActive: true }],
				},
			),
			false,
		);
	});

	it("rejects active store uploads after seller permission is revoked", () => {
		assert.equal(
			canUploadAssets(
				{ id: "owner", role: "user" },
				{ userId: "owner", status: "approved", isActive: true },
			),
			false,
		);
	});
});

describe("createUploadStoreAccessWhere", () => {
	it("finds stores owned by or actively assigned to the current uploader", () => {
		assert.equal(typeof upload.createUploadStoreAccessWhere, "function");
		assert.deepEqual(upload.createUploadStoreAccessWhere({ id: "staff" }), {
			OR: [
				{ userId: "staff" },
				{ staffMembers: { some: { userId: "staff", isActive: true } } },
			],
		});
	});
});
