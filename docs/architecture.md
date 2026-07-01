# Wicked Shop Architecture

## Structure

- `app/(public)`: customer storefront pages for browsing products, carts, orders, account, support, and legal pages.
- `app/admin`: administrator console for users, stores, products, orders, coupons, support, audit logs, and runtime settings.
- `app/store`: approved store-owner and staff workflows for products, inventory, orders, questions, and store profile changes.
- `app/api`: Next.js route handlers. Protected routes use `requireUser`, `requireAdmin`, or `requireSellerStore` from `lib/api.js`.
- `components`: shared UI and client providers, including public runtime settings and admin layout components.
- `lib`: domain helpers for auth, stores, products, orders, storage, email, settings, uploads, and validation.
- `prisma`: PostgreSQL schema, migrations, and seed data.
- `test`: Node test runner coverage for domain helpers, route contracts, and important UI source invariants.

## Module Relationships

`Prisma schema -> lib domain helpers -> app/api routes -> app pages/components`

`SiteSetting` is the runtime configuration store. Admin settings APIs update it, runtime helpers read it with environment fallback, and client pages use `/api/settings/public` for public-safe values.

Storage has two layers:

- `lib/site-settings.mjs` owns persisted storage settings and cache invalidation.
- `lib/storage.mjs` owns file/object-store reads and writes.

Email follows the same pattern:

- `lib/site-settings.mjs` owns Resend key/from-address persistence.
- `lib/email.mjs` resolves DB settings first, then environment variables, before sending password reset emails.

## Release Readiness Boundaries

The current app intentionally excludes final payment ownership. Stripe code exists as a disabled integration path, but production payment logic should be completed separately before paid launch.

Operationally required non-payment settings are admin-managed:

- General: public URL and currency symbol.
- Email: password reset sender and Resend API key.
- Storage: local or S3-compatible private upload storage.

