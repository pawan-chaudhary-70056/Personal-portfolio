# Backend API Specification

## 1. Purpose

This document defines the REST API architecture and endpoint requirements for the Luxury Personal Portfolio and Admin Dashboard.

The API connects the public portfolio and protected admin dashboard to the application's business logic, PostgreSQL database, and configured media storage.

The API must provide:

- Public access to approved, published portfolio content.
- Secure administrator authentication and session management.
- Complete CRUD operations for supported content types.
- Draft, preview, publish, and unpublish workflows.
- Secure media upload and management.
- Contact form submission and inbox management.
- Homepage configuration and SEO settings.
- Search, filtering, sorting, and pagination.
- Consistent validation and error responses.
- Audit logging for sensitive administrative actions.
- Automated API, integration, and security testing.

This specification defines the intended API contract. Endpoints must be implemented and verified before being described as operational.

## 2. Technology Stack

| Component | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| HTTP framework | Express |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | Server-side sessions |
| Password hashing | Argon2id |
| Testing | Vitest and the project's selected API integration tools |
| API documentation | This specification and an optional OpenAPI document |

Use the versions defined by the actual project manifests and lockfiles.

## 3. API Conventions

### 3.1 Base URL

All API endpoints should use the versioned prefix:

`/api/v1`

For local development, the backend may run on:

`http://localhost:4000`

The production API URL must be configured through the deployment environment.

### 3.2 HTTP methods

| Method | Purpose |
|---|---|
| `GET` | Retrieve resources |
| `POST` | Create resources or perform explicit actions |
| `PUT` | Replace a resource when full replacement is intended |
| `PATCH` | Update selected resource fields |
| `DELETE` | Delete a resource when permitted |

Use `PATCH` for partial edits. Publication and other explicit state transitions should use documented action endpoints when appropriate.

### 3.3 Content types

- JSON requests should use `Content-Type: application/json`.
- File uploads should use `multipart/form-data`.
- JSON responses should use `application/json`.
- Unsupported media types should receive an appropriate error response.

### 3.4 Resource identifiers

Use stable database identifiers for administrative resource operations. Public detail pages should generally use unique, URL-safe slugs where applicable.

The API must validate identifiers and handle missing records without exposing database implementation details.

## 4. Response Format

Successful responses should follow a consistent structure.

Example:

```json
{
  "data": {
    "id": "project-id",
    "title": "Example Project"
  }
}
```

For a collection:

```json
{
  "data": [
    {
      "id": "project-id",
      "title": "Example Project"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

The `meta` object is required for paginated responses and may be omitted for simple, non-paginated resources.

### 4.1 Error format

Errors should follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "details": [
      {
        "field": "title",
        "message": "Title is required."
      }
    ],
    "requestId": "request-id"
  }
}
```

Rules:

- `code` must be a stable machine-readable value.
- `message` must be safe to show to the client.
- `details` may contain field-level validation errors.
- `requestId` should be included when request correlation is implemented.
- Do not return stack traces, SQL errors, secrets, session tokens, or internal configuration.

## 5. HTTP Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Successful read or update |
| `201 Created` | Resource created |
| `202 Accepted` | Work accepted for asynchronous processing, if supported |
| `204 No Content` | Successful operation without a response body |
| `400 Bad Request` | Invalid request structure or parameters |
| `401 Unauthorized` | Authentication required or session invalid |
| `403 Forbidden` | Authenticated user lacks permission |
| `404 Not Found` | Resource does not exist or is not available to the caller |
| `409 Conflict` | Duplicate, conflicting, or invalid state transition |
| `413 Content Too Large` | Upload or request exceeds configured limits |
| `415 Unsupported Media Type` | Unsupported content type |
| `422 Unprocessable Content` | Semantically invalid input, if used consistently |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Unexpected server failure |
| `503 Service Unavailable` | Required service temporarily unavailable |

Use a consistent policy for `400` versus `422`; do not alternate without a documented reason.

## 6. Authentication and Session API

The admin dashboard uses server-side sessions.

### 6.1 Login

`POST /api/v1/auth/login`

Authentication: Public endpoint with strict rate limiting.

Request:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

Expected behavior:

- Validate the request.
- Apply login rate limits.
- Verify the account and password hash.
- Use a generic failure message for invalid credentials.
- Rotate or regenerate the session identifier after successful authentication.
- Return only safe account information.
- Set the session cookie using the configured secure policy.

Successful response example:

```json
{
  "data": {
    "user": {
      "id": "admin-id",
      "email": "admin@example.com"
    }
  }
}
```

Do not return the password, password hash, session identifier, or authentication secrets in JSON.

### 6.2 Current session

`GET /api/v1/auth/session`

Authentication: Required for a valid session response, or the endpoint may consistently return an unauthenticated status.

Purpose:

- Determine whether an administrator is authenticated.
- Return safe account information.
- Support session-aware frontend initialization.

### 6.3 Logout

`POST /api/v1/auth/logout`

Authentication: Required.

Expected behavior:

- Invalidate the server-side session.
- Clear the session cookie.
- Return a successful response.
- Ensure the old session can no longer access protected resources.

The request must satisfy the application's CSRF protection requirements.

### 6.4 Session expiration

Expired or invalid sessions must not authorize administrative actions.

The frontend should clear private state and return the administrator to an appropriate authentication screen.

### 6.5 Second-factor challenge

`POST /api/v1/auth/mfa`

Authentication: A pending challenge created by a password login on an account with MFA enabled. The session is not authenticated for any administrative route until this call succeeds.

Request:

```json
{
  "code": "123456"
}
```

`code` accepts a six-digit authenticator code or one recovery code, with or without separators.

Expected behavior:

