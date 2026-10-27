# Project Overview — Luxury Personal Portfolio

## 1. Introduction

The Luxury Personal Portfolio is a modern, professional, secure, and dynamically managed personal portfolio website designed to showcase professional experience, technical skills, projects, education, certifications, achievements, and contact information through a premium digital experience.

The system consists of two connected applications:

1. **Public Portfolio Website** — presents the portfolio owner's professional identity, background, skills, projects, and achievements.
2. **Secure Admin Dashboard** — provides centralized control over portfolio content, media, website appearance, publishing, SEO, contact messages, analytics, security, and system maintenance.

The portfolio owner must be able to manage website content through the admin dashboard without manually editing source code or directly modifying database records.

All content-management operations go through the backend API, database, and media storage where applicable. Published changes appear on the public portfolio immediately: public content responses are not cached, and uploaded media uses immutable URLs.

The project combines a luxury-inspired visual identity, meaningful animations, responsive design, maintainable software architecture, and security-focused engineering practices.

## 2. Project Vision

To build a distinctive, premium personal portfolio with a fully integrated content-management system that allows the owner to control the website from one centralized dashboard.

The website should feel elegant, intentional, professional, and trustworthy rather than resembling a generic portfolio template.

The administrative experience should be powerful but easy to navigate, allowing the owner to manage the entire portfolio without unnecessary technical knowledge.

## 3. Project Goals

### 3.1 Primary Goals

- Establish a strong and professional online presence.
- Present professional experience, technical skills, education, certifications, projects, and achievements clearly.
- Create a luxury-inspired interface using typography, whitespace, contrast, imagery, and consistent visual hierarchy.
- Introduce subtle, purposeful animations without distracting visitors.
- Build a secure, feature-rich administrative dashboard.
- Implement complete CRUD functionality for all supported content modules.
- Synchronize published dashboard content with the public website.
- Support image and document management through a secure media-management workflow.
- Provide website settings, homepage controls, SEO management, and content publishing.
- Implement reliable backend APIs and structured database management.
- Ensure accessibility, responsiveness, performance, maintainability, and security.
- Demonstrate practical frontend, backend, database, testing, and security engineering skills.

### 3.2 Secondary Goals

- Provide a scalable foundation for future features.
- Support content drafts, previews, publishing, revision history, and recovery.
- Provide analytics and useful administrative insights.
- Manage contact messages through an organized inbox.
- Support search, filtering, sorting, pagination, and bulk actions.
- Maintain a record of important administrative activities.
- Support automated testing, security checks, deployment, backups, and maintenance.

## 4. Project Scope

The system is divided into the public portfolio, the private admin dashboard, the backend and database, and supporting operational infrastructure.

### 4.1 Public Portfolio Website

The public website must be accessible without requiring visitors to create an account.

Its scope includes:

- **Home:** Premium introduction, professional headline, profile image, summary, featured projects, selected skills, and primary calls to action.
- **About:** Professional background, biography, interests relevant to work, and career direction.
- **Skills:** Categorized technical and professional skills, presented on the About page.
- **Projects:** Project descriptions, technologies, categories, screenshots, repository links, live-demo links, and featured-project presentation. A project cover and every gallery screenshot come from the media library or an external URL.
- **Experience:** Employment history, internships, responsibilities, achievements, dates, and relevant links where applicable.
- **Education:** Academic qualifications, institutions, study periods, and supporting details, presented on the About page.
- **Certifications:** Certification title, issuing organization, issue date, credential identifier, and verification link. Certificate images and documents are not supported.
- **Contact:** Public contact information and a validated contact form.
- **Navigation and footer:** Configurable navigation links, social links, and footer content.
- **Responsive navigation:** Consistent usability across desktop, tablet, and mobile devices.
- **Animations:** Subtle entrance effects, content reveals, hover interactions, and meaningful feedback.
- **SEO and metadata:** Page titles, descriptions, canonical URLs where appropriate, social-sharing metadata, and semantic structure.
- **Content visibility:** Only content permitted for public display should be exposed through public APIs and pages.

The homepage must not depend on hardcoded portfolio content when the relevant information is intended to be managed through the dashboard.

The implemented navigation is Home, About, Projects, Experience, and Contact. Skills, education, and certifications share the About page rather than each taking a top-level route, which keeps the site compact; the project detail route is `/projects/:slug` and unknown routes render the not-found page.

