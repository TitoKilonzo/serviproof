# Security notes

## Implemented baseline
- Passwords are hashed with bcrypt (12 rounds).
- Sessions use signed JWTs stored in HttpOnly cookies.
- Cookies use `Secure` and `SameSite=None` when `COOKIE_SECURE=true`; local development uses non-secure `SameSite=Lax`.
- Allowed origins are explicitly configured through `WEB_ORIGIN` and checked on mutating requests.
- Helmet supplies security headers; API body size is limited.
- Sign-in and registration routes are rate-limited.
- Protected API routes derive the tenant from the authenticated database user.
- Tenant-owned entities use composite foreign keys to keep linked rows in the same company.
- Customer and technician scopes are enforced in API queries and evidence retrieval.
- Evidence files are stored with random storage keys and are not exposed through a static public directory.
- Invoice payment writes lock the invoice row and validate the remaining balance.

## Before production
This project is an MVP baseline, not a completed security certification. Add email verification, password reset, MFA, session revocation, stronger account lockout/risk controls, CSRF token strategy for any deployment where same-site origin validation is insufficient, antivirus scanning and private object storage. Review dependency advisories and run penetration tests before storing customer-sensitive evidence.

Report suspected vulnerabilities privately to the project maintainer. Do not publish customer records, credentials, or evidence files in issue trackers.
