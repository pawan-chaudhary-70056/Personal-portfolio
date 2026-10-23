# Admin Dashboard — Advanced Features

## 1. Purpose

This document defines the advanced capabilities of the Service Admin Dashboard for the Luxury Personal Portfolio project.

The goal is to provide a secure, maintainable administration system that supports efficient content management, controlled publishing, recoverability, accountability, and operational visibility.

This document extends:

- `docs/01-project-overview.md`
- `docs/07-backend-api.md`
- `docs/08-database-schema.md`
- `docs/09-admin-dashboard.md`
- `docs/10-security.md`
- `docs/11-testing-and-qa.md`
- `docs/12-deployment-and-maintenance.md`

**Implementation rule:** These are feature specifications, not confirmation that the features already exist. A feature must not be presented as implemented until its frontend, backend, database requirements, security controls, and tests are complete.

## 2. Design Principles

All advanced features must follow these principles:

1. Security before convenience.
2. Server-side authorization for every protected operation.
3. Clear confirmation for destructive or high-impact actions.
4. Recoverability where practical.
5. Auditability for security-sensitive and administrative changes.
6. Accessible interfaces with keyboard support.
7. Consistent loading, empty, success, and error states.
8. No exposure of unpublished content through public APIs.
9. No misleading analytics, health indicators, or backup status.
10. Optional features must remain disabled or hidden until properly implemented.

## 3. Feature Classification

### 3.1 Core Administrative Features

- Search, filtering, sorting, and pagination.
- Draft, preview, publish, and unpublish workflows.
- Bulk actions with server-side validation.
- Content revision history.
- Soft deletion and recovery.
- Administrative audit logs.
- Session visibility and session revocation.

### 3.2 Optional Operational Features

- Portfolio traffic analytics.
- Application health overview.
- Database and backup status.
- Advanced content comparison.
- Scheduled publishing.
- Multiple administrator roles.

Optional features should be implemented only when their infrastructure, data model, security controls, and maintenance requirements are defined.

## 4. Search, Filtering, and Pagination

### 4.1 Requirements

Administrative content lists should support appropriate combinations of:

- Search by title, name, or other relevant text.
- Filter by publication status.
- Filter by category or content type.
- Sort by creation date, update date, title, or display order.
- Paginate large result sets.
- Clear all active filters.
- Display the total count when reliably available.

The interface must preserve filters when navigating between pages where practical.

### 4.2 Backend Behaviour

The backend must:

- Validate query parameters.
- Apply authorization before returning records.
- Use parameterized database queries through the approved ORM.
- Restrict sorting to an allowlist of fields.
- Apply a reasonable maximum page size.
- Avoid returning unnecessary fields.
- Return consistent pagination metadata.

Example request:

`GET /api/v1/admin/projects?page=1&limit=20&status=published&search=security`

Example response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

This is an illustrative response contract. The implementation must follow the API conventions established in `docs/07-backend-api.md`.

### 4.3 Acceptance Criteria

- Invalid pagination values are rejected or safely normalized.
- Unsupported sort fields cannot be used.
- Search and filters work together correctly.
- Administrative results never include records the current administrator is not authorized to access.

## 5. Bulk Actions

Bulk actions reduce repetitive work when managing multiple content records.

### 5.1 Supported Actions

Depending on content type and implementation, bulk actions may include:

- Publish eligible drafts.
- Unpublish published content.
- Move eligible content to trash.
- Restore trashed content.
- Assign a category.
- Remove a category assignment.
- Delete permanently when explicitly supported.

Bulk operations must not bypass individual record validation or publication rules.

Implemented scope: the content lists support bulk publish, unpublish, and move-to-trash, while the trash page supports bulk restore and bulk permanent deletion across all five content types. Every selection is validated server-side in one transaction.

### 5.2 Interaction Requirements

1. The administrator selects records using checkboxes.
2. The interface displays the number of selected records.
3. The administrator chooses an action.
4. Destructive or high-impact actions require confirmation.
5. The backend validates each requested record and action.
6. The interface reports successful, skipped, and failed operations.

For partial success, report results clearly instead of claiming the entire operation succeeded.

### 5.3 API Contract

A possible endpoint is:

`POST /api/v1/admin/projects/bulk`

Example request:

```json
{
  "action": "unpublish",
  "ids": [
    "project-id-1",
    "project-id-2"
  ]
}
```

The backend must validate the action against an explicit allowlist, verify each record, enforce authorization, and perform appropriate transactions.

The response should identify successful and unsuccessful records without disclosing sensitive internal information.

### 5.4 Safety Rules