### 4.2 Admin Dashboard

The admin dashboard is a private application available only to authenticated and authorized administrators.

It must provide a centralized interface with a persistent sidebar, organized modules, reusable components, clear navigation, responsive layouts, and consistent success, error, loading, and empty states.

#### 4.2.1 Dashboard Overview and Analytics

The dashboard provides:

- Project counts by status (total, draft, published, archived, featured).
- Total and published counts for skills, experience, education, and certifications.
- Recent administrative activity.
- Page-view analytics: daily aggregate counts per public path for a selectable range.
- A read-only health panel for the owner.

Analytics are recorded from real requests and stored as daily aggregates with no visitor identifier, IP address, cookie, or referrer. There is no dedicated project-engagement or conversion analysis, and no metric is estimated or fabricated.

#### 4.2.2 Personal Profile Management

The administrator can:

- Initialize and edit the single profile record.
- Update name, professional title, contact information, and social links.
- Create, edit, and update the professional biography and headline.
- Choose the profile portrait from the media library or link an external image, and edit its description.
- Preview the profile card while editing.
- Validate required fields and receive clear feedback.

The profile is a singleton created on the first successful save, and saves are published immediately — there is no profile draft. Uploaded portraits are served from an immutable public URL.

#### 4.2.3 Work Experience Management

The administrator can:

- Add new experience records.
- View existing experience records.
- Edit and update any supported field.
- Delete or move records to trash according to the deletion policy.
- Manage employer, role, location, employment type, dates, and the description field.
- Indicate whether a role is current.
- Reorder records for public presentation.
- Control public visibility and scheduled publication.

#### 4.2.4 Education Management

The administrator can:

- Add, view, edit, update, and delete education records.
- Manage institution, qualification, field of study, dates, and description.
- Reorder education entries.
- Control public visibility and scheduled publication.

#### 4.2.5 Project Management

The administrator can:

- Create, view, edit, update, and delete projects.
- Manage title, slug, description, project details, technologies, and categories.
- Choose a cover from the media library or link an external image, and manage gallery screenshots in display order. Each screenshot can be uploaded, picked from the library, or linked as a validated external URL.
- Manage repository and live-demo links.
- Set featured-project status.
- Configure display order and publication status.
- Review the saved project on its public URL; there is no separate project draft preview.
- Search, filter, sort, and paginate project records.
- Apply supported bulk operations to selected projects.

A project must not appear in public project listings merely because a draft record exists.

#### 4.2.6 Skills and Skill Categories

The administrator can:

- Create, view, edit, update, and delete skills.
- Create, view, edit, update, and delete skill categories.
- Assign skills to appropriate categories.
- Update skill names, descriptions, and display order.
- Prevent invalid category references.
- Control which skills and categories are publicly displayed, and schedule a publication time.

#### 4.2.7 Project Categories

The administrator can:

- Create, rename, reorder, and delete project categories.
- Assign and reassign projects to categories through the project form.
- Prevent duplicate category names and derive unique slugs.
- Reject deletion while any project still uses the category, with a clear message.

Categories are managed as a compact list rather than a searchable table, because the collection is small.

#### 4.2.8 Certification Management

The administrator can:

- Create, view, edit, update, and delete certifications.
- Manage certificate title, issuing organization, dates, credential ID, and verification URL.
- Set display order and publication status.
- Validate external links. Certificate images and documents are not supported; the record stores credential text and a verification URL only.

#### 4.2.9 Media Library

The dashboard provides centralized management for uploaded images (JPEG, PNG, and WebP).

- Uploading, listing, searching, viewing, and deleting images.
- Associating images with the profile portrait and project covers. Certifications do not reference media yet.
- Editing alternative text.
- Validating the actual bytes, size, and dimensions on the server, with SVG rejected.
- Previewing images in the library and in the picker before attaching them to content.
- Flagging assets still referenced by content and refusing to delete them.
- Keeping failed uploads from affecting existing content.

Binary data is stored on disk outside PostgreSQL; the database stores metadata and references only. The storage interface is provider-neutral, but only local disk is implemented.

#### 4.2.10 Homepage and Appearance Controls

The administrator can manage website presentation through:

