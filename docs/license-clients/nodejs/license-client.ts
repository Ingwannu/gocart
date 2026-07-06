/**
 * Wicked Shop license client for Node.js (18+) / TypeScript Discord bots.
 * Zero dependencies — uses global fetch and node:crypto.
 *
 * Usage:
 *   const client = new LicenseClient({
 *     apiUrl: "https://your-shop.com/api/license/validate",
 *     licenseKey: process.env.LICENSE_KEY!,
 *     productId: "prod_xxx",                  // shown on the product page
 *     instanceId: guildId,                    // binds the key to one Discord server
 *     publicKey: "MCowBQYDK2VwAyEA...",       // from `npm run license:keygen`
 *   });
 *   await client.enforce();                    // exits the process when invalid
 *   client.startHeartbeat();                   // re-checks every 6h, kill switch
 */
import { createPublicKey, randomBytes, verify as cryptoVerify } from "node:crypto";

export interface LicenseClientOptions {
	apiUrl: string;
	licenseKey: string;
	productId?: string;
	/** Discord guild id, server IP, or machine hash. First validation binds the key to it. */
	instanceId?: string;
	/** Base64 SPKI DER Ed25519 public key. When set, unsigned/forged responses are rejected. */
	publicKey?: string;
	/** Max clock skew accepted on signedAt, ms. Default 5 minutes. */
	maxSkewMs?: number;
	/** Consecutive network failures tolerated by enforce()/heartbeat before treating as invalid. Default 5. */
	networkGrace?: number;
	timeoutMs?: number;
}

export interface LicenseResult {
	valid: boolean;
	/** unknown_key | revoked | unpaid | product_mismatch | instance_mismatch | network_error | bad_signature | bad_response */
	reason?: string;
	productName?: string;
}

export class LicenseClient {
	private readonly opts: Required<Pick<LicenseClientOptions, "apiUrl" | "licenseKey">> &
		LicenseClientOptions;
	private networkFailures = 0;
	private heartbeatTimer?: ReturnType<typeof setInterval>;

	constructor(options: LicenseClientOptions) {
		if (!options.apiUrl) throw new Error("apiUrl is required");
		if (!options.licenseKey) throw new Error("licenseKey is required");
		this.opts = { maxSkewMs: 5 * 60 * 1000, networkGrace: 5, timeoutMs: 10_000, ...options };
	}

	async validate(): Promise<LicenseResult> {
		const nonce = randomBytes(16).toString("hex");
		let response: Response;
		let body: {
			valid?: boolean;
			reason?: string;
			license?: { productName?: string };
			payload?: string;
			signature?: string;
		};
		try {
			response = await fetch(this.opts.apiUrl, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					key: this.opts.licenseKey,
					productId: this.opts.productId,
					instanceId: this.opts.instanceId,
					nonce,
				}),
				signal: AbortSignal.timeout(this.opts.timeoutMs!),
			});
			body = await response.json();
		} catch {
			return { valid: false, reason: "network_error" };
		}
		if (response.status === 429) return { valid: false, reason: "network_error" };

		// With a pinned public key the signed payload is the source of truth, so
		// a man-in-the-middle or fake license server cannot fabricate "valid".
		if (this.opts.publicKey) {
			if (!body.payload || !body.signature) {
				return { valid: false, reason: "bad_signature" };
			}
			if (!this.verifySignature(body.payload, body.signature)) {
				return { valid: false, reason: "bad_signature" };
			}
			let payload: { valid?: boolean; reason?: string; nonce?: string; signedAt?: string };
			try {
				payload = JSON.parse(body.payload);
			} catch {
				return { valid: false, reason: "bad_response" };
			}
			if (payload.nonce !== nonce) return { valid: false, reason: "bad_signature" };
			const signedAt = Date.parse(payload.signedAt || "");
			if (!Number.isFinite(signedAt) || Math.abs(Date.now() - signedAt) > this.opts.maxSkewMs!) {
				return { valid: false, reason: "bad_signature" };
			}
			return {
				valid: payload.valid === true,
				reason: payload.valid === true ? undefined : payload.reason || "unknown",
				productName: body.license?.productName,
			};
		}

		return {
			valid: body.valid === true,
			reason: body.valid === true ? undefined : body.reason || "bad_response",
			productName: body.license?.productName,
		};
	}

	/**
	 * Validate and stop the process when the license is invalid. Transient
	 * network errors are tolerated up to `networkGrace` consecutive times so a
	 * brief shop outage never bricks paying customers.
	 */
	async enforce(onInvalid: (result: LicenseResult) => void = defaultOnInvalid): Promise<LicenseResult> {
		const result = await this.validate();
		if (result.valid) {
			this.networkFailures = 0;
			return result;
		}
		if (result.reason === "network_error") {
			this.networkFailures += 1;
			if (this.networkFailures <= this.opts.networkGrace!) return result;
		}
		onInvalid(result);
		return result;
	}

	/** Periodic re-validation: revoked/refunded keys shut the bot down remotely. */
	startHeartbeat(
		intervalMs = 6 * 60 * 60 * 1000,
		onInvalid: (result: LicenseResult) => void = defaultOnInvalid,
	): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			void this.enforce(onInvalid);
		}, intervalMs);
		this.heartbeatTimer.unref?.();
	}

	stopHeartbeat(): void {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
		this.heartbeatTimer = undefined;
	}

	private verifySignature(payload: string, signatureBase64: string): boolean {
		try {
			const publicKey = createPublicKey({
				key: Buffer.from(this.opts.publicKey!, "base64"),
				format: "der",
				type: "spki",
			});
			return cryptoVerify(
				null,
				Buffer.from(payload, "utf8"),
				publicKey,
				Buffer.from(signatureBase64, "base64"),
			);
		} catch {
			return false;
		}
	}
}

function defaultOnInvalid(result: LicenseResult): void {
	console.error(`[license] invalid license (${result.reason}); shutting down.`);
	process.exit(1);
}