- Enforce a configurable maximum number of records per request.
- Reject duplicate or malformed identifiers where appropriate.
- Prevent unauthorized records from being modified.
- Apply audit logging to sensitive changes.
- Use transactions where atomicity is required.
- Do not silently convert permanent deletion into a different action.

## 6. Content Revision History

### 6.1 Purpose

Revision history allows administrators to review previous content states and recover from accidental edits.

### 6.2 Eligible Content

Revision history may cover:

- Profile information.
- Projects.
- Skills and categories.
- Work experience.
- Education.
- Certifications.
- Homepage content and supported site settings.

The exact list must match the actual database schema.

### 6.3 Revision Data

A revision record may include:

- Revision identifier.
- Content type.
- Content record identifier.
- Version number.
- Snapshot of the supported content fields.
- Administrator responsible for the change.
- Creation timestamp.
- Optional change summary.

Do not include passwords, session secrets, authentication tokens, or other sensitive credentials in revision snapshots.

### 6.4 Revision Workflow

1. A meaningful content update is submitted.
2. The backend validates the new data.
3. The previous state is captured when revision tracking is enabled.
4. The content update and revision creation are committed consistently.
5. The administrator can view available revisions.
6. The administrator selects a revision to inspect.
7. A restore operation creates a new current state based on the selected revision.

Restoring a revision should not erase later history. The restore itself should be recorded as a new change.

### 6.5 Comparison Interface

Where practical, provide a readable comparison showing:

- Previous value.
- Current value.
- Added fields.
- Removed fields.
- Changed fields.
- Revision author and timestamp.

Avoid rendering stored content as trusted HTML.

### 6.6 API Contract

Possible endpoints:

- `GET /api/v1/admin/projects/:id/revisions`
- `GET /api/v1/admin/projects/:id/revisions/:revisionId`
- `POST /api/v1/admin/projects/:id/revisions/:revisionId/restore`

These are proposed routes and must be aligned with the actual API design.

### 6.7 Acceptance Criteria

- Revisions are available only to authorized administrators.
- Restoring a revision validates the restored data.
- Restoration does not silently publish content.
- Existing revision history remains available after restoration.
- Retention limits and storage costs are documented.

## 7. Trash and Recovery

### 7.1 Soft Deletion

Where recovery is required, records should be moved to a trashed state rather than immediately removed from the database.

A possible model uses:

- `deletedAt`
- `deletedBy`

The actual schema may use a different design, but it must support consistent recovery and auditability.

### 7.2 Behaviour

When content is moved to trash:

1. The backend verifies authorization.
2. The record is marked as deleted.
3. The deletion event is audited.
4. The record is excluded from normal administrative lists.
5. The record is excluded from all public content queries.
6. Associated media is retained until safe cleanup rules permit removal.

### 7.3 Recovery

Restoring content must:

- Confirm that the record still exists.
- Validate category and relationship integrity.
- Check for conflicting unique values.
- Record the recovery event.
- Return the record to a non-trashed state.

Restoring a record must not automatically publish it unless that behaviour is explicitly designed and authorized.

### 7.4 Permanent Deletion

Permanent deletion must be a separate, explicit operation.

Before deleting a record, the backend must account for:

- Related database records.
- Referenced media.
- Revision history.
- Audit retention requirements.
- Foreign-key constraints.
- Legal or privacy-related retention requirements.

Audit records that are required for accountability must not be deleted merely because the related content is permanently removed.

### 7.5 Retention Policy

Define a documented retention period for trashed content. Expired records may be purged through a controlled maintenance job.

The purge job must be idempotent, logged, monitored, and protected from unauthorized execution.

## 8. Administrative Audit Logs

### 8.1 Purpose

Audit logs provide a traceable record of significant administrative and security events.

They are distinct from ordinary application debugging logs.

### 8.2 Events to Record

Relevant events include:

- Successful and failed administrative login attempts.
- Logout and session revocation.
- Content creation and updates.
- Publish and unpublish operations.
- Trash, recovery, and permanent deletion.
- Bulk actions.
- Site settings changes.
- Media upload and deletion.
- Administrator account or role changes.
- Sensitive security configuration changes.

Avoid logging every harmless interface interaction.

### 8.3 Audit Event Fields

A typical event may contain:

- Event identifier.
- Actor identifier, when known.
- Action.
- Target entity type.
- Target entity identifier.
- Timestamp.
- Outcome.
- Request or correlation identifier.
- Limited contextual metadata.
- Sanitized network metadata when justified.

Do not store passwords, authentication tokens, session cookie values, or complete sensitive form submissions.

### 8.4 Integrity and Access