- Homepage section visibility and ordering.
- Featured-project selection, limited to published projects and a fixed maximum.
- The hero portrait, its alt text, visibility, and bounded effect settings (tilt, animation, floating, enabled).
- A preview of the draft hero and layout, using the same component the public site renders.
- Publishing the approved draft, with an indicator while unpublished changes exist.

Profile headline and biography are edited on the Profile page, and site-wide title and social metadata on the Settings page. Navigation and footer content are defined in the frontend and cannot be edited from the dashboard. There are no arbitrary theme or appearance presets; effect values are bounded to the documented safe ranges.

#### 4.2.11 Draft, Publishing, and Preview Workflow

Every content module has a clear publication path.

- Projects carry `DRAFT`, `PUBLISHED`, and `ARCHIVED` statuses; skills, experience, education, and certifications use a published flag. New records start private.
- The homepage keeps a draft and a published snapshot, published atomically; the draft is previewed with the real hero component before publishing.
- Projects, skills, experience, education, and certifications can be scheduled with a future `publishAt`; a worker publishes due records and clears the schedule.
- Publication timestamps and status badges are shown in the dashboard, and bulk publish/unpublish acts on selections.
- Only published, non-deleted records reach public endpoints.

The dashboard distinguishes saved drafts from published content, and the homepage reports when the draft differs from the published state.

#### 4.2.12 Contact Inbox

The administrator can:

- View submitted contact messages.
- Open individual message details.
- Mark messages as read or unread.
- Archive messages.
- Search, filter, and paginate messages, and export the filtered inbox as CSV.
- Delete messages after confirmation.
- View relevant timestamps and message status.

Contact messages must remain private and accessible only to authorized administrators. Spam classification and email notifications are not implemented.

#### 4.2.13 Website Settings and SEO

Implemented settings:

- Site title and default description.
- Canonical URL and social-sharing image URL.

Public pages derive their titles, descriptions, and Open Graph metadata from published content plus these defaults; the profile supplies public contact details and social links. The canonical URL setting currently feeds the homepage's Open Graph URL only — no `<link rel="canonical">` is emitted. Favicon upload, branding assets, navigation/footer editing, redirects, and a dedicated SEO preview screen are not implemented. Settings are validated and applied immediately.

#### 4.2.14 Search, Filtering, and Bulk Actions

The dashboard should support efficient content discovery and management through:

- Module-specific search. Cross-module global search is not implemented.
- Filtering by category and publication status (and by day range for analytics).
- Sorting by updated, created, title, or explicit display order, depending on the module.
- Pagination for every collection, including media and the inbox.
- Multi-select operations.
- Bulk publish, unpublish, and move-to-trash actions, with confirmation for destructive operations.

Bulk operations validate each record and report how many succeeded or failed; they act on at most 50 records per request.

#### 4.2.15 Revision History and Trash

The dashboard provides:

- Revision history for projects, skills, experience, education, and certifications.
- Comparison of any two revisions, and a diff against the preceding one.
- Restoration of a revision through the same update path as a normal edit, including audit and a new revision.
- Trash for deleted content, with restore and permanent deletion.
- Audit records for restores, permanent deletions, and scheduled changes.

Trash has no timed retention: records stay until they are restored or permanently deleted. Permanent deletion is visually distinct and the confirmation states that it cannot be undone.

#### 4.2.16 Security and Session Management

Implemented administrative security features:

- Secure login and logout with Argon2id hashing and server-side sessions.
- Two-factor authentication (TOTP with recovery codes), self-service from `/admin/security`.
- Owner-initiated password resets for other administrators, which revoke that account's sessions. There is no self-service password-change screen.
- Session listing with revocation of individual sessions.
- Audit logging of sign-ins, password resets, and content changes.
- Failed-login monitoring on the activity log: rolling-window totals for failed sign-ins, failed verification codes, and successful sign-ins, failures grouped by source address, and the most recent failures with the targeted account and reason.
- Login rate limiting and CSRF protection on state-changing requests.
- Idle session expiry with rolling renewal.

Security controls must be enforced by the backend, not merely by hiding interface elements.

#### 4.2.17 System Health and Maintenance

The dashboard provides read-only operational information:

- Application and API health.
- Database connectivity and media-storage checks.
- Storage usage where measurable.
- Relevant warnings.

