# Backend — Portfolio API and Admin Content

Express + TypeScript API with PostgreSQL and Prisma. It serves the public portfolio and the authenticated admin dashboard, with Owner and Editor roles enforced on the server.

## Implemented

- **Authentication:** email + password with Argon2id hashing, server-side sessions (`connect-pg-simple`), session identifier rotation on sign-in, idle timeout (8h) and absolute lifetime (12h).
- **Authorization:** `requireAdmin` guards every `/api/admin/*` route and reloads the account (including role and active status) from the database on each request. `requireOwner` additionally guards administrators, site settings, sessions, health, analytics, and the activity log. Nothing relies on the frontend hiding UI.
- **CSRF:** double-submit cookie token required on every state-changing request, plus an Origin allowlist.
- **Rate limiting:** failed sign-ins per IP (default 5 per 15 minutes, `LOGIN_RATE_LIMIT_MAX`).
- **Validation:** Zod schemas on every request body and query, with field-level error responses.
- **Profile:** singleton public profile (name, headline, biography, location, public email, website/LinkedIn/GitHub links, portrait URL and description) with validated partial updates, merged cross-field validation, and a public allowlisted read.
- **Homepage hero portrait:** upload a JPEG, PNG, or WebP (validated by magic bytes, dimension and pixel limits), stored on disk under `MEDIA_ROOT` with metadata in `MediaAsset`. Alt text, visibility, tilt/animation intensity, and floating motion are draft fields; `POST /api/admin/homepage/publish` copies them to the published state atomically. Public reads only ever expose the published, visible portrait through a versioned URL. Superseded files are deleted once unreferenced; referenced assets cannot be deleted.
- **Projects:** create, read, update, delete, publish, archive, search, status and category filters, pagination, unique slugs, plus a screenshot gallery (up to 8 hosted images with mandatory alt text and optional captions; sending the array replaces the gallery).
- **Skills:** create, read, update, delete, publish/hide, search and category filters, unique names per category.
- **Categories:** managed project and skill categories with create, rename, re-slug, reorder, usage counts, and deletion blocked while records still reference them. Records store a foreign key, so renaming a category updates every linked project or skill. Creating a project or skill with an unknown category name creates that category.
- **Experience:** create, read, update, delete, publish/hide, search, date-only values with ordering rules (a current role cannot carry an end date).
- **Education and certifications:** create, read, update, delete, publish/hide, with optional dates, credential IDs, and verification URLs.
- **Contact inbox:** public submissions are validated, rate limited per IP, honeypot-filtered, and stored privately. Administrators can list, search, filter, read, mark read/unread, archive, and delete messages; bodies are never written to the audit log.
- **Visibility:** public endpoints return published records only and select public fields only.
- **Audit log:** sign-ins, failures, sign-outs, and every content mutation (projects, skills, experience, education, certifications, messages) are recorded in `AuditEvent`.
- **Activity log API:** append-only, paginated and filterable reads by search term, area, action, and date range. There is no endpoint that edits or deletes audit records.
- **Session management:** lists the signed-in administrator's own sessions with a short non-reversible fingerprint, current-session marker, timestamps, and the user-agent string stored at sign-in (rendered by the dashboard as a short device description). One or all other sessions can be revoked; both actions are audited.
- **Administrators:** owner-managed accounts with Owner/Editor roles, deactivation, and password resets that revoke the account's sessions. The last active owner cannot be demoted or deactivated, and an account cannot deactivate itself.
- **Bulk actions, trash, and revisions:** one transactional bulk request (publish, unpublish, or trash up to 50 records), soft deletion with restore and permanent purge, and an append-only revision snapshot per change with one-click restore.
- **Scheduled publishing:** a future `publishAt` per content record, cancelled or replaced through the dashboard; the API process promotes due records every 30 seconds with a conditional update, so concurrent instances publish each record once.
- **Site settings and homepage sections:** owner-editable SEO/social metadata and the public homepage section order and featured selections.
- **Media library:** uploaded assets with validated contents, editable alt text, and reference-aware deletion.
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

