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

### 13.5 Sessions

Examples:

- `GET /api/v1/admin/sessions`
- `DELETE /api/v1/admin/sessions/:id`

Session-management endpoints must only return safe metadata and must never disclose raw session tokens.

### 13.6 Analytics and system health

Analytics and operational status endpoints should only be implemented when the underlying metrics or monitoring integrations exist.

System-health responses must not disclose secrets, internal network details, or unnecessary infrastructure information to unauthorized users.

Backup and restore operations must not be exposed as unrestricted public API actions.

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

## 26. Related Documentation

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
