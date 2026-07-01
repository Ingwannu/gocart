# Tech Stack

## Next.js App Router

Used for a single full-stack application with storefront, admin, store dashboards, and API routes in one deployable unit.

Trade-off: Next.js keeps route handlers and React pages close together, which fits this app's small-team control-plane style. The cost is that runtime/server concerns need clear boundaries so client components do not import Node-only modules.

## React

Used for interactive dashboards, forms, filters, product management, cart state, and admin settings.

Trade-off: React is already native to Next.js and works well for the current component structure. For large tables, future work may need stronger virtualization or server-driven pagination, but current pages already paginate API data.

## Prisma + PostgreSQL

Used for durable ecommerce data: users, stores, products, orders, coupons, support, audit logs, downloads, and settings.

Trade-off: Prisma gives typed schema evolution and readable queries. PostgreSQL is the right baseline for relational commerce data. The trade-off is that local setup requires a reachable database and migrations before the app is usable.

## NextAuth Credentials

Used for email/password login with database-backed roles.

Trade-off: Credentials auth keeps the app self-hostable and avoids third-party identity lock-in. It requires careful password hashing, session role refresh, and a strong `NEXTAUTH_SECRET` in production.

## Redux Toolkit

Used for cart, products, addresses, and ratings client state.

Trade-off: Redux provides predictable shared client state across pages. It adds ceremony, so domain logic that can stay server-side remains in `lib` and route handlers.

## SiteSetting Runtime Configuration

Used for admin-managed non-payment settings.

Trade-off: Storing operational settings in `SiteSetting` avoids redeploying for common changes. Secrets still require masking and controlled write behavior, so the app only returns masked secrets to the UI.

## Resend

Used for password reset email delivery.

Trade-off: Resend is simple for transactional email. The app treats it as optional: password reset tokens still work in development without email delivery, and production can configure it from the admin view.

## Local/S3-Compatible Storage

Used for product images, rich-description assets, and private digital downloads.

Trade-off: local storage is simple for development. S3-compatible storage is better for production durability and horizontal deployment. The admin settings page lets operators switch without changing code.