Health checks must not expose database credentials, secrets, internal infrastructure details, or sensitive stack traces to unauthorized users.

Backup status is not shown: backups run outside the application, and the health panel states that it cannot confirm one completed.

### 4.3 Backend and Database

The backend provides the application logic, APIs, authentication, validation, authorization, content publishing, media coordination, and database access required by the public website and admin dashboard.

Its scope includes:

- REST API development.
- PostgreSQL integration.
- Prisma-based data access and schema migrations.
- Complete CRUD endpoints for supported modules.
- Server-side input validation.
- Authentication and authorization middleware.
- Session and security controls.
- Centralized error handling.
- Secure contact-form processing.
- Media upload and storage integration.
- Draft, publishing, and public-content filtering.
- Search, filtering, sorting, and pagination.
- Audit-log recording.
- Revision and trash operations where implemented.
- Analytics collection and retrieval where implemented.
- Rate limiting and console-based error logging.
- Environment-based configuration.
- Database constraints and appropriate indexes.
- Health checks and operational monitoring.

All content changes must be persisted through the backend. Frontend-only modifications do not count as completed content-management functionality.

### 4.4 Database and Media Storage

The implemented schema contains:

- `Admin` and `Session` for authentication.
- `Profile` and `SiteSettings` singletons, plus `HomepageSettings` for the hero draft and published state.
- `Experience`, `Education`, and `Certification`.
- `Project`, `ProjectCategory`, and `ProjectScreenshot`; project technologies are a string array on the project.
- `Skill` and `SkillCategory`.
- `MediaAsset` and its references from `Project`, `Profile`, and `HomepageSettings`.
- `ContactMessage`, `AuditEvent`, `ContentRevision`, and `PageViewDaily`.

Soft deletion is a nullable `deletedAt` on the five revisioned content types; permanent deletion removes the row. See `docs/08-database-schema.md` for fields, constraints, and migration history.

### 4.5 Testing and Quality Assurance

Testing and quality assurance are mandatory project activities.

The project will include:

- Unit tests for important application logic.
- Component tests for significant user-interface behavior.
- API and integration tests for backend functionality.
- End-to-end tests for critical user journeys.
- CRUD and database-persistence tests.
- Admin-to-public-content synchronization tests.
- Publishing and visibility tests.
- Media upload and deletion tests.
- Authentication and authorization tests.
- Validation and error-handling tests.
- Revision, trash, and restore tests where implemented.
- Responsive layout checks at 1440px and 390px, and axe WCAG A/AA scans on public and admin pages.
- Static analysis: TypeScript type checking and oxlint.
- Dependency auditing is documented as a release step but is not automated in CI.

## 5. Out of Scope

The initial release will not include the following unless explicitly approved:

- Public user registration.
- Public social-networking features.
- Complex multi-organization administrator roles.
- Paid subscriptions or e-commerce.
- Real-time chat.
- A general-purpose CMS for unrelated websites.
- Native mobile applications.
- Advanced AI-powered content generation.
- Multi-tenant architecture.
- Unnecessary microservices or distributed infrastructure.

Scheduled publishing, visitor analytics, and revision comparison and restoration are implemented as ordinary product features. Multi-factor authentication and automated backup monitoring remain unimplemented and should be added only once their technical dependencies and operational requirements are defined.

## 6. Target Audience

The public portfolio is designed for:

- Recruiters and hiring managers.
- Potential employers and technical interviewers.
- Clients and collaborators.
- Developers and technology professionals.
- Visitors interested in the portfolio owner's professional background and projects.

The administrative dashboard is intended for the portfolio owner and any explicitly authorized administrators.

## 7. Design Philosophy

### 7.1 Visual Identity

| Element | Direction |
|---|---|
| Primary background | Charcoal — `#111110` |
| Secondary background | Ivory — `#F4F0E8` |
| Accent | Champagne gold — `#C6AA78` |
| Headings | Elegant serif typography |
| Body text | Clean, readable sans-serif typography |
| Layout | Minimal, spacious, editorial |
| Imagery | Authentic project screenshots and relevant custom visuals |
| Interaction | Subtle, purposeful, consistent |

### 7.2 Design Principles