- Audit records must be written by trusted backend code.
- Administrative users must not be able to modify audit history through ordinary CRUD endpoints.
- Audit records should be append-only at the application level.
- Database permissions should restrict unauthorized modification.
- Access to audit records must be authorized and logged where appropriate.
- Retention and export policies must be documented.

Application-level append-only behaviour does not automatically guarantee tamper-proof storage against a database administrator or compromised server. Stronger integrity guarantees require additional controls.

### 8.5 Audit Interface

The audit screen should support:

- Search by action or target.
- Filtering by date range, actor, event type, and outcome.
- Pagination.
- Event detail inspection.
- Restricted export, if implemented.

The interface must escape untrusted values and avoid exposing secrets.

## 9. Session Management

### 9.1 Purpose

Session management gives administrators visibility into their authenticated sessions and allows them to revoke sessions when necessary.

### 9.2 Session Information

Display only necessary metadata, such as:

- Session creation time.
- Last activity time, if tracked.
- Expiration time.
- Current-session indicator.
- Sanitized device or user-agent description.
- Approximate network information only where justified.

Do not display raw session identifiers, session cookies, or session secrets.

### 9.3 Supported Actions

Depending on the authentication implementation:

- View the current session.
- View other active sessions for the same administrator.
- Revoke an individual session.
- Revoke all other sessions.
- Invalidate sessions after password or privilege changes.

### 9.4 Security Requirements

- Session ownership must be checked on the server.
- Session revocation must invalidate the corresponding server-side session.
- Sensitive actions require appropriate CSRF protection.
- Expired or revoked sessions must no longer authorize requests.
- Session records must follow the authentication architecture in `docs/10-security.md`.

### 9.5 Acceptance Criteria

- Revoked sessions cannot access protected endpoints.
- One administrator cannot revoke another administrator's sessions without explicit authorization.
- Session metadata contains no reusable authentication secrets.
- Session expiration is enforced server-side.

## 10. Analytics

Analytics are optional and should be introduced only when reliable data collection, privacy controls, and operational requirements are established.

### 10.1 Potential Metrics

- Page views.
- Project detail views.
- Contact form submissions.
- Popular portfolio sections.
- Traffic trends over time.
- Referrer categories where appropriate.

Do not invent metrics or display placeholder values as real statistics.

### 10.2 Data Collection

Before implementation, decide whether to use:

- A privacy-conscious analytics provider.
- First-party aggregate event collection.
- Existing hosting or reverse-proxy metrics.

Minimize personal data collection and establish appropriate retention rules. Avoid storing full IP addresses or unnecessary identifying information without a documented need and suitable legal basis.

### 10.3 Display Requirements

- Show the reporting period.
- Identify the source of the data.
- Display empty states when data is unavailable.
- Handle time zones consistently.
- Distinguish estimates from verified counts.
- Restrict analytics access to authorized administrators.

Analytics must not expose private contact message contents.

## 11. Application Health and Backup Status

### 11.1 Health Overview

If implemented, the administrative health page may display:

- Application availability.
- Database connectivity.
- Cache connectivity, if used.
- Background job status, if used.
- Last successful backup timestamp, when verified.
- Recent deployment version.
- Sanitized error summaries.

A dashboard status is informational; it must not replace external monitoring or operational alerting.

### 11.2 Health Endpoint Design

Use separate health checks where appropriate:

- Liveness: whether the process is running.
- Readiness: whether the application can safely serve requests.
- Detailed diagnostics: restricted operational information.

Public health endpoints must not disclose database credentials, environment variables, internal hostnames, stack traces, or detailed infrastructure topology.

### 11.3 Backup Status

Only report a backup as successful when a trusted backup process confirms completion.

A backup status record may include:

- Backup identifier.
- Completion timestamp.
- Outcome.
- Backup type.
- Retention expiration.
- Verification status.

Do not expose backup files or storage credentials through the dashboard.

Backup creation, encryption, retention, restoration, and disaster recovery are defined in `docs/12-deployment-and-maintenance.md`.

## 12. Scheduled Publishing

Scheduled publishing is optional.

If implemented, content may include:

- `publishAt`
- Current publication status.
- Scheduled publication state.

The actual data model must distinguish a scheduled item from an already published item.

### 12.1 Processing Rules

- Store schedule timestamps consistently, preferably in UTC.
- Display them in the administrator's configured or selected time zone.
- Validate scheduled dates on the server.
- Use a reliable background job or scheduler.
- Make processing idempotent.
- Retry transient failures safely.
- Log publishing outcomes.
- Prevent deleted, invalid, or unauthorized content from being published.