- Reject requests without a pending challenge, or after its 10-minute lifetime, with `401`.
- Allow five incorrect codes per challenge; the fifth failure destroys the session.
- Rate limit attempts independently of the login limiter.
- Reject a TOTP step that has already been accepted, so a code cannot be replayed.
- Mark a redemption recovery code as used; the same code then fails.
- On success, regenerate the session identifier, set `loggedInAt`, update `lastLoginAt`, and return the same safe account payload as `POST /auth/login`.
- Apply CSRF protection and write an `AUTH_MFA_FAILED` or `AUTH_LOGIN_SUCCEEDED` audit event with the method (`totp` or `recovery`).

A login response for an MFA account is:

```json
{
  "mfaRequired": true
}
```

## 7. Public Portfolio API

Public endpoints must return only content approved for public display.

The server must enforce publication visibility. Hiding draft records in the frontend is not sufficient.

### 7.1 Profile

`GET /api/v1/portfolio/profile`

Returns approved public profile information, such as:

- Display name.
- Professional headline.
- Biography.
- Profile image reference.
- Public contact links.
- Approved professional details.

Never include private account fields, internal notes, authentication information, or administrative metadata.

### 7.2 Homepage configuration

`GET /api/v1/portfolio/homepage`

Returns public homepage configuration, including supported section visibility, section ordering, and featured content references.

Only settings intended for public use may be returned.

### 7.3 Project listing

`GET /api/v1/portfolio/projects`

Supported query parameters may include:

- `page`
- `limit`
- `category`
- `search`
- `sort`
- `order`

Requirements:

- Return published and publicly eligible projects only.
- Validate pagination and sorting parameters.
- Apply maximum page-size limits.
- Restrict sorting to an allowlist of fields.
- Avoid exposing internal administrative fields.
- Return pagination metadata when pagination is used.

Example:

`GET /api/v1/portfolio/projects?page=1&limit=10`

### 7.4 Project details

`GET /api/v1/portfolio/projects/:slug`

Returns the published project matching the supplied slug.

If the project is unpublished, deleted, or unavailable to the public, return an appropriate not-found response.

### 7.5 Project categories

`GET /api/v1/portfolio/project-categories`

Returns categories that are eligible for public display. Categories with no published projects should be handled according to the documented public-content policy.

### 7.6 Skills

`GET /api/v1/portfolio/skills`

Supports optional category filtering and documented ordering.

Only publicly visible skills and categories should be returned.

### 7.7 Experience

`GET /api/v1/portfolio/experience`

Returns publicly approved professional experience in the defined display order.

### 7.8 Education

`GET /api/v1/portfolio/education`

Returns publicly approved education records.

### 7.9 Certifications

`GET /api/v1/portfolio/certifications`

Returns publicly approved certifications and relevant public metadata.

### 7.10 Public media access

Public media should be exposed only through the configured storage strategy or approved media URLs.

The API must not expose private files, internal storage credentials, server filesystem paths, or draft-only assets.

## 8. Contact API

### 8.1 Submit a message

`POST /api/v1/contact`

Authentication: Not required.

Request example:

```json
{
  "name": "Example Visitor",
  "email": "visitor@example.com",
  "subject": "Project enquiry",
  "message": "I would like to discuss a potential project."
}
```

Expected behavior:

- Validate every field on the server.
- Enforce maximum field lengths.
- Normalize and validate the email address.
- Apply rate limiting and appropriate spam controls.
- Store the accepted message.
- Return a safe confirmation.
- Avoid returning internal message-processing details.

Return success only after the message has been successfully accepted according to the configured persistence workflow.

If email notifications are enabled, distinguish successful message storage from successful email delivery.

## 9. Administrative API

All `/api/v1/admin/*` endpoints require an authenticated session and the appropriate permission.

Every write operation must be authorized and validated by the backend.

### 9.1 Dashboard overview

`GET /api/v1/admin/dashboard`

Returns authorized dashboard metrics, such as:

- Content counts.
- Draft and published counts.
- Recent activity summaries.
- Recent contact submissions.
- Other supported operational indicators.

Counts must come from real data. Avoid returning sensitive information unnecessarily.

### 9.2 Administrative profile

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/profile` | Read editable profile |
| `PATCH` | `/api/v1/admin/profile` | Update profile fields |

If the application separates the public profile record from the administrator account, the API must maintain that distinction.

### 9.3 Projects

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/projects` | List projects |
| `POST` | `/api/v1/admin/projects` | Create project |
| `GET` | `/api/v1/admin/projects/:id` | Read project |
| `PATCH` | `/api/v1/admin/projects/:id` | Update project |
| `DELETE` | `/api/v1/admin/projects/:id` | Delete or soft-delete project |
| `POST` | `/api/v1/admin/projects/:id/publish` | Publish project |
| `POST` | `/api/v1/admin/projects/:id/unpublish` | Remove project from public visibility |
| `GET` | `/api/v1/admin/projects/:id/preview` | Retrieve authorized draft preview |

The preview endpoint must require authorization and must never make unpublished content public.

### 9.4 Project categories

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/project-categories` | List categories |
| `POST` | `/api/v1/admin/project-categories` | Create category |
| `PATCH` | `/api/v1/admin/project-categories/:id` | Update category |
| `DELETE` | `/api/v1/admin/project-categories/:id` | Delete category |

Deletion must handle category associations safely. The backend should reject or resolve operations that would violate referential integrity.

### 9.5 Skills

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/skills` | List skills |
| `POST` | `/api/v1/admin/skills` | Create skill |
| `GET` | `/api/v1/admin/skills/:id` | Read skill |
| `PATCH` | `/api/v1/admin/skills/:id` | Update skill |
| `DELETE` | `/api/v1/admin/skills/:id` | Delete skill |

