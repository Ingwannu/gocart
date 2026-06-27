import path from "node:path";
import {
	privateUploadDirectory,
	resolvePrivateUpload,
} from "./private-upload-storage.mjs";
import { contentTypeForUploadFileName } from "./upload.mjs";

// Storage abstraction for digital goods. Two backends share one interface:
//   - local: files under storage/private/uploads (default, dev)
//   - s3:    any S3-compatible object store (R2, Spaces, MinIO, AWS S3)
// Public uploads (product images) always stay on local disk under /public/uploads
// for simple URL serving; only digital-download assets are routed through this
// layer when STORAGE_BACKEND=s3.
//
// Configuration priority: SiteSetting (DB, editable from admin UI) > env vars.
// S3 clients are cached but invalidated whenever settings change via
// site-settings.saveStorageSettings().

let s3ClientCache = null;
let s3ConfigCache = null;

// Register an invalidator with site-settings so post-save the next S3 call
// rebuilds the client instead of reusing stale credentials.
async function registerInvalidator() {
	try {
		const { setStorageClientInvalidator } = await import("./site-settings.mjs");
		setStorageClientInvalidator(() => {
			s3ClientCache = null;
			s3ConfigCache = null;
		});
	} catch {
		// site-settings is optional; ignore in environments without prisma.
	}
}
const registered = registerInvalidator();
void registered;

async function resolveLocalUpload(storedUrl) {
	const privateUpload = resolvePrivateUpload(storedUrl);
	if (privateUpload) return privateUpload;
	const publicMatch = String(storedUrl || "").match(/^\/uploads\/(.+)$/);
	if (publicMatch) {
		const fileName = publicMatch[1];
		return {
			fileName,
			storagePath: path.join(process.cwd(), "public", "uploads", fileName),
			contentType: contentTypeForUploadFileName(fileName) || "application/octet-stream",
			directoryPath: path.join(process.cwd(), "public", "uploads"),
		};
	}
	return null;
}

