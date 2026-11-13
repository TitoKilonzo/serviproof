# ServiProof

**Service operations, under control.** ServiProof is a Kenya-first, multi-tenant SaaS workspace for recurring field-service businesses. The first vertical is commercial pest-control operators, with a workflow that can also support cleaning, HVAC, generator maintenance and other recurring service providers.

This repository contains the web application, API, PostgreSQL schema, demo seed data, PWA shell, offline completion queue, recurring-service scheduler and deployment guidance.

## Product scope

### Business workspace
- Workspace registration and sign-in.
- Multiple independent companies, with all operational records scoped by `company_id`.
- Roles: owner, admin, dispatcher, technician and customer.
- Customers, service locations and recurring service contracts.
- Work-order creation, technician assignment, start and completion workflows.
- Service notes, configurable checklist payloads, customer sign-off reference, time stamps and optional GPS coordinates in the API.
- Private photo/PDF evidence upload and permission-checked file retrieval.
- Print-ready service report that can be saved as PDF from the browser.
- Invoice creation, line items, tax, payment recording and outstanding-balance calculation.
- M-Pesa transaction reference capture for manual reconciliation.
- Operational dashboard, service trends, service-type reports and customer activity.
- Daily recurring contract generator and overdue-invoice status updater.
- Company profile and workspace settings.

### Customer portal
- A customer account is linked to one customer record in one workspace.
- Customers can see only their own sites, contracts, work orders and invoices.
- Workspace administrators can create a customer portal login from the customer record.

### Technician PWA
- Responsive mobile-first interface.
- Installable PWA shell.
- Offline queue for work-order completion submissions. The queue is isolated per signed-in user and synchronises when connectivity returns.
- The service worker does not cache private API responses.

## Architecture

| Layer | Choice |
|---|---|
| Web | React 18, TypeScript, Vite |
| UI | Tailwind CSS configuration plus custom product CSS |
| Icons / charts | Lucide React, Recharts |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL 16+ |
| Validation | Zod |
| Authentication | bcrypt password hashing, signed JWT in HttpOnly cookie |
| Uploads | Private local disk adapter with authorised download endpoint |
| Scheduling | node-cron, Africa/Nairobi timezone |
| Hosting target | Vercel web + Render API + PostgreSQL |

Read [docs/architecture.md](docs/architecture.md) for data boundaries and workflow design. Read [docs/api.md](docs/api.md) for the route reference.
See [docs/verification.md](docs/verification.md) for the checks completed in this handoff and the checks that still need to run after dependencies and PostgreSQL are available.

## Local setup

### Requirements
- Node.js 20 or newer (Node 22 recommended).
- npm 10 or newer.
- PostgreSQL 16 or newer. Docker Compose is optional but convenient.

### 1. Configure environment

At the repository root:

```bash
cp .env.example .env
```

Update `DATABASE_URL` and replace `JWT_SECRET` with a unique secret of at least 32 characters. A convenient secret can be generated with:

```bash
openssl rand -base64 48
```

The checked-in `.env.example` is only a template. Do not commit your actual `.env` file.

### 2. Start PostgreSQL

With Docker Compose:

```bash
docker compose up -d postgres
```

The default local connection string is:

```text
postgresql://postgres:postgres@localhost:5432/serviproof
```

For a separately installed PostgreSQL instance, create a database named `serviproof` and point `DATABASE_URL` to it.

### 3. Install, migrate and seed

From the repository root:

```bash
npm install
npm run db:migrate
npm run db:seed
```

The migration is idempotent for this initial release. The seed script creates a sample pest-control company, customer records, sites, recurring contracts, work orders, invoice and team logins. Running the seed again updates the demo users' password to the configured `DEMO_PASSWORD` and reuses the named sample records.

### 4. Start the applications

```bash
npm run dev
```

- Web: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`

The web app reads `VITE_API_URL`. For local development, set it to `http://localhost:4000/api` in the root `.env` or `apps/web/.env.local`.

## Demo logins

Use workspace code `greenleaf-pest` for the demo workspace. The seeded password is `ServiProof#2026` unless you set `DEMO_PASSWORD` before running the seed script.

| Role | Email |
|---|---|
| Owner / demo admin | `admin@greenleafpest.com` |
| Dispatcher | `dispatcher@greenleafpest.com` |
| Technician | `technician@greenleafpest.com` |
| Customer portal | `customer.westlands@example.com` |

These are development demo credentials, not production accounts. Change or delete them before exposing a seeded workspace publicly. The credentials are intentionally documented here rather than displayed in the application UI.

## Useful scripts