### 9.6 Skill categories

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/skill-categories` | List categories |
| `POST` | `/api/v1/admin/skill-categories` | Create category |
| `PATCH` | `/api/v1/admin/skill-categories/:id` | Update category |
| `DELETE` | `/api/v1/admin/skill-categories/:id` | Delete category |

The backend must handle associated skills according to the defined deletion policy.

### 9.7 Professional experience

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/experience` | List experience |
| `POST` | `/api/v1/admin/experience` | Create experience |
| `GET` | `/api/v1/admin/experience/:id` | Read experience |
| `PATCH` | `/api/v1/admin/experience/:id` | Update experience |
| `DELETE` | `/api/v1/admin/experience/:id` | Delete experience |

### 9.8 Education

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/education` | List education |
| `POST` | `/api/v1/admin/education` | Create education |
| `GET` | `/api/v1/admin/education/:id` | Read education |
| `PATCH` | `/api/v1/admin/education/:id` | Update education |
| `DELETE` | `/api/v1/admin/education/:id` | Delete education |

### 9.9 Certifications

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/certifications` | List certifications |
| `POST` | `/api/v1/admin/certifications` | Create certification |
| `GET` | `/api/v1/admin/certifications/:id` | Read certification |
| `PATCH` | `/api/v1/admin/certifications/:id` | Update certification |
| `DELETE` | `/api/v1/admin/certifications/:id` | Delete certification |

### 9.10 Publication consistency

Publishing or unpublishing a record must update the authoritative database state.

After successful publication:

- The public API must return the new eligible content.
- The admin dashboard must display the confirmed status.
- Any configured cache must be invalidated or refreshed.
- Associated public media must be accessible under the media policy.

After unpublishing or deleting a record, the public API must stop returning it as eligible content.

## 10. Media Management API

Media endpoints require an authenticated session and appropriate permissions.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/media` | List media records |
| `POST` | `/api/v1/admin/media` | Upload media |
| `GET` | `/api/v1/admin/media/:id` | Read media metadata |
| `PATCH` | `/api/v1/admin/media/:id` | Update permitted metadata |
| `DELETE` | `/api/v1/admin/media/:id` | Delete media when allowed |

### Upload requirements

The backend must:

- Enforce file-size limits.
- Allow only explicitly approved file types.
- Validate extension, declared MIME type, and actual content where feasible.
- Generate safe storage names.
- Prevent path traversal and unsafe filesystem access.
- Avoid accepting executable content.
- Restrict upload frequency and total resource use.
- Store metadata separately from the file bytes.
- Associate files with content through validated identifiers.
- Prevent deletion of assets that are still referenced, unless the operation safely updates all affected references.

Store files in the configured media-storage provider. Local storage is acceptable for development when appropriately configured, but production persistence and access controls must be documented.

## 11. Homepage and Site Settings API

These endpoints manage settings explicitly approved for administrator control.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/homepage` | Read homepage settings |
| `PATCH` | `/api/v1/admin/homepage` | Update homepage settings |
| `GET` | `/api/v1/admin/settings` | Read editable site settings |
| `PATCH` | `/api/v1/admin/settings` | Update editable site settings |

Supported settings may include:

- Homepage section visibility and ordering.
- Featured project references.
- Public contact information.
- Site title and description.
- Social sharing metadata.
- Other documented public presentation settings.

Do not allow the admin settings API to modify server secrets, database connection strings, arbitrary filesystem paths, or unrestricted server configuration.

The public API must expose only settings approved for public use.

## 12. Contact Inbox API

These endpoints require an authenticated administrator session.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/messages` | List messages |
| `GET` | `/api/v1/admin/messages/:id` | Read a message |
| `PATCH` | `/api/v1/admin/messages/:id` | Update supported message status |
| `DELETE` | `/api/v1/admin/messages/:id` | Delete a message if permitted |

Listing supports validated pagination and appropriate filtering.

The API must protect personal information and must not expose contact submissions through public endpoints.

## 13. Advanced Administrative Endpoints

The following routes are optional and must only be exposed when their backend functionality is implemented.

### 13.1 Revisions

Examples:

- `GET /api/v1/admin/revisions`
- `GET /api/v1/admin/revisions/:id`
- `POST /api/v1/admin/revisions/:id/restore`

Revision restoration must validate permissions, preserve data integrity, and record the operation in the audit log.

### 13.2 Trash and recovery

Examples:

- `GET /api/v1/admin/trash`
- `POST /api/v1/admin/trash/:id/restore`
- `DELETE /api/v1/admin/trash/:id`

Permanent deletion must be restricted and clearly distinguished from recoverable deletion.

### 13.3 Bulk operations

Examples:

- `POST /api/v1/admin/projects/bulk`
- `POST /api/v1/admin/skills/bulk`

Bulk operations must validate every item, enforce permissions, define transaction behavior, and return clear per-item or whole-operation results.

Do not allow arbitrary bulk actions through unrestricted client-supplied operation names.

### 13.4 Audit logs

`GET /api/v1/admin/audit-logs`

Audit access requires authorization. Filters and pagination must be validated.

Audit records must not be editable through a general-purpose CRUD endpoint.

`GET /api/v1/admin/login-monitoring`

Owner-only failed-login monitoring over the same append-only trail. `days` (1–30, default 7) selects a rolling window ending now. The response carries totals for failed sign-ins, failed second-factor codes, and successful sign-ins; failed sign-ins grouped by source address (top 10 by count); and the 20 most recent failures with the attempted account, reason, source address, and user agent. Read-only with a fixed response shape: no raw audit metadata, passwords, tokens, or session identifiers, and no write operations.

### 13.5 Sessions

Examples:

- `GET /api/v1/admin/sessions`
- `DELETE /api/v1/admin/sessions/:id`

Session-management endpoints must only return safe metadata and must never disclose raw session tokens.

### 13.6 Analytics and system health

Analytics and operational status endpoints should only be implemented when the underlying metrics or monitoring integrations exist.

System-health responses must not disclose secrets, internal network details, or unnecessary infrastructure information to unauthorized users.

Backup and restore operations must not be exposed as unrestricted public API actions.

### 13.7 Two-factor authentication

These routes act on the signed-in administrator only; an editor can manage their own second factor but not anyone else's.

- `GET /api/v1/admin/mfa` — status, enrolment date, pending setup flag, and the number of unused recovery codes.
- `POST /api/v1/admin/mfa/setup` — generate a new secret and return it with an `otpauth://` URI, issuer, digit count, and period (30 seconds). Refused with `409` when MFA is already enabled.
- `POST /api/v1/admin/mfa/enable` — confirm a six-digit code and return the ten recovery codes exactly once; revokes the account's other sessions.
- `POST /api/v1/admin/mfa/disable` — requires `{ password, code }`, deletes the secret and unused recovery codes, revokes other sessions, and returns `204`.
- `POST /api/v1/admin/mfa/recovery-codes` — requires `{ password, code }` and replaces every unused code.

