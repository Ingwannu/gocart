import { canUploadStoreAssets } from "./store-access.mjs";

// Hot path uploads keep files on the local disk under storage/private/uploads.
// Source-code and other large digital goods can be tens or hundreds of GB, so
// 300 GB leaves headroom for project bundles without choking the default disk.
const MAX_UPLOAD_SIZE = 300 * 1024 * 1024 * 1024;
export const PRIVATE_UPLOAD_URL_PREFIX = "private://uploads/";

// MIME types we can map to a known safe extension even when the client sends a
// loose filename. Browsers under-report source-code MIME types, so this only
// seeds the fallback; the filename extension is authoritative for code assets.
const extensionByType = {
	"image/gif": "gif",
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf",
	"application/zip": "zip",
	"text/csv": "csv",
	"text/markdown": "md",
	"text/plain": "txt",
	"application/json": "json",
	"application/javascript": "js",
	"text/javascript": "js",
	"application/x-sh": "sh",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export const contentTypeByExtension = Object.fromEntries(
	Object.entries(extensionByType).map(([type, extension]) => [extension, type]),
);

// Extension denylist narrowed to genuine native-executable surfaces only.
// Source code (js, mjs, cjs, sh, php, html, svg, ...) is intentionally allowed
// because this is a source-code marketplace; server-side execution is never
// implied by storing these bytes. Keep this to artifacts that are dangerous
// purely by being saved/shared (Windows executables, shell triggers, etc.).
const blockedExtensions = new Set([
	"bat",
	"cmd",
	"com",
	"exe",
	"jar",
	"ps1",
]);

// Source-code content-type canonicalization. Browsers send a wide mix of
// loose MIME types for code files; normalize a handful of common ones so the
// stored filename gets a sensible, predictable extension.
const codeMimeTypeByExtension = {
	js: "text/javascript",
	mjs: "text/javascript",
	cjs: "text/javascript",
	ts: "application/typescript",
	jsx: "text/jsx",
	tsx: "text/tsx",
	py: "text/x-python",
	rb: "text/x-ruby",
	go: "text/x-go",
	rs: "text/x-rust",
	java: "text/x-java-source",
	c: "text/x-c",
	h: "text/x-c",
	cpp: "text/x-c++",
	hpp: "text/x-c++",
	cs: "text/x-csharp",
	php: "application/x-php",
	sh: "application/x-sh",
	bash: "application/x-sh",
	zsh: "application/x-sh",
	html: "text/html",
	htm: "text/html",
	css: "text/css",
	scss: "text/x-scss",
	yaml: "text/yaml",
	yml: "text/yaml",
	xml: "application/xml",
	sql: "application/sql",
	dockerfile: "text/plain",
	toml: "text/plain",
	ini: "text/plain",
	env: "text/plain",
	swift: "text/x-swift",
	kt: "text/x-kotlin",
	dart: "application/dart",
	lua: "text/x-lua",
	r: "text/x-r",
	jl: "text/x-julia",
	woff: "font/woff",
	woff2: "font/woff2",
};

Object.assign(contentTypeByExtension, codeMimeTypeByExtension);

function extensionFromName(name) {
	const match = String(name || "").toLowerCase().match(/\.([a-z0-9]{1,16})$/);
	return match?.[1] || "";
}

function sanitizeBaseName(name) {
	const withoutPath = String(name || "upload").split(/[\\/]/).pop() || "upload";
	const withoutExtension = withoutPath.replace(/\.[^.]+$/, "");
	return (
		withoutExtension
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 80) || "upload"
	);
}

export function isPrivateUploadUrl(value) {
	const url = String(value || "").trim();
	if (!url.startsWith(PRIVATE_UPLOAD_URL_PREFIX)) return false;
	const fileName = url.slice(PRIVATE_UPLOAD_URL_PREFIX.length);
	return /^[a-z0-9]+-[a-z0-9-]+\.[a-z0-9]{1,16}$/.test(fileName);
}

export function fileNameFromPrivateUploadUrl(value) {
	const url = String(value || "").trim();
	if (!isPrivateUploadUrl(url)) return "";
	return url.slice(PRIVATE_UPLOAD_URL_PREFIX.length);
}

export function contentTypeForUploadFileName(fileName) {
	return contentTypeByExtension[extensionFromName(fileName)] || "application/octet-stream";
}

export function validateUploadFileMeta(file) {
	const size = Number(file?.size);
	const type = String(file?.type || "").toLowerCase();

	if (!file?.name) return { ok: false, error: "File name is required" };
	if (!Number.isFinite(size) || size <= 0) {
		return { ok: false, error: "File is empty" };
	}
	if (size > MAX_UPLOAD_SIZE) {
		return { ok: false, error: "File must be 300 GB or smaller" };
	}

	// Filename extension is authoritative for source-code packages.
	const extension = extensionFromName(file.name);
	if (blockedExtensions.has(extension)) {
		return { ok: false, error: "File extension is not allowed" };
	}
	// Accept any extension that isn't blocked. Source code is the whole point
	// of this marketplace, so we intentionally do not gate on a MIME allowlist;
	// unknown types (browser sends "" for many code files) still pass here.
	if (type && !type.startsWith("application/octet-stream")) {
		// Only sanity-check the supplied type if it clearly claims to be a
		// blocked executable MIME (e.g. someone renames inline). This is a
		// secondary guard; the extension check above stays authoritative.
		const blockedMimePrefixes = [
			"application/x-msdownload",
			"application/x-dosexec",
		];
		if (blockedMimePrefixes.some((prefix) => type.startsWith(prefix))) {
			return { ok: false, error: "File type is not allowed" };
		}
	}

	return { ok: true };
}

export function canUploadAssets(user, store) {
	if (user?.role === "admin") return true;
	return canUploadStoreAssets(user, store);
}

export function createUploadStoreAccessWhere(user) {
	return {
		OR: [
			{ userId: user.id },
			{ staffMembers: { some: { userId: user.id, isActive: true } } },
		],
	};
}

export function buildStoredUpload({ uploadId, name, type, visibility = "public" }) {
	// For source-code extensions the filename is authoritative: browsers
	// rarely send a meaningful MIME type for code, and the seller picks the
	// extension. For everything else prefer the MIME-derived extension to keep
	// the attachment spoof guard (e.g. invoice.exe as application/pdf -> .pdf).
	const nameExtension = extensionFromName(name);
	const extension =
		codeMimeTypeByExtension[nameExtension]
			? nameExtension
			: extensionByType[type] || nameExtension || "bin";
	const fileName = `${uploadId}-${sanitizeBaseName(name)}.${extension}`;

	if (visibility === "private") {
		return {
			fileName,
			relativeUrl: `${PRIVATE_UPLOAD_URL_PREFIX}${fileName}`,
			publicPath: null,
		};
	}

	return {
		fileName,
		relativeUrl: `/uploads/${fileName}`,
		publicPath: `uploads/${fileName}`,
	};
}
