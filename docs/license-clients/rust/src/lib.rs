//! Wicked Shop license client for Rust Discord bots.
//!
//! Blocking HTTP (`ureq`) — call from `tokio::task::spawn_blocking` inside an
//! async bot. The Ed25519 public key is compiled into the binary, so a cracked
//! copy cannot be pointed at a fake "always valid" license server without
//! patching the executable.
//!
//! ```no_run
//! use wicked_license::{LicenseClient, Reason};
//!
//! let client = LicenseClient::new(
//!     "https://your-shop.com/api/license/validate",
//!     std::env::var("LICENSE_KEY").expect("LICENSE_KEY not set"),
//! )
//! .product_id("prod_xxx")
//! .instance_id("guild-1234")           // binds the key to one Discord server
//! .public_key("MCowBQYDK2VwAyEA...");  // from `npm run license:keygen`
//!
//! match client.validate() {
//!     Ok(license) => println!("licensed: {}", license.product_name),
//!     Err(Reason::NetworkError) => { /* tolerate a few, then give up */ }
//!     Err(reason) => {
//!         eprintln!("invalid license: {reason:?}");
//!         std::process::exit(1);
//!     }
//! }
//! ```

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{pkcs8::DecodePublicKey, Signature, Verifier, VerifyingKey};
use serde::Deserialize;

const MAX_SKEW_MS: i128 = 5 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Reason {
    UnknownKey,
    Revoked,
    Unpaid,
    ProductMismatch,
    InstanceMismatch,
    NetworkError,
    BadSignature,
    BadResponse,
    Other(String),
}

impl Reason {
    fn from_api(reason: &str) -> Self {
        match reason {
            "unknown_key" => Reason::UnknownKey,
            "revoked" => Reason::Revoked,
            "unpaid" => Reason::Unpaid,
            "product_mismatch" => Reason::ProductMismatch,
            "instance_mismatch" => Reason::InstanceMismatch,
            other => Reason::Other(other.to_string()),
        }
    }
}

#[derive(Debug, Clone)]
pub struct License {
    pub product_id: String,
    pub product_name: String,
    pub bound_instance_id: String,
}

#[derive(Deserialize)]
struct ApiResponse {
    valid: Option<bool>,
    reason: Option<String>,
    license: Option<ApiLicense>,
    payload: Option<String>,
    signature: Option<String>,
}

#[derive(Deserialize)]
struct ApiLicense {
    #[serde(rename = "productId", default)]
    product_id: String,
    #[serde(rename = "productName", default)]
    product_name: String,
    #[serde(rename = "boundInstanceId", default)]
    bound_instance_id: String,
}

#[derive(Deserialize)]
struct SignedPayload {
    valid: bool,
    reason: Option<String>,
    nonce: Option<String>,
    #[serde(rename = "signedAt")]
    signed_at: Option<String>,
}

pub struct LicenseClient {
    api_url: String,
    license_key: String,
    product_id: Option<String>,
    instance_id: Option<String>,
    public_key: Option<VerifyingKey>,
}

impl LicenseClient {
    pub fn new(api_url: impl Into<String>, license_key: impl Into<String>) -> Self {
        Self {
            api_url: api_url.into(),
            license_key: license_key.into(),
            product_id: None,
            instance_id: None,
            public_key: None,
        }
    }

    pub fn product_id(mut self, product_id: impl Into<String>) -> Self {
        self.product_id = Some(product_id.into());
        self
    }

    /// Discord guild id, server IP, or machine hash. First validation binds
    /// the key; other instances are rejected afterwards.
    pub fn instance_id(mut self, instance_id: impl Into<String>) -> Self {
        self.instance_id = Some(instance_id.into());
        self
    }

    /// Base64 SPKI DER Ed25519 public key. Panics on malformed keys so a
    /// bad embed fails at startup, not silently at validation time.
    pub fn public_key(mut self, base64_spki: &str) -> Self {
        let der = BASE64.decode(base64_spki).expect("public key is not base64");
        self.public_key =
            Some(VerifyingKey::from_public_key_der(&der).expect("public key is not Ed25519 SPKI"));
        self
    }