Secrets, recovery codes, and code values must never be logged or returned from any other endpoint. The TOTP secret is stored encrypted; only the setup and enrolment responses expose it.

## 14. Validation Rules

All untrusted inputs must be validated on the backend.

Use Zod or the project's established validation approach.

### General validation

- Validate route parameters.
- Validate query parameters.
- Validate JSON request bodies.
- Validate file metadata and content.
- Enforce maximum string lengths.
- Normalize fields where appropriate.
- Reject unsupported properties where practical.
- Validate URLs and allowed protocols.
- Validate enum values against defined options.
- Validate dates and numeric ranges.
- Enforce relationship and publication constraints.

### Example project schema

```typescript
import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20000).optional(),
  categoryId: z.string().min(1).optional(),
  featured: z.boolean().optional(),
  liveUrl: z.string().url().optional(),
  repositoryUrl: z.string().url().optional()
});
```

This is an illustrative schema. Adjust field names, identifier formats, limits, and required properties to match the actual Prisma models and product requirements.

URL validation must also enforce allowed protocols and any applicable destination policy. A valid URL format alone does not guarantee that a destination is safe.

## 15. Authentication and Authorization Middleware

Protected endpoints must pass through the appropriate middleware.

Recommended logical sequence:

1. Load the session.
2. Confirm that the session is valid.
3. Identify the authenticated administrator.
4. Check the required permission.
5. Validate the request.
6. Execute the controller and service logic.
7. Record the required audit event.
8. Return the appropriate response.

The precise middleware order may differ where validation should occur before authentication for safe request handling, but no protected operation may execute before authentication and authorization have been enforced.

### Security requirements

- Use server-side sessions.
- Hash passwords with Argon2id.
- Use secure, `HttpOnly` cookies and an appropriate `SameSite` policy.
- Enable `Secure` cookies in HTTPS production.
- Rotate session identifiers after authentication.
- Implement CSRF protection for cookie-authenticated state-changing requests.
- Apply strict login rate limits.
- Never trust a role or user ID supplied by the client.
- Avoid revealing whether a specific account exists through login errors.
- Protect sensitive actions with additional verification where justified.

## 16. Pagination, Search, Filtering, and Sorting

Collection endpoints should support a consistent query convention.

Example:

`GET /api/v1/admin/projects?page=1&limit=20&search=security&sort=updatedAt&order=desc`

Requirements:

- `page` must be a valid positive integer.
- `limit` must have a configurable maximum.
- Search terms must be length-limited.
- Sort fields must be allowlisted.
- Sort order must accept only supported values, such as `asc` or `desc`.
- Filter values must be validated.
- The database query must remain parameterized.
- Pagination metadata must accurately describe the returned collection.

Do not interpolate arbitrary client-supplied sort expressions into SQL.

For larger datasets, consider cursor-based pagination when it provides measurable benefits.

## 17. Rate Limiting and Abuse Prevention

Apply rate limits based on endpoint risk.

At minimum, consider separate limits for:

- Login attempts.
- Public contact submissions.
- Media uploads.
- Administrative write operations.
- Expensive search or listing requests.

Return `429 Too Many Requests` with a safe message and a suitable retry indication when applicable.

Rate limits must be configured for the deployment environment. In multi-instance deployments, use an appropriately shared rate-limit store if global enforcement is required.

## 18. Database Transactions and Data Integrity

Use Prisma transactions when multiple related changes must succeed together.

Examples include:

- Creating or updating content and its relationships.
- Publishing content and recording its publication state.
- Applying a bulk operation.
- Restoring a revision.
- Updating references during a supported deletion workflow.

Requirements:

- Enforce uniqueness and foreign-key constraints.
- Handle duplicate slugs consistently.
- Return a safe conflict response when a uniqueness conflict occurs.
- Avoid partial updates when atomic behavior is required.
- Do not rely solely on frontend validation for integrity.

Audit logging should be designed so that required audit records are reliably associated with sensitive operations. Where possible, write the business change and corresponding audit record transactionally.

## 19. Audit Logging

Record security-relevant administrative actions, including:

- Successful authentication where required by policy.
- Failed authentication events where useful and safe.
- Content creation, updates, publication, and deletion.
- Media changes.
- Site settings changes.
- Revision restoration.
- Session-management actions.
- Permission-sensitive operations.

Audit events should contain only necessary information, such as:

- Event identifier.
- Actor identifier where available.
- Action type.
- Resource type and identifier.
- Timestamp.
- Outcome.
- Request correlation ID where available.

Never log passwords, session tokens, authentication cookies, or unnecessary private message contents.

Audit-log immutability and retention must be enforced by the backend and database policy, not merely by hiding edit buttons in the frontend.

## 20. Security Requirements

The API must:

