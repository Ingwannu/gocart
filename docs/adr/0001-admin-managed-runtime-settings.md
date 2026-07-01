# ADR 0001: Admin-Managed Runtime Settings

## Status

Accepted

## Context

The app needs non-payment operational settings to be adjustable by an administrator without code edits or redeploys. Existing storage settings already used the `SiteSetting` table, admin API routes, masked secrets, and environment fallback.

## Decision

Use `SiteSetting` for general settings, email settings, and storage settings.

Runtime resolution order:

1. Database value from `SiteSetting`.
2. Environment variable fallback.
3. Code default where safe.

Admin pages may save public URL, currency symbol, Resend sender, Resend API key, and storage backend credentials. Public clients may only read public-safe settings from `/api/settings/public`.

## Alternatives

- Environment-only settings: simple, but does not satisfy admin-managed operations.
- Separate typed tables per setting group: stricter schema, but unnecessary duplication for this app's small key/value operational settings.
- External configuration service: powerful, but too heavy for a self-hosted ecommerce control plane.

## Consequences

- Operators can change non-payment runtime settings from the admin console.
- Secret values must remain write-only from the UI and masked in API responses.
- Helpers that read settings must avoid importing Node-only code into client modules.