Uploaded portraits are written to `MEDIA_ROOT` (default `backend/storage/media`, created on demand and excluded from Git). Override it with an absolute or backend-relative path; `MEDIA_MAX_BYTES` (default 8 MiB) and `MEDIA_UPLOAD_LIMIT_PER_HOUR` (default 20) control the upload limits.

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
| `GET` | `/api/hero` | Public | Published hero portrait and effect settings (never draft values) |
| `GET` | `/api/media/hero-portrait/:id` | Public | Streams the published portrait; other ids return 404 |
| `GET` | `/api/profile` | Public | Approved public profile fields, `null` until initialised |
| `GET` | `/api/projects?category=` | Public | Published projects, public fields only, optionally filtered by category name |
| `GET` | `/api/projects/:slug` | Public | One published project; drafts and unknown slugs return 404 |
| `GET` | `/api/project-categories` | Public | Categories that still group at least one published project |
| `GET` | `/api/skills` | Public | Published skills, public fields only |
| `GET` | `/api/skill-categories` | Public | Categories that still group at least one published skill |
| `GET` | `/api/experience` | Public | Published experience entries, public fields only |
| `GET` | `/api/education` | Public | Published education entries |
| `GET` | `/api/certifications` | Public | Published certifications |
| `POST` | `/api/contact` | Public (rate limited) | Submit a contact message; requires a CSRF token |
| `GET` | `/api/auth/csrf` | Public | Issue a CSRF token cookie |
| `POST` | `/api/auth/login` | Public (rate limited) | Sign in |
| `POST` | `/api/auth/logout` | Session | Sign out and destroy the session |
| `GET` | `/api/auth/session` | Session | Current admin or 401 |
| `GET` | `/api/admin/overview` | Admin | Project and content counts, recent audit events |
| `GET` | `/api/admin/profile` | Admin | Editable profile, or `null` before it exists |
| `PATCH` | `/api/admin/profile` | Admin | Create or partially update the singleton profile |
| `GET` | `/api/admin/homepage` | Admin | Draft and published hero state, change flag, upload limits |
| `PATCH` | `/api/admin/homepage` | Admin | Update draft alt text, visibility, and effect settings |
| `POST` | `/api/admin/homepage/portrait` | Admin | Upload/replace the draft portrait (multipart field `file`, rate limited) |
| `DELETE` | `/api/admin/homepage/portrait` | Admin | Clear the draft portrait, leaving the published state |
| `POST` | `/api/admin/homepage/publish` | Admin | Publish the draft state |
| `GET` | `/api/admin/media?page=&pageSize=&search=` | Admin | Paginated media library |
| `POST` | `/api/admin/media` | Admin | Upload an image (multipart field `file`, rate limited) |
| `GET` | `/api/admin/media/:id` | Admin | One asset's metadata |
| `PATCH` | `/api/admin/media/:id` | Admin | Edit alt text |
| `GET` | `/api/admin/media/:id/file` | Admin | Stream any stored asset (draft preview) |
| `DELETE` | `/api/admin/media/:id` | Admin | Delete an unreferenced asset; 409 while referenced |
| `GET` | `/api/admin/settings` | Admin (owner) | Site title, description, canonical URL, and social image |
| `PATCH` | `/api/admin/settings` | Admin (owner) | Save the allowlisted site settings |
| `POST` | `/api/admin/bulk/:type` | Admin | Publish, unpublish, or trash 1–50 records atomically |
| `GET` | `/api/admin/trash?type=&page=&pageSize=` | Admin | Trashed records across content types |
| `POST` | `/api/admin/trash/restore` | Admin | Bulk restore 1–50 selected records |
| `POST` | `/api/admin/trash/purge` | Admin | Bulk permanently delete 1–50 selected records |
| `POST` | `/api/admin/trash/:type/:id/restore` | Admin | Restore a trashed record |
| `DELETE` | `/api/admin/trash/:type/:id` | Admin | Permanently delete a trashed record |
| `GET` | `/api/admin/revisions?entityType=&entityId=&page=&pageSize=` | Admin | Revision history, newest first |
| `GET` | `/api/admin/revisions/:id` | Admin | One revision with its snapshot |
| `POST` | `/api/admin/revisions/:id/restore` | Admin | Re-apply a snapshot through the update path |
| `GET` | `/api/admin/scheduling` | Admin | Unpublished records and their schedules |
| `PATCH` | `/api/admin/schedule/:type/:id` | Admin | Set or clear `publishAt` (`null` cancels) |
| `GET` | `/api/admin/health` | Admin (owner) | Read-only database, storage, and scheduler indicators |
| `GET` | `/api/admin/analytics?days=` | Admin (owner) | Aggregate page views by day and path |
| `GET` | `/api/admin/audit-logs?page=&pageSize=&search=&entityType=&action=&from=&to=` | Admin (owner) | Paginated, filtered audit history (page size max 50) |
| `GET` | `/api/admin/sessions` | Admin (owner) | The caller's active sessions, identifiers fingerprinted |
| `DELETE` | `/api/admin/sessions/:id` | Admin (owner) | Revoke one other session |
| `DELETE` | `/api/admin/sessions` | Admin (owner) | Revoke every other session for the caller |
| `GET` | `/api/admin/administrators` | Admin (owner) | List accounts without password hashes |
| `POST` | `/api/admin/administrators` | Admin (owner) | Create an owner or editor account |
| `PATCH` | `/api/admin/administrators/:id` | Admin (owner) | Change name, role, or active status |
| `POST` | `/api/admin/administrators/:id/password` | Admin (owner) | Reset a password and revoke that account's sessions |
| `GET` | `/api/admin/projects?search=&status=&page=&pageSize=&sort=` | Admin | Paginated project list |
| `POST` | `/api/admin/projects` | Admin | Create a project |
| `GET` | `/api/admin/projects/:id` | Admin | Read one project |
| `PATCH` | `/api/admin/projects/:id` | Admin | Update fields and/or status |
| `DELETE` | `/api/admin/projects/:id` | Admin | Permanently delete a project |
| `GET` | `/api/admin/project-categories` | Admin | Project categories with project counts, in display order |
| `POST` | `/api/admin/project-categories` | Admin | Create a category; the slug is derived from the name when omitted |
| `PATCH` | `/api/admin/project-categories/:id` | Admin | Rename, re-slug, or reorder a category |
| `DELETE` | `/api/admin/project-categories/:id` | Admin | Delete an unused category (409 while projects reference it) |
| `GET` | `/api/admin/skills?search=&category=` | Admin | Skill list |
| `POST` | `/api/admin/skills` | Admin | Create a skill |
| `GET` | `/api/admin/skills/:id` | Admin | Read one skill |
| `PATCH` | `/api/admin/skills/:id` | Admin | Update a skill, including visibility |
| `DELETE` | `/api/admin/skills/:id` | Admin | Permanently delete a skill |
| `GET` | `/api/admin/skill-categories` | Admin | Skill categories with skill counts, in display order |
| `POST` | `/api/admin/skill-categories` | Admin | Create a category; the slug is derived from the name when omitted |
| `PATCH` | `/api/admin/skill-categories/:id` | Admin | Rename, re-slug, or reorder a category |
| `DELETE` | `/api/admin/skill-categories/:id` | Admin | Delete an unused category (409 while skills reference it) |
| `GET` | `/api/admin/experience?search=` | Admin | Experience list, newest first |
| `POST` | `/api/admin/experience` | Admin | Create an experience entry |
| `GET` | `/api/admin/experience/:id` | Admin | Read one experience entry |
| `PATCH` | `/api/admin/experience/:id` | Admin | Update an experience entry |
| `DELETE` | `/api/admin/experience/:id` | Admin | Permanently delete an experience entry |
| `GET` | `/api/admin/messages?search=&status=&page=&pageSize=` | Admin | Paginated contact inbox |
| `GET` | `/api/admin/messages/:id` | Admin | Read one message |
| `PATCH` | `/api/admin/messages/:id` | Admin | Set status to `NEW`, `READ`, or `ARCHIVED` |
| `DELETE` | `/api/admin/messages/:id` | Admin | Permanently delete a message |