- Use HTTPS in production.
- Validate all input server-side.
- Use parameterized database access.
- Enforce authorization on every administrative endpoint.
- Protect cookie-authenticated writes against CSRF.
- Apply appropriate CORS allowlists.
- Use secure HTTP headers.
- Prevent sensitive fields from being mass-assigned.
- Validate and isolate uploaded media.
- Apply endpoint-specific rate limits.
- Avoid leaking internal exceptions.
- Store secrets outside source control.
- Use least-privilege database credentials.
- Keep dependencies patched.
- Provide secure backup and restoration procedures.
- Test authorization boundaries and common API vulnerabilities.

Do not treat CORS as authentication or authorization.

See `docs/10-security.md` for the complete security requirements.

## 21. Error Handling

Use centralized error-handling middleware.

The backend should map known errors into safe HTTP responses, including:

- Validation failures.
- Authentication failures.
- Authorization failures.
- Missing resources.
- Duplicate or conflicting records.
- Rate-limit violations.
- Unsupported upload types.
- File-size violations.
- Database constraint errors.
- Unexpected internal failures.

Unexpected errors should be logged securely with a correlation identifier where available.

The API must not return stack traces, SQL statements, environment variables, filesystem paths, or secrets to public clients.

## 22. Environment Configuration

Configuration should be supplied through the runtime environment or a suitable secret-management system.

Typical settings may include:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- Session secret or equivalent secure session configuration.
- Allowed frontend origin.
- Media-storage configuration.
- Upload-size limits.
- Rate-limit settings.
- Email-provider configuration, if enabled.

Exact variable names must match the actual backend implementation.

Requirements:

- Validate required environment values at application startup.
- Fail safely when critical configuration is missing.
- Keep real production secrets out of Git.
- Use separate credentials for development and production.
- Do not expose server-side secrets through frontend environment variables or API responses.

## 23. Testing Strategy

The API must have automated tests covering its contract and security behavior.

### Unit tests

Test:

- Validation schemas.
- Service-layer business rules.
- Publication eligibility.
- Slug and relationship rules.
- Pagination and filtering logic.
- Error mapping.

### Integration tests

Test:

- Database reads and writes.
- Authentication and session expiration.
- Content CRUD.
- Publication transitions.
- Transaction behavior.
- Media metadata and storage integration.
- Contact submission persistence.
- Audit event creation.

### Security tests

Test:

- Unauthenticated access to protected endpoints.
- Insufficient authorization.
- CSRF protection.
- Rate limiting.
- Invalid and oversized uploads.
- Mass-assignment attempts.
- Invalid identifiers and malformed requests.
- SQL injection attempts through query and body inputs.
- Exposure of draft or private content.
- Session invalidation after logout.

### End-to-end tests

Verify the full administrator workflow:

1. Log in.
2. Create a project.
3. Save it as a draft.
4. Verify that public endpoints do not return it.
5. Publish the project.
6. Verify that public endpoints return it.
7. Update or unpublish it.
8. Verify the public result reflects the change.
9. Confirm audit events are generated.
10. Log out and verify protected requests are denied.

Use an isolated test database and safe test media. Tests must not modify production data.

## 24. Implementation Priorities

### Phase 1 — API foundation

- Configure Express and TypeScript.
- Establish versioned routing.
- Add centralized errors and request validation.
- Configure database connectivity through Prisma.
- Establish safe logging and environment validation.

### Phase 2 — Authentication and public endpoints

- Implement session authentication.
- Implement login, logout, and session status.
- Implement public profile and content endpoints.
- Enforce publication visibility.
- Implement the contact form endpoint.

### Phase 3 — Administrative CRUD

- Implement profile management.
- Implement projects and categories.
- Implement skills and categories.
- Implement experience, education, and certifications.
- Add pagination, filtering, and sorting.

### Phase 4 — Publishing and media

- Implement draft and publish workflows.
- Implement authorized previews.
- Configure secure media storage.
- Implement upload validation and media associations.
- Add cache invalidation if caching is enabled.

### Phase 5 — Advanced features

- Add homepage and site settings.
- Add contact inbox management.
- Add audit-log access.
- Add revision, recovery, and bulk operations where approved.
- Add analytics and system-status endpoints only when supported.

### Phase 6 — Verification

- Complete API integration tests.
- Test authorization boundaries.
- Run type checks, linting, and formatting.
- Run dependency and security checks.
- Verify migrations and backup/restore procedures.
- Confirm the API contract matches the frontend implementation.

## 25. Definition of Done

The backend API is ready for release when:

- All documented required endpoints are implemented.
- Request and response formats are consistent.
- Authentication and authorization are enforced server-side.
- Draft and unpublished content cannot leak through public endpoints.
- CRUD operations persist correctly.
- Publishing and unpublishing produce the correct public results.
- Media upload validation and access controls are effective.
- Contact messages are safely persisted and protected.
- Validation, rate limiting, and error handling are implemented.
- Sensitive administrative actions generate the required audit events.
- Automated tests cover critical workflows and security boundaries.
- Database migrations are reviewed and reproducible.
- Configuration and secrets are managed safely.
- Documentation matches the actual repository.

## 26. Hero Portrait API (Implemented)

The homepage portrait uses a draft/publish workflow. Binary files are stored outside PostgreSQL in the configured media root; the database stores metadata and references only.

### 26.1 Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/hero` | Published portrait and effect settings |
| `GET` | `/api/media/hero-portrait/:id` | Streams the published portrait bytes |

```json
{
  "hero": {
    "portrait": {
      "url": "/api/media/hero-portrait/cmxyz123",
      "alt": "Portrait of the portfolio owner",
      "width": 1200,
      "height": 1500,
      "mimeType": "image/jpeg"
    },
    "effect": {
      "enabled": true,
      "tiltIntensity": 40,
      "animationIntensity": 50,
      "floating": true
    }
  }
}
```