    pub fn validate(&self) -> Result<License, Reason> {
        let nonce = nonce();
        let body = serde_json::json!({
            "key": self.license_key,
            "productId": self.product_id,
            "instanceId": self.instance_id,
            "nonce": nonce,
        });

        let response = ureq::post(&self.api_url)
            .timeout(std::time::Duration::from_secs(10))
            .send_json(body);
        let response = match response {
            Ok(res) => res,
            // 4xx still carries a JSON body we want to read (e.g. valid:false).
            Err(ureq::Error::Status(429, _)) => return Err(Reason::NetworkError),
            Err(ureq::Error::Status(_, res)) => res,
            Err(_) => return Err(Reason::NetworkError),
        };
        let api: ApiResponse = response.into_json().map_err(|_| Reason::BadResponse)?;

        if let Some(key) = &self.public_key {
            let payload = api.payload.as_deref().ok_or(Reason::BadSignature)?;
            let signature_bytes = BASE64
                .decode(api.signature.as_deref().unwrap_or(""))
                .map_err(|_| Reason::BadSignature)?;
            let signature =
                Signature::from_slice(&signature_bytes).map_err(|_| Reason::BadSignature)?;
            key.verify(payload.as_bytes(), &signature)
                .map_err(|_| Reason::BadSignature)?;

            let signed: SignedPayload =
                serde_json::from_str(payload).map_err(|_| Reason::BadResponse)?;
            if signed.nonce.as_deref() != Some(nonce.as_str()) {
                return Err(Reason::BadSignature);
            }
            if !fresh(signed.signed_at.as_deref()) {
                return Err(Reason::BadSignature);
            }
            if !signed.valid {
                return Err(Reason::from_api(signed.reason.as_deref().unwrap_or("")));
            }
        } else if api.valid != Some(true) {
            return Err(Reason::from_api(api.reason.as_deref().unwrap_or("")));
        }

        let license = api.license.unwrap_or(ApiLicense {
            product_id: String::new(),
            product_name: String::new(),
            bound_instance_id: String::new(),
        });
        Ok(License {
            product_id: license.product_id,
            product_name: license.product_name,
            bound_instance_id: license.bound_instance_id,
        })
    }
}

fn nonce() -> String {
    // No rand dependency: hash wall clock + monotonic counter through the
    // default hasher twice. Uniqueness per process is all the nonce needs.
    use std::hash::{BuildHasher, Hasher, RandomState};
    let mut hasher = RandomState::new().build_hasher();
    hasher.write_u128(
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos(),
    );
    let a = hasher.finish();
    hasher.write_u64(a);
    format!("{a:016x}{:016x}", hasher.finish())
}

fn fresh(signed_at: Option<&str>) -> bool {
    let Some(signed_at) = signed_at else { return false };
    // Parse RFC3339 "2026-07-02T05:11:37.328Z" without a chrono dependency.
    let Ok(unix_ms) = parse_rfc3339_ms(signed_at) else { return false };
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i128;
    (now_ms - unix_ms).abs() <= MAX_SKEW_MS
}

fn parse_rfc3339_ms(value: &str) -> Result<i128, ()> {
    let value = value.strip_suffix('Z').ok_or(())?;
    let (date, time) = value.split_once('T').ok_or(())?;
    let mut date_parts = date.split('-');
    let year: i128 = date_parts.next().ok_or(())?.parse().map_err(|_| ())?;
    let month: i128 = date_parts.next().ok_or(())?.parse().map_err(|_| ())?;
    let day: i128 = date_parts.next().ok_or(())?.parse().map_err(|_| ())?;
    let (hms, millis) = match time.split_once('.') {
        Some((hms, frac)) => {
            let ms: i128 = format!("{:0<3}", &frac[..frac.len().min(3)])
                .parse()
                .map_err(|_| ())?;
            (hms, ms)
        }
        None => (time, 0),
    };
    let mut time_parts = hms.split(':');
    let hour: i128 = time_parts.next().ok_or(())?.parse().map_err(|_| ())?;
    let minute: i128 = time_parts.next().ok_or(())?.parse().map_err(|_| ())?;
    let second: i128 = time_parts.next().ok_or(())?.parse().map_err(|_| ())?;

    // Days since Unix epoch (civil-from-days algorithm, Howard Hinnant).
    let y = if month <= 2 { year - 1 } else { year };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = (month + 9) % 12;
    let doy = (153 * mp + 2) / 5 + day - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    let days = era * 146_097 + doe - 719_468;

    Ok((((days * 24 + hour) * 60 + minute) * 60 + second) * 1000 + millis)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rfc3339_timestamps() {
        // 2026-07-02T05:11:37.328Z == 1782969097328 ms (Date.parse cross-check)
        assert_eq!(parse_rfc3339_ms("2026-07-02T05:11:37.328Z"), Ok(1_782_969_097_328));
        assert_eq!(parse_rfc3339_ms("1970-01-01T00:00:00Z"), Ok(0));
        assert!(parse_rfc3339_ms("not-a-date").is_err());
    }

    #[test]
    fn nonces_are_unique() {
        let a = nonce();
        let b = nonce();
        assert_ne!(a, b);
        assert_eq!(a.len(), 32);
    }
}