Status changes go through `PATCH` with `{"status":"PUBLISHED"|"DRAFT"|"ARCHIVED"}`; the service sets `publishedAt`/`archivedAt` consistently. Project payloads accept a `screenshots` array of `{url, alt, caption}`; the public read returns it ordered and omits the administrative columns.

Project and skill payloads keep sending `category` as a name. On create, an unknown name creates the category (so existing clients keep working); on update the name must already exist, and the field error asks the administrator to pick a managed category. Renaming or deleting categories is done through the category endpoints above, and deletion is refused with a 409 while any record still references the category.

## Security notes

- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, scoped to `/`.
- CSRF is verified before authorization for state-changing requests, including sign-in. An unauthenticated write without a token returns `403 csrf_failed`; with a valid token and no session it returns `401 unauthorized`.
- Unknown accounts and wrong passwords return the same message, and unknown accounts still perform an Argon2id verification to avoid a timing signal.
- Audit metadata records field names and titles, never passwords or session identifiers.
- The public profile endpoint returns an explicit allowlist of professional fields. Administrator credentials and account fields live on a separate model and are never included.
- Session-management responses expose only a 16-character SHA-256 fingerprint of a session id, plus timestamps and the stored user-agent string. The raw session id, cookie value, and cookie contents are never returned.
- A session can only be listed or revoked by the administrator who owns it; revoking the current session through the API is rejected with `409` (use sign-out).
- In production the API also serves the built SPA from `../frontend/dist`, keeping the app on one origin (no CORS, simpler cookie/CSRF rules).

## Testing

```bash
npm test
```

Vitest + Supertest run against the isolated `portfolio_test` database; migrations are applied by the test global setup and tables are truncated between tests. Coverage includes unauthorized access, CSRF rejection, origin rejection, credential enumeration, session lifecycle, cookie flags, rate limiting, validation errors, slug conflicts, publish/archive visibility rules, pagination, deletion, skill uniqueness, experience date rules, audit records, audit-log filtering and pagination, session isolation, session revocation, profile singleton/partial-update/merged validation rules, portrait alt-text enforcement, the public profile field allowlist, contact submission validation, honeypot filtering, rate limiting, inbox pagination/filtering, status changes, deletion, project screenshot galleries (create, replace-on-update, validation, cascade delete, public exposure), bulk actions, trash and revisions (including cross-type bulk restore and purge), scheduled publishing (validation, conflicts, due-record promotion), site settings, homepage sections, media uploads, administrator management and role enforcement — 142 tests.

## Known limitations

- The login rate limiter uses in-memory storage, which assumes a single API instance. Running multiple instances requires a shared store (e.g. Redis).
- Multi-factor authentication is not implemented. Do not claim MFA protection.
- Password resets are performed by an owner from the Administrators page; `create-admin` remains the recovery path for a locked-out deployment and always provisions an Owner.
- Uploaded images are stored on the API host's filesystem under `MEDIA_ROOT`, so multiple API instances need a shared volume.
- Contact messages are stored in the database only; email notifications are not sent, so the API never claims a message was emailed.
- Blog or notes content is not modelled yet.
- There is a single administrator role; no role-based permission tiers exist yet.