`portrait` is `null` when no portrait is published or when visibility is disabled. If the stored bytes are unavailable, the image request returns 404 and the homepage renders its fallback; the JSON contract is unchanged. Draft uploads, draft alt text, and draft effect values are never exposed. Only the id that matches the currently published portrait streams bytes; every other id returns 404, including when visibility is disabled. Published bytes are immutable and served with `Cache-Control: public, max-age=31536000, immutable`, so a new publication changes the URL and bypasses stale caches. `/api/hero` itself is not cached.

### 26.2 Administrative endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/homepage` | Draft and published state, change indicator, upload limits |
| `PATCH` | `/api/admin/homepage` | Update draft alt text, visibility, and effect settings |
| `POST` | `/api/admin/homepage/portrait` | Upload or replace the draft portrait (multipart field `file`) |
| `POST` | `/api/admin/homepage/portrait/library` | Reuse a media-library image as the draft portrait (`{ "mediaId": "..." }`) |
| `DELETE` | `/api/admin/homepage/portrait` | Clear the draft portrait; published state is untouched |
| `POST` | `/api/admin/homepage/publish` | Copy the draft state to the published state |
| `GET` | `/api/admin/media/:id/file` | Stream a stored asset to a signed-in administrator |
| `DELETE` | `/api/admin/media/:id` | Delete an unreferenced asset; 409 while referenced |

`PATCH` accepts `portraitAlt`, `portraitVisible`, `effectEnabled`, `tiltIntensity`, `animationIntensity`, and `floatingEnabled` (intensities are integers from 0 to 100), plus the homepage layout fields documented in §27.1.

`POST /portrait/library` selects an existing asset instead of uploading a copy. An unknown id returns `400 invalid_media` with `details[0].path === 'mediaId'`. The library description fills the draft alt text only while that field is empty. The previously selected draft asset is deleted when no draft or published reference remains; a still-published asset is always kept.

### 26.3 Upload validation

- `multipart/form-data`, one file in the `file` field. JSON parsing does not apply.
- The configured maximum size (`MEDIA_MAX_BYTES`, default 8 MiB) is enforced while reading the request; oversized files return 413.
- The client filename and declared MIME type are ignored. The format is detected from magic bytes.
- Allowlist: JPEG, PNG, and WebP. SVG, GIF, executables, and archives are rejected with 400.
- Width and height are parsed from the file header. More than 8000 px on either edge or more than 30 megapixels is rejected.
- Storage keys are generated UUIDs plus the detected extension; no request value is used in a filesystem path.
- Uploads are rate limited per IP and audited (`MEDIA_UPLOADED`); replacement, removal, draft updates, publication, and media deletion are audited too.

### 26.4 Publishing rules

- Publishing a visible draft portrait requires non-empty alt text; otherwise the request fails with a field-level 400 referencing `portraitAlt`.
- Publishing copies the portrait reference, alt text, visibility, and all effect values in one transaction, sets `publishedAt`, and writes `HOMEPAGE_PUBLISHED`.
- Clearing the draft portrait and publishing restores the built-in visual fallback.
- Superseded assets are removed only after neither the draft nor the published state references them. File removal failures are logged and never fail the request.
- Failed uploads leave the existing draft and published state unchanged.

## 27. Site Settings and Homepage Layout API (Implemented)

The site metadata and the homepage section layout share the settings endpoints documented in §11. All routes require an authenticated administrator and a CSRF token on writes.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/homepage` | Draft/published layout and hero state, section catalog, featured candidates, limits |
| `PATCH` | `/api/admin/homepage` | Update draft hero fields, `sectionOrder`, `hiddenSections`, and `featuredProjectIds` |
| `GET` | `/api/admin/settings` | Editable site metadata |
| `PATCH` | `/api/admin/settings` | Update allowlisted site metadata |
| `GET` | `/api/portfolio/homepage` | Published layout, featured project references, and approved site metadata |

### 27.1 Homepage layout

`PATCH /api/admin/homepage` accepts the §26 hero fields plus:

- `sectionOrder`: every section key exactly once, from `about`, `work`, `skills`, `experience`, `credentials`, `contact`. Partial orders and unknown keys return a field-level 400.
- `hiddenSections`: known, unique section keys. Hidden sections keep their position in `sectionOrder`.
- `featuredProjectIds`: up to 12 unique ids of **published** projects, in display order. Draft, archived, unknown, or duplicate ids return a field-level 400.

`GET /api/portfolio/homepage` returns only published values; before the first homepage publication it returns the default order with every section visible and no featured references.

```json
{
  "homepage": {
    "sections": [
      { "key": "about", "visible": true },
      { "key": "work", "visible": true },
      { "key": "contact", "visible": false }
    ],
    "featuredProjects": [
      { "id": "cmxyz123", "title": "Atlas dashboard", "slug": "atlas-dashboard" }
    ],
    "site": {
      "siteTitle": "Mark Atelier",
      "siteDescription": "Selected engineering and design work.",
      "canonicalUrl": "https://example.com",
      "socialImageUrl": "https://example.com/og.png"
    }
  }
}
```

Featured references are re-checked on every read: a project that was archived or unpublished after publication is omitted rather than returned as a broken link. Publishing also drops references that are no longer published.

### 27.2 Site settings

`PATCH /api/admin/settings` accepts only `siteTitle` (≤120), `siteDescription` (≤320), `canonicalUrl`, and `socialImageUrl`; the two URLs must be absolute http(s) values or empty. Unknown fields, including infrastructure keys such as `databaseUrl`, are rejected by strict validation. Settings are public immediately and every save is audited.

## 28. Media Library API (Implemented)

All routes require a signed-in administrator; writes also require the CSRF token. Responses never include storage keys or filesystem paths.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/media` | Paginated library listing |
| `POST` | `/api/admin/media` | Upload one image (multipart field `file`) |
| `GET` | `/api/admin/media/:id` | Read one asset's metadata |
| `GET` | `/api/admin/media/:id/file` | Stream the stored bytes (`private, no-store`) |
| `PATCH` | `/api/admin/media/:id` | Update `altText` |
| `DELETE` | `/api/admin/media/:id` | Delete an unreferenced asset; `409` while referenced |

