import {
	createPrivateKey,
	createPublicKey,
	generateKeyPairSync,
	sign as cryptoSign,
	verify as cryptoVerify,
} from "node:crypto";

// Ed25519 response signing for the license validation API. The server keeps
// the private key (LICENSE_SIGNING_PRIVATE_KEY, base64 PKCS8 DER); sold
// products embed the public key and verify responses, so a pirate cannot
// stand up a fake "always valid" license server. Signing is optional — when
// no key is configured the validate API still works, just unsigned.

let cachedPrivateKey;
let cachedPrivateKeySource;

function loadPrivateKey(base64) {
	const source = String(base64 || process.env.LICENSE_SIGNING_PRIVATE_KEY || "").trim();
	if (!source) return null;
	if (cachedPrivateKey && cachedPrivateKeySource === source) return cachedPrivateKey;
	try {
		cachedPrivateKey = createPrivateKey({
			key: Buffer.from(source, "base64"),
			format: "der",
			type: "pkcs8",
		});
		cachedPrivateKeySource = source;
		return cachedPrivateKey;
	} catch {
		return null;
	}
}

export function isLicenseSigningConfigured(privateKeyBase64) {
	return Boolean(loadPrivateKey(privateKeyBase64));
}

export function signLicensePayload(payload, privateKeyBase64) {
	const key = loadPrivateKey(privateKeyBase64);
	if (!key) return null;
	return cryptoSign(null, Buffer.from(String(payload), "utf8"), key).toString(
		"base64",
	);
}

export function getLicensePublicKeyBase64(privateKeyBase64) {
	const key = loadPrivateKey(privateKeyBase64);
	if (!key) return null;
	return createPublicKey(key)
		.export({ format: "der", type: "spki" })
		.toString("base64");
}

// Client-side counterpart, exported for tests and for embedding in product
// docs: verify(payload, signature, publicKey) — all strings/base64.
export function verifyLicensePayload(payload, signatureBase64, publicKeyBase64) {
	try {
		const publicKey = createPublicKey({
			key: Buffer.from(String(publicKeyBase64 || ""), "base64"),
			format: "der",
			type: "spki",
		});
		return cryptoVerify(
			null,
			Buffer.from(String(payload), "utf8"),
			publicKey,
			Buffer.from(String(signatureBase64 || ""), "base64"),
		);
	} catch {
		return false;
	}
}

export function generateLicenseSigningKeyPair() {
	const { privateKey, publicKey } = generateKeyPairSync("ed25519");
	return {
		privateKeyBase64: privateKey
			.export({ format: "der", type: "pkcs8" })
			.toString("base64"),
		publicKeyBase64: publicKey
			.export({ format: "der", type: "spki" })
			.toString("base64"),
	};
}