| Command | Description |
|---|---|
| `npm run dev` | Run API and web dev servers together |
| `npm run dev:api` | Run API only |
| `npm run dev:web` | Run web only |
| `npm run build` | Build API and web |
| `npm run typecheck` | Type-check API and web |
| `npm run test` | Run API unit tests |
| `npm run db:migrate` | Apply PostgreSQL schema |
| `npm run db:seed` | Insert the demo workspace |

## Deployment

### PostgreSQL
Provision PostgreSQL 16+ with backups enabled. Use a dedicated database user with only the permissions needed by the application. Run migrations before starting the API:

```bash
npm run db:migrate
```

Seed only a private test/staging environment:

```bash
npm run db:seed
```

### API on Render

A starting Blueprint is provided in `render.yaml`. Review the service plan, database plan, persistent disk size and region before applying it. Configure:

- `DATABASE_URL`: Render PostgreSQL connection string.
- `JWT_SECRET`: at least 32 random characters; the Blueprint generates one.
- `COOKIE_SECURE=true`.
- `WEB_ORIGIN`: the exact production frontend origin, without a trailing slash.
- `UPLOAD_DIR=/var/data/uploads` when using the provided Render persistent disk.
- `DATABASE_SSL`: set according to the database connection endpoint you use.

After the first deployment, run `npm run db:migrate` from the API service shell. Seed only a non-production demo/staging workspace. Verify `/api/health` returns `status: ok` and `database: connected`.

The local-disk upload adapter requires persistent storage. Do not use ephemeral container storage for customer evidence in production. For multi-instance deployments, migrate this adapter to object storage such as Cloudflare R2 or S3 and use private, short-lived signed URLs.

### Web on Vercel

Import the repository and set the project root to `apps/web`. Configure:

- Build command: `npm run build`.
- Output directory: `dist`.
- `VITE_API_URL`: `https://YOUR-API-HOST/api`.

The `apps/web/vercel.json` file provides SPA fallback routing. Configure the API's `WEB_ORIGIN` to the exact Vercel origin.

For the most reliable cookie behaviour, use custom domains under the same registrable domain (for example `app.example.com` and `api.example.com`). Cross-site cookie policies can vary by browser when the frontend and API use unrelated hosting domains. HTTPS is mandatory when `COOKIE_SECURE=true`.

### Scheduled work
The API starts a daily schedule at 00:10 Africa/Nairobi. It creates work orders for active contracts whose next service date is due and advances the contract's next date. A unique `(company_id, contract_id, recurrence_date)` constraint and row locking protect against duplicate generation. The scheduler also marks unpaid invoices past their due date as overdue.

Run a single API process per workspace deployment unless you have reviewed how your scheduler and upload adapter behave across multiple instances. The database constraints prevent duplicate recurrence records, but a dedicated worker is recommended as the application scales.

## External integrations and current boundaries

The product includes integration-ready workflows, but credentials and provider accounts are not bundled:

- **M-Pesa:** payment recording supports the `mpesa` method and transaction reference. Live Daraja STK Push, callback verification and automatic statement reconciliation are not connected yet.
- **WhatsApp and email:** customer notifications are not connected. Add a provider, templates, consent and retry handling before enabling outbound messaging.
- **Object storage:** uploads currently use a private local filesystem adapter. Use persistent disk for a small single-instance deployment or replace it with private object storage before horizontal scaling.
- **Digital signature:** the current UI stores an optional customer sign-off name/reference. A drawn signature canvas and legally reviewed signature flow are not included.
- **Offline:** the PWA caches the application shell and queues work-order completion. It does not yet provide a complete offline copy of customer/job data or offline evidence uploads.
- **PDF:** service reports use the browser print dialog and can be saved as PDF. Server-generated, tamper-evident PDF documents are not included.

## Production readiness checklist

Before accepting real customer data or payments:

1. Set a unique production `JWT_SECRET`, strict allowed origins, HTTPS and secure cookie settings.
2. Add email verification, password reset, MFA for privileged users and an account recovery process.
3. Configure automated database backups, restore drills, log retention and uptime/error monitoring.
4. Replace or persist the upload adapter; add file scanning, retention policies and signed downloads.
5. Add automated API integration tests against an isolated PostgreSQL database and end-to-end browser tests.
6. Review access control, tenant isolation, data protection obligations and customer contracts with qualified reviewers.
7. Run `npm audit` against the resolved lockfile and remediate production dependency advisories.
8. Validate the pricing and service workflow with real pest-control operators before scaling sales.

This is a substantial MVP codebase, not a claim of third-party security certification or a live commercial deployment. Build/type/test verification should be run in the deployment environment after dependency installation.

## Product validation

See [docs/customer-discovery.md](docs/customer-discovery.md) for a practical customer interview script, pilot design and commercial validation plan. Do not build expensive add-ons before at least three operators agree to test the core workflow and at least one pays for a pilot.