### 28.1 Listing

`GET /api/admin/media?search=&page=1&pageSize=20`

- `search` (≤100 characters) matches the original filename or alt text, case-insensitively.
- `page` ≥ 1; `pageSize` 1–50, default 20. Unknown parameters and out-of-range values return `400 validation_error`.
- Ordered newest first. The response is `{ items, total, page, pageSize, pageCount }`, where each item is `{ id, url, originalFilename, mimeType, sizeBytes, width, height, altText, createdAt, updatedAt, referenced }`. `url` is the session-protected file route, not a public URL.
- `referenced` is `true` when the homepage draft or published portrait, a project cover, a gallery screenshot, or the profile portrait uses the asset, which is exactly the condition that blocks deletion.

### 28.2 Upload

Same validation, limits, and error codes as the portrait upload in §26.3: detected from magic bytes, JPEG/PNG/WebP only, configured byte cap (`413 file_too_large`), dimension limits, generated UUID storage key, `400 invalid_image` for anything else. The original filename is truncated to 200 characters and stored as metadata only. Uploads are rate limited per IP (`MEDIA_UPLOAD_LIMIT_PER_HOUR`, default 20 per hour) and audited as `MEDIA_UPLOADED`.

### 28.3 Editing and deletion

- `PATCH` accepts only `altText` (≤200 characters, or `null`/empty to clear). Any other field is rejected; MIME type, size, dimensions, and filename are facts about the stored bytes and are never writable.
- `DELETE` returns `409 conflict` while the homepage references the asset. Otherwise the row is deleted inside a transaction with a `MEDIA_DELETED` audit event, then the file is removed. A missing file is ignored; the row is already gone.
- Unknown ids return `404 not_found` for metadata, bytes, update, and delete alike.

## 29. Bulk Actions, Trash, and Revisions API (Implemented)

All routes require a signed-in administrator; writes also require the CSRF token. `type` is one of `project`, `skill`, `experience`, `education`, or `certification`.

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/admin/bulk/:type` | Apply one action to up to 50 records |
| `GET` | `/api/admin/trash` | Paginated trash, optionally filtered by `type` |
| `POST` | `/api/admin/trash/restore` | Restore 1–50 selected records across types |
| `POST` | `/api/admin/trash/purge` | Permanently delete 1–50 selected records across types |
| `POST` | `/api/admin/trash/:type/:id/restore` | Restore a trashed record |
| `DELETE` | `/api/admin/trash/:type/:id` | Permanently delete a trashed record |
| `GET` | `/api/admin/revisions` | Paginated revision history |
| `GET` | `/api/admin/revisions/:id` | One revision with its snapshot |
| `POST` | `/api/admin/revisions/:id/restore` | Re-apply a snapshot |

### 29.1 Bulk actions

```json
{ "action": "publish", "ids": ["...", "..."] }
```

- `action` is `publish`, `unpublish`, or `delete`; `ids` holds 1–50 unique ids. Unknown fields, an empty list, or an unsupported action return `400 validation_error`.
- The whole request runs in one transaction: if any id is missing or already in the trash, nothing changes (`404` / `409`).
- Publishing a project sets `status = PUBLISHED` and preserves the original `publishedAt`; unpublishing returns it to `DRAFT`. The other collections toggle `published`.
- Each record gets its own audit event with `metadata.bulk = true`, plus a revision snapshot.
- Response: `{ "type": "project", "action": "publish", "updated": 2 }`.

### 29.2 Trash

Deleted content is soft-deleted (`deletedAt`), excluded from every admin list, public response, and overview count. The original name, slug, and skill/category uniqueness stay reserved until the record is purged.

- Trash items: `{ type, entityType, id, title, subtitle, deletedAt, published, status? }`, newest deletion first, merged across types and paginated in memory (each collection contributes at most 200 rows).
- Restore clears `deletedAt`, writes `<ENTITY>_RESTORED`, and records a `RESTORED` revision. Restoring a live record returns `409`.
- Permanent deletion requires a trashed record, deletes dependants (project screenshots) by cascade, and writes `<ENTITY>_PURGED`. Purging a live record returns `409`.
- Bulk restore and purge take `{ "items": [{ "type": "project", "id": "..." }] }` with 1–50 entries; each entry carries its type because the trash mixes collections. Duplicate entries are collapsed. The whole request runs in one transaction: if any record is missing (`404`) or not in the trash (`409`), nothing changes. Responses are `{ "restored": 2 }` and `{ "purged": 2 }`, and every record keeps its individual audit event and revision.
- Categories that still have trashed projects or skills cannot be deleted; the API asks for a restore or purge first.

### 29.3 Revisions

Every create, update, bulk change, trash, restore, and revision restore stores a `ContentRevision` row in the same transaction as the change.

- `GET /api/admin/revisions?entityType=Project&entityId=...&page=1&pageSize=20` returns `{ items, total, page, pageSize, pageCount }`, newest first. Items omit the snapshot.
- `GET /api/admin/revisions/:id` returns the snapshot: the administrative representation of the record at that time (no secrets, no storage keys). It also returns `previous`: the revision immediately before this one for the same entity (`{ id, action, createdAt, snapshot }`), or `null` for the first snapshot. The dashboard diffs the two field by field; identical snapshots yield an empty diff.
- `POST /api/admin/revisions/:id/restore` re-applies the snapshot through the normal update path, so validation runs again and a new revision is stored. It writes `REVISION_RESTORED` with the revision id.
- Restoring while the record is in the trash returns `409`; a purged record returns `404`.

## 30. Administrators, Roles, and Scheduled Publishing API (Implemented)

### 30.1 Roles

Every admin route requires a signed-in administrator. Owner-only routes additionally require `req.admin.role === 'OWNER'`; an editor session receives `403 forbidden`. Login and session responses include the role.

| Role | Scope |
|---|---|
| `OWNER` | Everything, plus administrators, site settings, sessions, health, analytics, and the activity log |
| `EDITOR` | Content, media, inbox, bulk actions, trash, revisions, scheduling, and the overview |

### 30.2 Administrator accounts (owner only)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/admin/administrators` | List accounts without password hashes |
| `POST` | `/api/admin/administrators` | Create an owner or editor account |
| `PATCH` | `/api/admin/administrators/:id` | Change name, role, or active status |
| `POST` | `/api/admin/administrators/:id/password` | Reset a password and revoke that account’s sessions |

