<div align="center">
  <h1><img src="https://gocart-gs.vercel.app/favicon.ico" width="20" height="20" alt="GoCart Favicon">
   GoCart</h1>
  <p>
    An open-source multi-vendor e-commerce platform built with Next.js and Tailwind CSS.
  </p>
  <p>
    <a href="https://github.com/GreatStackDev/goCart/blob/main/LICENSE.md"><img src="https://img.shields.io/github/license/GreatStackDev/goCart?style=for-the-badge" alt="License"></a>
    <a href="https://github.com/GreatStackDev/goCart/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome"></a>
    <a href="https://github.com/GreatStackDev/goCart/issues"><img src="https://img.shields.io/github/issues/GreatStackDev/goCart?style=for-the-badge" alt="GitHub issues"></a>
  </p>
</div>

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#-tech-stack)
- [🚀 Getting Started](#-getting-started)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)

---

## Features

- **Multi-Vendor Architecture:** Allows multiple vendors to register, manage their own products, and sell on a single platform.
- **Customer-Facing Storefront:** A beautiful and responsive user interface for customers to browse and purchase products.
- **Vendor Dashboards:** Dedicated dashboards for vendors to manage products, view sales analytics, and track orders.
- **Admin Panel:** A comprehensive dashboard for platform administrators to oversee vendors, products, and commissions.

## 🛠️ Tech Stack <a name="-tech-stack"></a>

- **Framework:** Next.js
- **Styling:** Tailwind CSS
- **UI Components:** Lucide React for icons
- **State Management:** Redux Toolkit

## 🚀 Getting Started <a name="-getting-started"></a>

First, install the dependencies. We recommend using `npm` for this project.

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start PostgreSQL, apply the Prisma schema, and seed the starter admin/store data:

```bash
docker compose up -d postgres
npm run db:push
npm run db:seed
```

Then run the development server:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3001
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

Useful verification commands:

```bash
npm test
npx prisma validate --schema=prisma/schema.prisma
npm run build
```

Use `npm run db:migrate` instead of `npm run db:push` in production deployments.

Project documentation:

- [Architecture](./docs/architecture.md)
- [Tech Stack](./docs/tech-stack.md)
- [ADR 0001: Admin-Managed Runtime Settings](./docs/adr/0001-admin-managed-runtime-settings.md)

## Release Readiness

Implemented core release features include credential signup/login, admin-created stores, admin user management, product group management, product search/filtering, rich product descriptions, product editing, persistent carts, coupons, order management, payouts, and PostgreSQL-backed Prisma models.

Before a real public launch, confirm these items in the target environment:

- PostgreSQL is reachable through `DATABASE_URL`, then run `npm run db:push` or a migration flow.
- `NEXTAUTH_SECRET` is set to a strong production secret.
- Non-payment runtime settings are reviewed in `/admin/settings/general`, `/admin/settings/email`, and `/admin/settings/storage`.
- Production file storage is wired for product images and rich-description attachments; local storage is acceptable only for development.
- Stripe or another payment processor is connected before setting `NEXT_PUBLIC_ENABLE_STRIPE=true`.
- Email/SMS notifications and shipping/tracking integrations are configured if required by the store workflow.

---

## 🤝 Contributing <a name="-contributing"></a>

We welcome contributions! Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for more details on how to get started.

---

## 📜 License <a name="-license"></a>

This project is licensed under the MIT License. See the [LICENSE.md](./LICENSE.md) file for details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