### 12.2 Failure Handling

If a scheduled publishing job fails, the system must retain a recoverable state and make the failure visible to authorized administrators.

Do not rely solely on a browser tab being open to trigger scheduled publishing.

## 13. Multiple Administrators and Roles (Implemented)

The dashboard implements two roles, stored on the `Admin` model and read from the database on every request; the client never supplies a role.

- **Owner:** manages administrators and security-sensitive settings, including site settings, sessions, health, analytics, and the activity log.
- **Editor:** manages portfolio content, media, the inbox, bulk actions, the trash, revisions, and scheduling.

Owner-only endpoints are mounted behind `requireOwner`. Editors receive `403 forbidden`, and the dashboard hides those links and redirects their routes. Login and session responses include `role` so the interface can adapt, but hiding a control is never treated as authorization. At least one active owner always remains: demoting or deactivating the last one returns `409`, as does deactivating your own account. Account changes, role changes, and password resets are audited and revoke the affected sessions where required.

### 13.1 Authorization Requirements

- Enforce permissions on every protected backend operation.
- Apply least privilege.
- Deny access by default.
- Do not trust role information supplied by the browser.
- Prevent privilege escalation through manipulated requests.
- Audit role and account changes.
- Require stronger verification for especially sensitive actions when appropriate.

Hiding a button in the frontend is not authorization.

## 14. Media and Content Integrity

Advanced features must respect the media-management rules in `docs/14-dynamic-content-and-media-management.md`.

Required safeguards include:

- Validate media ownership and references.
- Prevent public access to restricted or unpublished content.
- Avoid deleting assets that are still referenced.
- Validate content relationships before restoration or publishing.
- Handle missing media gracefully.
- Keep alternative text editable.
- Prevent unsafe upload types and oversized files.
- Record sensitive media changes in audit logs.

## 15. Frontend Architecture

Advanced administrative features should reuse shared components rather than introducing inconsistent screens.

Recommended reusable components include:

- `DataTable`
- `SearchFilters`
- `Pagination`
- `BulkActionToolbar`
- `ConfirmDialog`
- `RevisionHistory`
- `RevisionDiff`
- `TrashView`
- `AuditLogTable`
- `SessionList`
- `StatusBadge`
- `HealthStatusPanel`
- `EmptyState`
- `ErrorState`
- `LoadingState`

Suggested organization:

```text
src/
├── api/
├── components/
│   ├── admin/
│   │   ├── DataTable.tsx
│   │   ├── BulkActionToolbar.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── StatusBadge.tsx
├── hooks/
├── pages/
│   └── admin/
│       ├── AuditLogsPage.tsx
│       ├── RevisionsPage.tsx
│       ├── TrashPage.tsx
│       ├── SessionsPage.tsx
│       └── SystemHealthPage.tsx
├── routes/
├── templates/
├── utils/
└── validators/
```

This is a proposed organization. Preserve the project's established directory structure and naming conventions.

## 16. Backend and Database Requirements

Advanced features may require additional database models or fields, including:

- Content revision records.
- Soft-deletion metadata.
- Audit event records.
- Session metadata.
- Scheduled publishing timestamps.
- Backup execution metadata.
- Aggregated analytics records.

Do not add every optional model in advance without a concrete requirement.

Before each schema change:

1. Update the documented schema.
2. Implement the Prisma model or migration.
3. Review indexes and foreign-key behaviour.
4. Define data retention and deletion rules.
5. Add backend validation and authorization.
6. Test migration and rollback/recovery procedures.
7. Update API documentation.

Use transactions for operations that must keep content, revision records, and audit events consistent. Where logging uses an external system, define how partial failures are handled.

## 17. Security Requirements

Every advanced feature must follow `docs/10-security.md`.

Minimum controls:

- Authentication on protected routes.
- Server-side authorization.
- Input validation with the project's approved validation library.
- CSRF protection where cookie-based sessions are used.
- Output encoding and safe rendering.
- Rate limiting for sensitive endpoints.
- Restricted administrative exports.
- Secret redaction in logs.
- Safe error responses.
- Secure database access.
- Dependency and migration review.
- Audit coverage for high-impact actions.

Destructive actions should use explicit confirmation. Re-authentication or stronger verification should be considered for permanent deletion, account privilege changes, and other high-impact operations.

## 18. Testing Requirements

### 18.1 Unit Tests

Test:

- Authorization and permission rules.
- Revision snapshot creation.
- Revision restoration.
- Soft-delete and recovery logic.
- Bulk action validation.
- Scheduled publishing decisions.
- Retention and purge eligibility.
- Audit event sanitization.