- Create body: `{ name, email, password, role }`; `role` defaults to `EDITOR`, and passwords require at least 12 characters. Duplicate emails return `409 conflict`.
- Update body accepts any of `name`, `role`, `isActive` and requires at least one. Demoting or deactivating the last active owner returns `409`, as does deactivating your own account.
- Deactivation and password resets delete that account’s `session` rows immediately. Every change writes `ADMIN_CREATED`, `ADMIN_UPDATED`, or `ADMIN_PASSWORD_RESET`.
- Responses never include `passwordHash`.

### 30.3 Scheduled publishing

| Method | Endpoint | Purpose |
|---|---|---|
| `PATCH` | `/api/admin/schedule/:type/:id` | Set or clear `publishAt` |
| `GET` | `/api/admin/scheduling` | Unpublished, live records with their schedule |

- Body: `{ "publishAt": "2026-11-01T09:00:00.000Z" }`, or `null` to cancel. `type` is one of the five content types.
- Throws `400 validation_error` for past or malformed times, `409` for published or trashed records, and `404` for unknown ones.
- Writes `<ENTITY>_SCHEDULED` or `<ENTITY>_SCHEDULE_CANCELLED` and a revision snapshot.
- The API process runs a scheduler every 30 seconds. `publishDueContent` claims each due row with a conditional update, so concurrent instances publish a record once, clear `publishAt`, and write a single `scheduled` audit event and revision.
- `GET /api/admin/scheduling` returns `{ items: [{ type, id, title, subtitle, publishAt }] }`; each collection contributes at most 50 rows.

## 31. Project Cover, Gallery, and Profile Portrait Media (Implemented)

Projects and the profile can now point at an image in the media library instead of an external URL. The database stores a foreign key; the API exposes a stable public image URL, so public clients never handle asset references.

### 31.1 Fields

- `Project.coverMediaId` — optional reference to `MediaAsset`. `imageUrl` stays for externally hosted images. Sending both in one request returns `400 validation_error` with `details[0].path === 'coverMediaId'`.
- `ProjectScreenshot.mediaId` — optional reference for one gallery row. `ProjectScreenshot.url` remains the external alternative, and each row accepts exactly one of the two; sending both (or neither) returns `400 validation_error` with `details[0].path === 'screenshots.<index>.mediaId'`.
- `Profile.portraitMediaId` — the equivalent for the singleton profile; `portraitUrl` remains the external alternative. Sending both returns `400 validation_error` with `details[0].path === 'portraitUrl'`.
- Saving one source clears the other, so a record always has at most one portrait or cover source. A `portraitAlt` (or `imageAlt`) is still required, and is never inferred by the server.
- An id that no longer exists returns `400 invalid_media` with the offending field in `details`.

### 31.2 Public endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/media/project-cover/:id` | Streams the cover of a published project |
| `GET` | `/api/media/project-screenshot/:id` | Streams a gallery image of a published project |
| `GET` | `/api/media/profile-portrait/:id` | Streams the profile portrait |

All three return `404` when the asset is not attached to public content: a draft project's cover or gallery stays private until the project is published. Bytes are immutable per id, so responses carry `Cache-Control: public, max-age=31536000, immutable`.

Public project and profile responses are unchanged in shape: `GET /api/projects`, `GET /api/projects/:slug`, and `GET /api/profile` return the resolved `/api/media/...` URL in `imageUrl`, `screenshots[].url`, or `portraitUrl`. `coverMediaId`, `screenshots[].mediaId`, and `portraitMediaId` never appear in a public response.

### 31.3 Deletion rules

`DELETE /api/admin/media/:id` returns `409` while the asset is referenced by the homepage draft or published portrait, any project cover, any gallery screenshot (including drafts and trashed records), or the profile. The media listing's `referenced` flag uses the same rule. Replacing a project's gallery deletes the old screenshot rows, which releases their assets.

### 31.4 Revision snapshots

Project snapshots include `coverMediaId`, so restoring an earlier revision restores the cover reference as well as the external URL state. The profile is not revisioned.

## 32. Related Documentation

- `README.md` — Project setup and overview.
- `docs/01-project-overview.md` — Product scope.
- `docs/02-portfolio-requirements.md` — Public portfolio requirements.
- `docs/05-system-architecture.md` — Overall architecture.
- `docs/06-frontend-architecture.md` — Frontend structure and API integration.
- `docs/08-database-schema.md` — Database schema and relationships.
- `docs/09-admin-dashboard.md` — Admin workflows and content management.
- `docs/10-security.md` — Security controls.
- `docs/11-testing-and-qa.md` — Testing strategy.
- `docs/12-deployment-and-maintenance.md` — Deployment and operations.
- `docs/13-admin-advanced-features.md` — Advanced admin functionality.
- `docs/14-dynamic-content-and-media-management.md` — Dynamic publishing and media management.
