package com.wickedshop.license;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Wicked Shop license client for Minecraft plugins (Java 17+, Paper/Spigot).
 * Gson ships with the server, so this class has no extra dependencies.
 *
 * Call {@link #validate()} off the main thread (network I/O):
 *
 * <pre>{@code
 * @Override
 * public void onEnable() {
 *     String key = getConfig().getString("license-key", "");
 *     WickedLicenseClient client = new WickedLicenseClient(
 *         "https://your-shop.com/api/license/validate",
 *         key,
 *         "prod_xxx",
 *         getServer().getIp() + ":" + getServer().getPort(), // instance binding
 *         PUBLIC_KEY);                                       // from `npm run license:keygen`
 *     getServer().getScheduler().runTaskAsynchronously(this, () -> {
 *         WickedLicenseClient.Result result = client.validate();
 *         if (!result.valid() && !result.isNetworkError()) {
 *             getLogger().severe("Invalid license (" + result.reason() + ") — disabling.");
 *             getServer().getScheduler().runTask(this,
 *                 () -> getServer().getPluginManager().disablePlugin(this));
 *         }
 *     });
 *     // Optional heartbeat (remote kill switch for refunded keys):
 *     // runTaskTimerAsynchronously(this, sameCheck, 20L * 60 * 60, 20L * 60 * 60 * 6)
 * }
 * }</pre>
 */
public final class WickedLicenseClient {

	/** unknown_key | revoked | unpaid | product_mismatch | instance_mismatch | network_error | bad_signature | bad_response */
	public record Result(boolean valid, String reason, String productName) {
		public boolean isNetworkError() {
			return "network_error".equals(reason);
		}
	}

	private static final Duration TIMEOUT = Duration.ofSeconds(10);
	private static final long MAX_SKEW_MS = 5 * 60 * 1000;

	private final String apiUrl;
	private final String licenseKey;
	private final String productId;
	private final String instanceId;
	private final PublicKey publicKey; // null = accept unsigned responses
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
	private final Gson gson = new Gson();
	private final SecureRandom random = new SecureRandom();

	public WickedLicenseClient(
			String apiUrl,
			String licenseKey,
			String productId,
			String instanceId,
			String publicKeyBase64) {
		this.apiUrl = apiUrl;
		this.licenseKey = licenseKey;
		this.productId = productId;
		this.instanceId = instanceId;
		this.publicKey = publicKeyBase64 == null || publicKeyBase64.isBlank()
				? null
				: parsePublicKey(publicKeyBase64);
	}

	public Result validate() {
		byte[] nonceBytes = new byte[16];
		random.nextBytes(nonceBytes);
		String nonce = HexFormat.of().formatHex(nonceBytes);

		JsonObject body = new JsonObject();
		body.addProperty("key", licenseKey);
		if (productId != null) body.addProperty("productId", productId);
		if (instanceId != null) body.addProperty("instanceId", instanceId);
		body.addProperty("nonce", nonce);

		JsonObject response;
		try {
			HttpRequest request = HttpRequest.newBuilder(URI.create(apiUrl))
					.timeout(TIMEOUT)
					.header("content-type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body)))
					.build();
			HttpResponse<String> httpResponse =
					http.send(request, HttpResponse.BodyHandlers.ofString());
			if (httpResponse.statusCode() == 429) return new Result(false, "network_error", "");
			response = gson.fromJson(httpResponse.body(), JsonObject.class);
		} catch (Exception e) {
			return new Result(false, "network_error", "");
		}
		if (response == null) return new Result(false, "bad_response", "");

		String productName = "";
		if (response.has("license") && response.get("license").isJsonObject()) {
			JsonObject license = response.getAsJsonObject("license");
			if (license.has("productName")) productName = license.get("productName").getAsString();
		}

		// With a pinned public key the signed payload is the source of truth, so
		// a spoofed license server or MITM proxy cannot fabricate "valid".
		if (publicKey != null) {
			if (!response.has("payload") || !response.has("signature")) {
				return new Result(false, "bad_signature", productName);
			}
			String payload = response.get("payload").getAsString();
			if (!verify(payload, response.get("signature").getAsString())) {
				return new Result(false, "bad_signature", productName);
			}
			JsonObject signed;
			try {
				signed = gson.fromJson(payload, JsonObject.class);
			} catch (Exception e) {
				return new Result(false, "bad_response", productName);
			}
			if (!signed.has("nonce") || signed.get("nonce").isJsonNull()
					|| !nonce.equals(signed.get("nonce").getAsString())) {
				return new Result(false, "bad_signature", productName);
			}
			if (!isFresh(signed)) return new Result(false, "bad_signature", productName);
			boolean valid = signed.has("valid") && signed.get("valid").getAsBoolean();
			String reason = signed.has("reason") && !signed.get("reason").isJsonNull()
					? signed.get("reason").getAsString()
					: "";
			return new Result(valid, valid ? "" : reason, productName);
		}

		boolean valid = response.has("valid") && response.get("valid").getAsBoolean();
		String reason = response.has("reason") && !response.get("reason").isJsonNull()
				? response.get("reason").getAsString()
				: (valid ? "" : "bad_response");
		return new Result(valid, valid ? "" : reason, productName);
	}

	private boolean isFresh(JsonObject signed) {
		try {
			long signedAt = Instant.parse(signed.get("signedAt").getAsString()).toEpochMilli();
			return Math.abs(System.currentTimeMillis() - signedAt) <= MAX_SKEW_MS;
		} catch (Exception e) {
			return false;
		}
	}

	private boolean verify(String payload, String signatureBase64) {
		try {
			Signature verifier = Signature.getInstance("Ed25519");
			verifier.initVerify(publicKey);
			verifier.update(payload.getBytes(StandardCharsets.UTF_8));
			return verifier.verify(Base64.getDecoder().decode(signatureBase64));
		} catch (Exception e) {
			return false;
		}
	}

	private static PublicKey parsePublicKey(String base64Spki) {
		try {
			return KeyFactory.getInstance("Ed25519")
					.generatePublic(new X509EncodedKeySpec(Base64.getDecoder().decode(base64Spki)));
		} catch (Exception e) {
			throw new IllegalArgumentException("Invalid Ed25519 public key", e);
		}
	}
}
