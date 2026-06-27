// Site-level settings stored in the SiteSetting table. Each setting is a
// key/value string so the schema stays flat. Reads are cached for a short
// window; writes clear the cache so changes take effect immediately.
//
// Prisma is lazy-loaded so pure helpers (isKnownSettingKey, maskSecret) stay
// testable without a database connection.

let _prismaPromise;
function getPrisma() {
	if (!_prismaPromise) {
		_prismaPromise = import("./prisma.js").then((m) => m.default);
	}
	return _prismaPromise;
}

const CACHE = new Map();
const CACHE_TTL_MS = 30 * 1000;

const KNOWN_KEYS = new Set([
	"storage_backend",
	"s3_endpoint",
	"s3_region",
	"s3_bucket",
	"s3_access_key_id",
	"s3_secret_access_key",
	"s3_force_path_style",
	"allow_public_storage_switch", // safety gate for the admin UI
]);

export function isKnownSettingKey(key) {
	return KNOWN_KEYS.has(String(key || ""));
}

async function readRaw(key) {
	const cached = CACHE.get(key);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.value;
	}
	const prisma = await getPrisma();
	const row = await prisma.siteSetting
		.findUnique({ where: { key } })
		.catch(() => null);
	const value = row?.value ?? "";
	CACHE.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
	return value;
}

/**
 * Read one storage setting. Empty DB value falls back to the matching env var
 * so deployments can configure storage either way (or both).
 */
export async function getStorageSetting(key, envKey) {
	const dbValue = await readRaw(key);
	if (dbValue) return dbValue;
	return process.env[envKey] || "";
}

export async function getStorageSettings() {
	const [backend, endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle] =
		await Promise.all([
			readRaw("storage_backend"),
			readRaw("s3_endpoint"),
			readRaw("s3_region"),
			readRaw("s3_bucket"),
			readRaw("s3_access_key_id"),
			readRaw("s3_secret_access_key"),
			readRaw("s3_force_path_style"),
		]);
	return {
		backend: backend || process.env.STORAGE_BACKEND || "local",
		endpoint: endpoint || process.env.S3_ENDPOINT || "",
		region: region || process.env.S3_REGION || "auto",
		bucket: bucket || process.env.S3_BUCKET || "",
		accessKeyId: accessKeyId || process.env.S3_ACCESS_KEY_ID || "",
		secretAccessKey: secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || "",
		forcePathStyle:
			(forcePathStyle || process.env.S3_FORCE_PATH_STYLE) === ""
				? true
				: String(forcePathStyle || process.env.S3_FORCE_PATH_STYLE || "true").toLowerCase() ===
					"true",
	};
}

/**
 * Persist storage settings. Clears the read cache so storage.mjs picks up the
 * new config on the next request. Returns the sanitized settings. Secret key
 * is masked in the response.
 */
export async function saveStorageSettings(input) {
	const backend = String(input.backend || "local").toLowerCase();
	if (backend !== "local" && backend !== "s3") {
		throw new Error("storage_backend must be 'local' or 's3'");
	}
	const updates = [
		{ key: "storage_backend", value: backend },
		{ key: "s3_endpoint", value: String(input.endpoint || "").trim() },
		{ key: "s3_region", value: String(input.region || "auto").trim() },
		{ key: "s3_bucket", value: String(input.bucket || "").trim() },
		{ key: "s3_access_key_id", value: String(input.accessKeyId || "").trim() },
		{
			key: "s3_force_path_style",
			value: String(input.forcePathStyle ?? "true").toLowerCase() === "true" ? "true" : "false",
		},
	];
	// Only overwrite the secret when a non-empty value is sent. Admins can
	// rotate the key without re-displaying it on every save.
	if (input.secretAccessKey && String(input.secretAccessKey).trim()) {
		updates.push({
			key: "s3_secret_access_key",
			value: String(input.secretAccessKey).trim(),
		});
	}

	for (const { key, value } of updates) {
		const prisma = await getPrisma();
		await prisma.siteSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}
	// Invalidate caches so storage.mjs rebuilds its S3 client on next use.
	clearSettingsCache();
	invalidateStorageClient();

	return getStorageSettings();
}

export function clearSettingsCache() {
	CACHE.clear();
}

// Hook so storage.mjs can register its client invalidation without a circular
// import at module load time.
let storageInvalidator = null;
export function setStorageClientInvalidator(fn) {
	storageInvalidator = fn;
}
export function invalidateStorageClient() {
	if (storageInvalidator) storageInvalidator();
}

/**
 * Mask a secret for display. Returns "••••••••" when a value exists and empty
 * string when it does not, so the admin UI can tell "set, hide it" from "not
 * set".
 */
export function maskSecret(value) {
	return value ? "••••••••" : "";
}
