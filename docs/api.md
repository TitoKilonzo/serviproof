# API reference

Base URL for local development: `http://localhost:4000/api`.

Authentication is cookie-based. Send requests from the configured frontend origin with `credentials: 'include'`. JSON endpoints use `Content-Type: application/json`. Upload endpoints use multipart form data.

## Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public, rate-limited | Create company workspace and owner account |
| POST | `/auth/login` | Public, rate-limited | Sign in using email, password and workspace slug |
| GET | `/auth/me` | Session | Read current user |
| POST | `/auth/logout` | Public/session | Clear the session cookie |

Registration body:

```json
{"companyName":"GreenLeaf Pest Solutions","fullName":"A. Owner","email":"owner@example.com","password":"AtLeast10Chars"}
```

Login body:

```json
{"companySlug":"greenleaf-pest","email":"admin@greenleafpest.com","password":"ServiProof#2026"}
```

## Workspace endpoints

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/dashboard` | All signed-in roles | Role-scoped KPI and activity summary |
| GET / POST | `/customers` | Read: owner/admin/dispatcher/customer; create: owner/admin/dispatcher | Customer list / create customer |
| PATCH | `/customers/:id` | owner/admin/dispatcher | Update customer fields |
| POST | `/customers/:id/portal-user` | owner/admin/dispatcher | Create a customer login linked to that customer |
| GET / POST | `/sites` | Read: owner/admin/dispatcher/technician/customer; create: owner/admin/dispatcher | Service locations |
| GET / POST | `/contracts` | Read: owner/admin/dispatcher/customer; create: owner/admin/dispatcher | Recurring service contracts |
| GET / POST | `/work-orders` | Read: all signed-in roles (scoped); create: owner/admin/dispatcher | Work order list / creation |
| PATCH | `/work-orders/:id/assign` | owner/admin/dispatcher | Assign or unassign a technician |
| POST | `/work-orders/:id/start` | owner/admin/dispatcher/assigned technician | Start a job |
| POST | `/work-orders/:id/complete` | owner/admin/dispatcher/assigned technician | Record completion, notes, materials, checklist and sign-off reference |
| GET | `/work-orders/:id/evidence` | Signed-in user with job access | List evidence metadata |
| POST | `/work-orders/:id/evidence` | Signed-in user with job access | Upload image/PDF (10 MB default max) |
| GET | `/evidence/:id/file` | Signed-in user with job access | Retrieve a private evidence file |
| GET / POST | `/team` | Read: owner/admin/dispatcher; create: owner/admin | List/add internal team users |
| GET / POST | `/invoices` | Read: owner/admin/dispatcher/customer; create: owner/admin/dispatcher | Invoice list / create invoice |
| POST | `/invoices/:id/payments` | owner/admin/dispatcher | Record payment and update balance/status |
| GET | `/reports/summary` | owner/admin/dispatcher | Monthly and service-type reporting aggregates |
| GET / PATCH | `/settings/company` | owner/admin | Read/update workspace profile |
| GET | `/health` | Public | API and database readiness |

## Work-order completion payload

```json
{
  "technicianNotes": "Inspection complete. Monitoring points checked.",
  "materialsUsed": [{"name":"Bait station","quantity":"2"}],
  "checklist": [{"label":"Service delivered and site inspected","done":true}],
  "latitude": -1.2673,
  "longitude": 36.8106,
  "customerSignature": "Customer sign-off reference"
}
```

Latitude and longitude are optional numeric values. The API does not automatically collect device location; a future mobile flow should request browser permission and explain its use before sending coordinates.

## Create invoice payload

```json
{
  "customerId":"00000000-0000-4000-8000-000000000000",
  "dueDate":"2026-12-01",
  "taxRate":0,
  "items":[{"description":"Pest treatment service","quantity":1,"unitPrice":12000}]
}
```

The API checks that a linked work order belongs to the selected customer and the same company. Payment recording locks the invoice row before applying a payment and rejects amounts above the remaining balance.

## Error format

Errors are returned as JSON:

```json
{"error":"Human-readable explanation"}
```

Common HTTP codes: `400` validation/business-rule error, `401` missing or expired session, `403` role/origin denied, `404` inaccessible or missing resource, `409` duplicate record, `413` upload too large, `500` unexpected server error, `503` database unavailable.

In production, the API intentionally avoids returning stack traces or database internals to clients.
