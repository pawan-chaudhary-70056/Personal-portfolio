# Backend — Portfolio API and Admin Content

Express + TypeScript API with PostgreSQL and Prisma. It serves the public project feed and the authenticated admin content operations behind account management for a single owner.

## Implemented

- **Authentication:** email + password with Argon2id hashing, server-side sessions (`connect-pg-simple`), session identifier rotation on sign-in, idle timeout (8h) and absolute lifetime (12h).
- **Authorization:** a `requireAdmin` middleware guards every `/api/admin/*` route. Nothing relies on the frontend hiding UI.
- **CSRF:** double-submit cookie token required on every state-changing request, plus an Origin allowlist.
- **Rate limiting:** failed sign-ins per IP (default 5 per 15 minutes, `LOGIN_RATE_LIMIT_MAX`).
- **Validation:** Zod schemas on every request body and query, with field-level error responses.
- **Projects:** create, read, update, delete, publish, archive, search, status filter, pagination, unique slugs.
- **Skills:** create, read, update, delete, publish/hide, search and category filters, unique names per category.
- **Experience:** create, read, update, delete, publish/hide, search, date-only values with ordering rules (a current role cannot carry an end date).
- **Visibility:** public endpoints return published records only and select public fields only.
- **Audit log:** sign-ins, failures, sign-outs, and every content mutation (projects, skills, experience) are recorded in `AuditEvent`.
- **Hardening:** Helmet security headers (CSP, HSTS, nosniff, frame restrictions), 100 kB JSON limit, `x-powered-by` disabled, no public registration.

There is no public registration endpoint. The owner account is provisioned with a script.

## Setup

```bash
# 1. Start PostgreSQL (from the repository root)
docker compose up -d db

# 2. Configure
cd backend
npm install
cp .env.example .env
# Set SESSION_SECRET to a generated value:
openssl rand -hex 32

# 3. Create the schema and the owner account
npx prisma migrate dev
npm run create-admin        # reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from .env

# 4. Run
npm run dev                 # http://localhost:4000
```

The development database listens on `127.0.0.1:5433` (port 5433 avoids clashing with a local PostgreSQL on 5432).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | API with reload via `tsx watch` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm test` | Integration tests against `portfolio_test` |
| `npm run create-admin` | Create or update the owner account |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations (staging/production) |

## API

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Liveness check |
| `GET` | `/api/projects` | Public | Published projects, public fields only |
| `GET` | `/api/skills` | Public | Published skills, public fields only |
| `GET` | `/api/experience` | Public | Published experience entries, public fields only |
| `GET` | `/api/auth/csrf` | Public | Issue a CSRF token cookie |
| `POST` | `/api/auth/login` | Public (rate limited) | Sign in |
| `POST` | `/api/auth/logout` | Session | Sign out and destroy the session |
| `GET` | `/api/auth/session` | Session | Current admin or 401 |
| `GET` | `/api/admin/overview` | Admin | Project and content counts, recent audit events |
| `GET` | `/api/admin/audit-events?limit=` | Admin | Audit history (max 100) |
| `GET` | `/api/admin/projects?search=&status=&page=&pageSize=&sort=` | Admin | Paginated project list |
| `POST` | `/api/admin/projects` | Admin | Create a project |
| `GET` | `/api/admin/projects/:id` | Admin | Read one project |
| `PATCH` | `/api/admin/projects/:id` | Admin | Update fields and/or status |
| `DELETE` | `/api/admin/projects/:id` | Admin | Permanently delete a project |
| `GET` | `/api/admin/skills?search=&category=` | Admin | Skill list |
| `POST` | `/api/admin/skills` | Admin | Create a skill |
| `GET` | `/api/admin/skills/:id` | Admin | Read one skill |
| `PATCH` | `/api/admin/skills/:id` | Admin | Update a skill, including visibility |
| `DELETE` | `/api/admin/skills/:id` | Admin | Permanently delete a skill |
| `GET` | `/api/admin/experience?search=` | Admin | Experience list, newest first |
| `POST` | `/api/admin/experience` | Admin | Create an experience entry |
| `GET` | `/api/admin/experience/:id` | Admin | Read one experience entry |
| `PATCH` | `/api/admin/experience/:id` | Admin | Update an experience entry |
| `DELETE` | `/api/admin/experience/:id` | Admin | Permanently delete an experience entry |

Status changes go through `PATCH` with `{"status":"PUBLISHED"|"DRAFT"|"ARCHIVED"}`; the service sets `publishedAt`/`archivedAt` consistently.

## Security notes

- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, scoped to `/`.
- CSRF is verified before authorization for state-changing requests, including sign-in. An unauthenticated write without a token returns `403 csrf_failed`; with a valid token and no session it returns `401 unauthorized`.
- Unknown accounts and wrong passwords return the same message, and unknown accounts still perform an Argon2id verification to avoid a timing signal.
- Audit metadata records field names and titles, never passwords or session identifiers.
- In production the API also serves the built SPA from `../frontend/dist`, keeping the app on one origin (no CORS, simpler cookie/CSRF rules).

## Testing

```bash
npm test
```

Vitest + Supertest run against the isolated `portfolio_test` database; migrations are applied by the test global setup and tables are truncated between tests. Coverage includes unauthorized access, CSRF rejection, origin rejection, credential enumeration, session lifecycle, cookie flags, rate limiting, validation errors, slug conflicts, publish/archive visibility rules, pagination, deletion, skill uniqueness, experience date rules, and audit records — 43 tests.

## Known limitations

- The login rate limiter uses in-memory storage, which assumes a single API instance. Running multiple instances requires a shared store (e.g. Redis).
- Multi-factor authentication is not implemented. Do not claim MFA protection.
- No password reset flow; recovery is a deliberate re-run of `create-admin`.
- Media uploads are not implemented — image fields accept validated `http(s)` URLs.
- Contact messages, education, certifications, and blog content are not modelled yet.
- The public homepage still reads its content from `frontend/src/content/portfolio.ts` rather than `/api/projects`.
