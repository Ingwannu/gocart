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
	"site_public_url",
	"site_currency_symbol",
	"resend_api_key",
	"password_reset_from",
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

export async function getGeneralSettings() {
	const [publicUrl, currencySymbol] = await Promise.all([
		readRaw("site_public_url"),
		readRaw("site_currency_symbol"),
	]);
	return {
		publicUrl: normalizePublicUrl(publicUrl || process.env.NEXTAUTH_URL || ""),
		currencySymbol: normalizeCurrencySymbol(
			currencySymbol || process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "$",
		),
	};
}

export async function getPublicSettings() {
	const general = await getGeneralSettings();
	return {
		currencySymbol: general.currencySymbol,
	};
}

export async function getEmailSettings() {
	const [apiKey, fromAddress] = await Promise.all([
		readRaw("resend_api_key"),
		readRaw("password_reset_from"),
	]);
	return {
		apiKey: apiKey || process.env.RESEND_API_KEY || "",
		fromAddress: fromAddress || process.env.PASSWORD_RESET_FROM || "",
	};
}

export function normalizeCurrencySymbol(value) {
	const normalized = String(value || "$").trim();
	if (!normalized) return "$";
	return normalized.slice(0, 8);
}

export function normalizePublicUrl(value) {
	return String(value || "").trim().replace(/\/+$/, "");
}

export function normalizeEmailFromAddress(value) {
	return String(value || "").trim();
}

export async function saveGeneralSettings(input) {
	const publicUrl = normalizePublicUrl(input.publicUrl);
	if (publicUrl && !/^https?:\/\//i.test(publicUrl)) {
		throw new Error("Public URL must start with http:// or https://");
	}
	const updates = [
		{ key: "site_public_url", value: publicUrl },
		{ key: "site_currency_symbol", value: normalizeCurrencySymbol(input.currencySymbol) },
	];

	for (const { key, value } of updates) {
		const prisma = await getPrisma();
		await prisma.siteSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}
	clearSettingsCache();
	return getGeneralSettings();
}

/* [Decision Log]
- 목적: 비밀번호 재설정 메일 설정을 배포 환경변수에만 묶지 않고 관리자 화면에서 변경할 수 있게 한다.
- 대안 분석: (1) env만 유지하면 배포가 단순하지만 운영자가 UI에서 바꿀 수 없다. (2) 별도 EmailSetting 테이블은 타입은 명확하지만 현재 SiteSetting 패턴과 중복된다. (3) SiteSetting 확장은 기존 캐시/마스킹/관리자 API 흐름을 재사용한다.
- 선택 근거: 기존 스토리지 설정과 같은 SiteSetting 확장이 가장 작은 변경으로 운영 요구사항을 만족하고, secret은 빈 값 저장 시 유지하는 현재 패턴을 그대로 적용할 수 있다.
*/
export async function saveEmailSettings(input) {
	const updates = [
		{
			key: "password_reset_from",
			value: normalizeEmailFromAddress(input.fromAddress),
		},
	];
	if (input.apiKey && String(input.apiKey).trim()) {
		updates.push({
			key: "resend_api_key",
			value: String(input.apiKey).trim(),
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
	clearSettingsCache();
	return getEmailSettings();
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
