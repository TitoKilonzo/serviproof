# Verification record

This handoff is a source-code MVP, not a deployed production service.

## Checks completed in the build workspace

- TypeScript/TSX syntax transpilation: passed for all 18 non-declaration source files.
- JSON configuration parsing: passed for the 8 package, TypeScript and Vercel JSON configuration files.
- Focused runtime checks: passed for 7 recurring-date cases (month-end, leap-year, quarterly, custom, fortnightly and annual) and 2 UUID validation cases.
- Manual source review: tenant scoping, role gates, evidence authorization and invoice payment locking were reviewed.

## Checks not completed

- `npm install` did not complete in this environment (dependency installation timed out). No dependency-backed build or typecheck is claimed.
- `npm run build`, `npm run typecheck` and `npm test` have not been run with installed project dependencies.
- PostgreSQL migration and seed scripts have not been executed against a live database.
- `npm audit` has not been run against a resolved lockfile; no zero-vulnerability claim is made.
- No live M-Pesa, WhatsApp, email, object-storage or production hosting integration is configured.

## First verification on your machine

From the repository root:

```bash
cp .env.example .env
# Set a strong JWT_SECRET and confirm DATABASE_URL.
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run typecheck
npm test
npm run build
npm run dev
```

Then open `http://localhost:5173` and check `http://localhost:4000/api/health`. Use the demo role credentials in the root README only in a private development environment. Do not deploy the seeded demo accounts to a public production workspace.