### 18.2 Integration Tests

Test:

- Database transaction behaviour.
- Foreign-key constraints.
- Revision and content consistency.
- Session revocation.
- Audit event creation.
- Pagination, filtering, and sorting.
- Unauthorized and malformed requests.
- Partial failures in bulk operations.

### 18.3 End-to-End Tests

Verify that an authorized administrator can:

1. Search and filter content.
2. Perform a permitted bulk action.
3. View a revision.
4. Restore a revision without unintentionally publishing it.
5. Move content to trash and recover it.
6. Review permitted audit events.
7. Revoke an eligible session.
8. View system status when that feature is implemented.

Optional features must have tests before they are exposed in production.

### 18.4 Security Tests

Include:

- Unauthenticated access attempts.
- Unauthorized cross-user access.
- Privilege escalation attempts.
- CSRF checks where applicable.
- Injection and stored-XSS checks.
- Bulk-action abuse.
- Sensitive-data exposure.
- Attempted modification of audit history.
- Attempts to access unpublished or trashed content publicly.

## 19. Implementation Phases

### Phase 1 — Essential Administration

- Search, filters, sorting, and pagination.
- Safe bulk actions.
- Draft/publish workflow.
- Consistent confirmation and error states.

### Phase 2 — Recoverability

- Content revision history.
- Revision restoration.
- Trash and recovery.
- Retention and permanent-deletion rules.

### Phase 3 — Accountability and Sessions

- Administrative audit logs.
- Session listing and revocation.
- Security-event review.

### Phase 4 — Optional Operational Features

- Application health overview.
- Verified backup status.
- Analytics.
- Scheduled publishing.
- Multiple administrator roles.

Prioritize each phase according to actual requirements, risk, and available implementation time.

## 20. Definition of Done

An advanced feature is complete only when:

- [ ] Requirements and behaviour are documented.
- [ ] The frontend interface is implemented.
- [ ] Backend endpoints enforce authentication and authorization.
- [ ] Database changes and migrations are reviewed.
- [ ] Validation and error handling are implemented.
- [ ] Sensitive actions are audited where required.
- [ ] Public content rules remain correct.
- [ ] Unit, integration, and relevant end-to-end tests pass.
- [ ] Accessibility and responsive behaviour are checked.
- [ ] Documentation matches actual implementation.
- [ ] Operational requirements and retention policies are defined.
- [ ] No unimplemented feature is presented as available.

## 21. Implemented: Bulk Actions, Trash, and Revision History

The core administrative features from §3.1 are now complete for projects, skills, experience, education, and certifications.

### 21.1 Bulk actions (§5)

- Endpoint: `POST /api/admin/bulk/:type` with `{ action, ids }`, 1–50 ids, action `publish` / `unpublish` / `delete`.
- The transaction is atomic: every id must exist and be live, otherwise nothing changes. Results are all-or-nothing rather than partial success.
- Each record is authorized by the admin session, validated, audited individually with `metadata.bulk = true`, and snapshotted as a revision.
- UI: select-all and per-row checkboxes plus a toolbar with the selected count; deletion is confirmed.

### 21.2 Soft deletion and recovery (§7)

- `deletedAt` on the five content models; all admin and public read paths exclude trashed rows.
- Restore keeps the original values, visibility, and gallery. Permanent deletion is available only from the trash and is confirmed.
- Retention: no automatic purge job. Trashed records live until an administrator deletes them permanently, which keeps recovery predictable at the cost of manual housekeeping.
- Uniqueness (project slug, skill name per category) stays reserved while trashed, which prevents a restore from silently overwriting a newer record. The API reports the conflict and the trash page explains it.

### 21.3 Revision history (§6)

- `ContentRevision` stores a JSON snapshot per change with the action, editor, and timestamp; history is append-only.
- Listing filters by entity type and entity id, with pagination.
- Restore re-applies the snapshot through the same service update used by the admin forms, so validation, publication rules, audit events, and a new revision all apply.
- The interface shows the raw snapshot rather than a field-by-field diff; a structured comparison remains optional per §3.2.

### 21.4 Still optional

Traffic analytics, application health and backup status, scheduled publishing, multiple administrator roles, and structured revision comparison remain unimplemented and are not presented as available in the dashboard.

## 22. Final Principle

The Admin Dashboard must remain secure, predictable, and maintainable as the portfolio grows.

Advanced functionality should be added only when its value is clear and its security, data model, operational behaviour, and testing requirements can be supported.

**The actual implementation, database schema, API contracts, and verified tests are the source of truth.** Documentation must be updated whenever those implementation decisions change.