- Prioritize readability and clear information hierarchy.
- Use whitespace to create a premium visual experience.
- Keep layouts consistent across all pages.
- Use gold as a restrained accent.
- Avoid excessive gradients and decorative effects.
- Use authentic visuals that accurately represent real work.
- Ensure that visual design never compromises accessibility or usability.
- Apply the same visual identity to the dashboard while prioritizing administrative usability.

## 8. Animation Philosophy

Animations should improve navigation, feedback, and visual continuity without becoming the focus of the website.

Implemented patterns include:

- Subtle hero-section entrance effects.
- Short text and content reveal transitions.
- Light scroll-triggered reveals.
- Refined project-card hover interactions.
- Small button and navigation transitions.
- Clear loading and form-submission feedback.
- Appropriate dashboard transitions and interaction feedback.

Animations must remain smooth and restrained. The application must respect `prefers-reduced-motion` and avoid unnecessary motion on mobile devices.

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, React Router 7 |
| Styling | Tailwind CSS 4 with design tokens |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL 18 |
| ORM | Prisma 6 with committed migrations |
| Validation | Zod schemas on the server; client-side checks mirror the same rules before submitting |
| Authentication | Server-side PostgreSQL-backed sessions and Argon2id password hashing |
| Unit and component testing | Vitest and React Testing Library |
| End-to-end verification | Playwright scripts in `frontend/scripts/` |
| Local development | Docker Compose for PostgreSQL; npm scripts for the API and SPA |
| CI | GitHub Actions: backend typecheck/tests/build, frontend lint/tests/build, both verifiers, and container image builds |
| Media storage | Local disk under `MEDIA_ROOT`, behind a provider-neutral `store/read/remove` interface |
| Monitoring | `/api/health` (liveness), `/api/ready` (dependency-checked readiness for uptime monitors and alerting), the owner-only health panel, and console error logging |

Versions are pinned in the two `package.json` files and their lockfiles; the CI workflow fixes the Node.js version at 24. There is no server-side content cache and no CodeQL or DAST job in CI, so these are not claimed here.

## 10. Security Objectives

Security is a core project requirement.

The application should:

- Restrict administrative functionality to authenticated and authorized users.
- Never expose public administrator registration.
- Store passwords using an appropriate password-hashing algorithm.
- Use secure session-cookie settings in production.
- Validate and normalize untrusted input on the server.
- Apply rate limits to login and other sensitive endpoints.
- Protect against injection, cross-site scripting, cross-site request forgery where applicable, broken access control, and unsafe file uploads.
- Keep secrets and credentials out of source control.
- Protect contact messages, sessions, media, and administrative data from unauthorized access.
- Record relevant administrative actions without logging passwords, session tokens, or secrets.
- Use HTTPS in production.
- Apply dependency updates, security testing, backups, and recovery procedures.
- Enforce access control independently in every protected backend operation.
- Validate file type, size, and content before accepting uploads.
- Apply appropriate authorization and deletion rules to content, media, revisions, and trash.

Hiding dashboard controls in the frontend is not an authorization mechanism. The backend must independently enforce permissions.

## 11. Non-Functional Requirements

### Performance

- Keep pages responsive and avoid unnecessary JavaScript.
- Optimize images and static assets.
- Minimize layout shifts and excessive rendering.
- Use appropriate pagination and database indexes.
- Avoid unnecessary database queries.
- Apply caching only where appropriate and invalidate affected public-content caches after changes.
- Monitor important performance metrics.

### Accessibility

- Use semantic HTML and appropriate heading structure.
- Support keyboard navigation.
- Provide visible focus indicators.
- Maintain sufficient text and interface contrast.
- Associate form controls with accessible labels.
- Provide alternative text for meaningful images.
- Respect reduced-motion preferences.

### Responsiveness

- Support mobile, tablet, laptop, and desktop.
- Prevent horizontal overflow.
- Keep navigation, forms, media controls, tables, and dashboard actions usable on small screens.
- Provide appropriate alternatives to wide data tables where needed.

### Maintainability

- Use a consistent folder structure and naming convention.
- Separate presentation, business logic, API handling, and database access.
- Apply TypeScript types and server-side validation.
- Maintain readable code and useful documentation.
- Keep API contracts, database schemas, and frontend behavior aligned.
- Use automated tests and code-quality checks.

### Reliability and Data Integrity