async function buildS3Config() {
	let settings;
	try {
		const { getStorageSettings } = await import("./site-settings.mjs");
		settings = await getStorageSettings();
	} catch {
		settings = null;
	}
	const backend = settings?.backend || String(process.env.STORAGE_BACKEND || "local").toLowerCase();
	const endpoint = settings?.endpoint ?? process.env.S3_ENDPOINT ?? "";
	const region = settings?.region || process.env.S3_REGION || "auto";
	const bucket = settings?.bucket || process.env.S3_BUCKET || "";
	const accessKeyId = settings?.accessKeyId || process.env.S3_ACCESS_KEY_ID || "";
	const secretAccessKey = settings?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || "";
	const forcePathStyle = settings
		? settings.forcePathStyle
		: String(process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() === "true";
	if (!bucket) {
		throw new Error("S3 storage requires S3_BUCKET to be set");
	}
	if (!accessKeyId || !secretAccessKey) {
		throw new Error(
			"S3 storage requires S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
		);
	}
	return { backend, endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle };
}

async function getS3Client() {
	if (s3ClientCache) return s3ClientCache;
	if (!s3ConfigCache) s3ConfigCache = await buildS3Config();
	const { S3Client } = await import("@aws-sdk/client-s3");
	s3ClientCache = new S3Client({
		region: s3ConfigCache.region,
		endpoint: s3ConfigCache.endpoint || undefined,
		credentials: {
			accessKeyId: s3ConfigCache.accessKeyId,
			secretAccessKey: s3ConfigCache.secretAccessKey,
		},
		forcePathStyle: s3ConfigCache.forcePathStyle,
	});
	return s3ClientCache;
}

async function getS3Config() {
	if (!s3ConfigCache) s3ConfigCache = await buildS3Config();
	return s3ConfigCache;
}

// Convert a stored relativeUrl into an S3 object key.
// private://uploads/abc-foo.tsx -> uploads/abc-foo.tsx
// /uploads/abc-foo.tsx        -> uploads/abc-foo.tsx
function s3KeyFromUrl(storedUrl) {
	const url = String(storedUrl || "");
	const privatePrefix = "private://uploads/";
	if (url.startsWith(privatePrefix)) return `uploads/${url.slice(privatePrefix.length)}`;
	const publicMatch = url.match(/^\/uploads\/(.+)$/);
	if (publicMatch) return `uploads/${publicMatch[1]}`;
	return null;
}

// Resolve current storage backend dynamically: DB setting > env. Cached for a
// short window so calls within one request don't hit the DB repeatedly.
let backendCache = null;
let backendCacheExpiresAt = 0;
const BACKEND_CACHE_TTL_MS = 5 * 1000;

export async function isStorageS3() {
	if (backendCache && backendCacheExpiresAt > Date.now()) {
		return backendCache === "s3";
	}
	let resolved = String(process.env.STORAGE_BACKEND || "local").toLowerCase();
	try {
		const { getStorageSettings } = await import("./site-settings.mjs");
		const settings = await getStorageSettings();
		resolved = String(settings.backend || resolved).toLowerCase();
	} catch {
		// fall back to env
	}
	backendCache = resolved;
	backendCacheExpiresAt = Date.now() + BACKEND_CACHE_TTL_MS;
	return resolved === "s3";
}

// Put object from a stream/Buffer. Returns the stored url (same shape used
// elsewhere: private://uploads/{name} for private, /uploads/{name} for public).
export async function putObject({
	storedUrl,
	body,
	contentType,
	contentLength,
}) {
	if (await isStorageS3()) {
		const client = await getS3Client();
		const { PutObjectCommand } = await import("@aws-sdk/client-s3");
		const cfg = await getS3Config();
		const key = s3KeyFromUrl(storedUrl);
		if (!key) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
		await client.send(
			new PutObjectCommand({
				Bucket: cfg.bucket,
				Key: key,
				Body: body,
				ContentType: contentType || "application/octet-stream",
				ContentLength: contentLength,
			}),
		);
		return;
	}

	const local = await resolveLocalUpload(storedUrl);
	if (!local) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
	const { mkdir, writeFile } = await import("node:fs/promises");
	await mkdir(local.directoryPath, { recursive: true });
	const bytes = body instanceof Uint8Array
		? Buffer.from(body)
		: Buffer.isBuffer(body)
			? body
			: Buffer.from(await new Response(body).arrayBuffer());
	await writeFile(local.storagePath, bytes, { flag: "wx" });
}

// Get a readable stream for a stored asset. Streams keep large source-code
// bundles (up to 300 GB) from being buffered in memory.
export async function getObjectStream(storedUrl) {
	if (await isStorageS3()) {
		const client = await getS3Client();
		const { GetObjectCommand } = await import("@aws-sdk/client-s3");
		const cfg = await getS3Config();
		const key = s3KeyFromUrl(storedUrl);
		if (!key) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
		const response = await client.send(
			new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
		);
		if (!response.Body) throw new Error("Object body is empty");
		return {
			stream: response.Body,
			contentType:
				response.ContentType ||
				contentTypeForUploadFileName(key) ||
				"application/octet-stream",
			contentLength: response.ContentLength,
		};
	}

	const local = await resolveLocalUpload(storedUrl);
	if (!local) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
	const { createReadStream } = await import("node:fs");
	const { stat } = await import("node:fs/promises");
	let size;
	try {
		size = (await stat(local.storagePath)).size;
	} catch {
		throw new Error("Download file is not available");
	}
	return {
		stream: createReadStream(local.storagePath),
		contentType: local.contentType,
		contentLength: size,
	};
}

export async function deleteObject(storedUrl) {
	if (await isStorageS3()) {
		const client = await getS3Client();
		const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
		const cfg = await getS3Config();
		const key = s3KeyFromUrl(storedUrl);
		if (!key) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
		await client.send(
			new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
		);
		return;
	}

	const local = await resolveLocalUpload(storedUrl);
	if (!local) return;
	const { unlink } = await import("node:fs/promises");
	try {
		await unlink(local.storagePath);
	} catch {
		// best-effort
	}
}

// Generate a short-lived signed URL pointing directly at S3-compatible storage.
// Lets the browser stream large downloads straight from the object store
// instead of piping through the app server. Returns null in local mode.
export async function presignGet(storedUrl, { expiresIn = 600 } = {}) {
	if (!(await isStorageS3())) return null;
	const client = await getS3Client();
	const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
	const { GetObjectCommand } = await import("@aws-sdk/client-s3");
	const cfg = await getS3Config();
	const key = s3KeyFromUrl(storedUrl);
	if (!key) throw new Error(`Invalid stored url for storage: ${storedUrl}`);
	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
		{ expiresIn },
	);
}

export const privateUploadDirectoryExport = privateUploadDirectory;