- Handle application and API errors consistently.
- Provide understandable loading, empty, success, and failure states.
- Persist successful changes reliably.
- Validate database changes through controlled migrations.
- Prevent invalid relationships and unintended data loss.
- Define deletion, restoration, media-reference, and publishing policies.
- Maintain backups and document recovery procedures before production release.

### Privacy

- Collect only the analytics and personal information required by the project.
- Protect contact messages and administrative records.
- Define retention and deletion policies.
- Avoid exposing private drafts or administrative information through public endpoints.
- Disclose or obtain consent for analytics where required by applicable law.

## 12. Success Criteria

Success criteria:

1. Visitors can navigate the portfolio and understand the owner's professional background.
2. All approved public sections display accurate and consistent content.
3. The website provides a premium visual experience across supported screen sizes.
4. Animations remain subtle and respect reduced-motion preferences.
5. Administrators can manage all supported portfolio content without manually editing source code.
6. Every required content module supports its specified CRUD operations.
7. Profile images and other supported media can be uploaded, replaced, and removed safely.
8. Skills and project categories can be managed independently and assigned correctly.
9. Draft, publish, unpublish, preview, and visibility behavior works as specified.
10. Successful published changes appear in the appropriate public portfolio sections without manual source-code changes.
11. Deleted or unpublished content does not appear publicly when the configured visibility rules prohibit it.
12. Protected APIs reject unauthorized requests.
13. Forms and API endpoints validate untrusted input and handle failures safely.
14. Search, filtering, pagination, and supported bulk actions work correctly.
15. Contact inbox and administrative history features protect private data.
16. Analytics and system-health indicators display real data from implemented sources.
17. Important user journeys are covered by automated tests.
18. The project passes its configured build, type-check, lint, and relevant test checks.
19. Dependencies and application security are checked before production release.
20. Environment configuration, migrations, deployment, backup, and recovery procedures are documented.
21. The codebase can support future features without unnecessary architectural complexity.

## 13. Development Phases

Phases 1–7 are complete and covered by the test suites and the end-to-end verifiers. Phase 8 procedures are documented and the container images build in CI, but this repository does not record a live production deployment.

### Phase 1 — Requirements and Design

- Finalize the public portfolio requirements.
- Define the full admin module structure.
- Specify CRUD behavior and acceptance criteria for each content module.
- Define the design system and responsive layouts.
- Establish architecture, database relationships, and API contracts.
- Document security, publishing, media, deletion, and recovery requirements.

### Phase 2 — Foundation

- Set up the repository and development environment.
- Configure frontend, backend, PostgreSQL, and Prisma.
- Establish environment configuration and validation.
- Implement formatting, linting, and testing workflows.
- Define the initial database migrations and API response conventions.

### Phase 3 — Backend and Core Data Management

- Implement authentication and authorization.
- Build database models and migrations.
- Implement APIs for profiles, experience, education, projects, skills, categories, and certifications.
- Add server-side validation and error handling.
- Implement media storage integration.
- Test database persistence, relationships, and access control.

### Phase 4 — Public Portfolio

- Implement primary pages and navigation.
- Build reusable interface components.
- Add responsive layouts and refined animations.
- Connect public pages to backend APIs.
- Implement published-content filtering.
- Verify that public pages display current published data.

### Phase 5 — Core Admin Dashboard

- Build the sidebar, navigation, overview, and reusable admin components.
- Implement complete CRUD workflows for all core content modules.
- Implement profile and media management.
- Add categories, search, filtering, sorting, and pagination.
- Connect successful changes to database persistence and public-content synchronization.
- Implement appropriate confirmation and feedback states.

### Phase 6 — Advanced Admin Features

- Add draft, publish, unpublish, and preview workflows.
- Add homepage controls and supported website settings.
- Implement contact inbox and SEO settings.
- Add per-module search and supported bulk actions (no cross-module global search).
- Implement revision history, comparison, restore, and trash/restore.
- Add analytics, scheduled publishing, roles, and operational indicators.

### Phase 7 — Security, Testing, and Quality Assurance

- Test authentication and access control.
- Test CRUD, persistence, publishing, and public synchronization.
- Test media uploads and deletion behavior.
- Run unit, integration, API, and end-to-end tests.
- Review accessibility, responsiveness, performance, and SEO.
- Run the dependency and application security checks documented in `docs/11-testing-and-qa.md`.
- Resolve high-priority defects before release.

### Phase 8 — Deployment and Maintenance

- Configure production environment variables and secrets.
- Deploy using the selected hosting architecture.
- Configure HTTPS, database backups, and operational monitoring.
- Verify production behavior.
- Test recovery procedures.
- Document release, maintenance, and incident-response processes.

## 14. Future Enhancements

The following are genuinely unimplemented. Analytics, scheduled publishing, revision comparison and restoration, administrator roles, and project categories were on earlier lists and are now built.

- A blog or technical-notes section (`/notes`).
- A downloadable CV with version management.
- Import/export workflows beyond the contact-message CSV export.
- Generated responsive image variants and object storage behind the existing storage interface.
- Automated backup verification, monitoring, and recovery automation. The health panel states that backups run outside the application and cannot confirm one completed.
- Cross-module global search, and richer public project filtering (technology, year) beyond the API's category filter.
- Notification preferences for contact messages; no email delivery is configured.

Future features should be introduced based on demonstrated value rather than unnecessary technical complexity.

## 15. Project Status

**Current stage:** Implemented and verified for the documented scope.

The public site, the admin dashboard, the REST API, the Prisma schema, and the operational scripts exist and are exercised by 165 backend tests, 39 frontend tests, and the Playwright verifiers (255 admin checks plus 73 homepage checks on a fresh database).

Implemented:

- Public routes: Home, About (profile, skills, education, certifications), Projects, project detail, Experience, Contact, and the not-found page.
- Admin modules: overview, profile, homepage hero portrait with draft/publish and effect controls, projects and project categories, skills and skill categories, experience, education, certifications, media library, contact inbox, site settings, administrators with Owner/Editor roles, account security (TOTP two-factor authentication with recovery codes, failed-login monitoring on the activity log), sessions, audit log, analytics, health, trash, revisions with comparison and restore, and scheduling.
- Cross-cutting behaviour: bulk publish/unpublish/trash, search, filtering, sorting, pagination, revision snapshots, scheduled publishing worker, CSRF protection, rate limits, audit events, and media validation with reference-safe deletion.
- Media: the homepage portrait, project covers, gallery screenshots, and the profile portrait can be uploaded or chosen from the library; image bytes are served from immutable public URLs and drafts stay private.

Not implemented (kept out of every “implemented” claim):

- Blog/notes, downloadable CV, and general import/export.
- Responsive image variants and object storage.
- Automated backup verification or monitoring, and cross-module global search.
- A live production deployment; deployment procedures, container definitions, and a Render blueprint validated against Render's schema exist, but no environment is recorded here.

A feature must not be described as completed until it has been implemented and verified. The requirements in `docs/02`–`docs/14` describe intended behaviour; where the current build differs, the section that documents the implemented behaviour takes precedence.

## 16. Related Documentation

- [`README.md`](../README.md) — Project overview and getting-started guide.
- [`02-portfolio-requirements.md`](./02-portfolio-requirements.md) — Detailed public portfolio requirements.
- [`03-design-system.md`](./03-design-system.md) — Colors, typography, spacing, and components.
- [`04-animation-guidelines.md`](./04-animation-guidelines.md) — Motion principles and implementation expectations.
- [`05-system-architecture.md`](./05-system-architecture.md) — System architecture and data flow.
- [`06-frontend-architecture.md`](./06-frontend-architecture.md) — Frontend structure and conventions.
- [`07-backend-api.md`](./07-backend-api.md) — API design and endpoint requirements.
- [`08-database-schema.md`](./08-database-schema.md) — Database entities and relationships.
- [`09-admin-dashboard.md`](./09-admin-dashboard.md) — Administrative dashboard functionality.
- [`10-security.md`](./10-security.md) — Security requirements and controls.
- [`11-testing-and-qa.md`](./11-testing-and-qa.md) — Testing and quality assurance.
- [`12-deployment-and-maintenance.md`](./12-deployment-and-maintenance.md) — Deployment and operational maintenance.
- [`13-admin-advanced-features.md`](./13-admin-advanced-features.md) — Advanced dashboard modules and workflows.
- [`14-dynamic-content-and-media-management.md`](./14-dynamic-content-and-media-management.md) — Content synchronization, publishing, and media lifecycle.
