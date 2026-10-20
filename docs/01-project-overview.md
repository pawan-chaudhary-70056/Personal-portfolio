# Project Overview — Luxury Personal Portfolio

## 1. Introduction

The Luxury Personal Portfolio is a modern, professional, secure, and dynamically managed personal portfolio website designed to showcase professional experience, technical skills, projects, education, certifications, achievements, and contact information through a premium digital experience.

The system consists of two connected applications:

1. **Public Portfolio Website** — presents the portfolio owner's professional identity, background, skills, projects, and achievements.
2. **Secure Admin Dashboard** — provides centralized control over portfolio content, media, website appearance, publishing, SEO, contact messages, analytics, security, and system maintenance.

The portfolio owner must be able to manage website content through the admin dashboard without manually editing source code or directly modifying database records.

All supported content-management operations must be connected to the backend API, database, and media storage where applicable. Published changes must appear on the appropriate public portfolio sections automatically after successful processing and any required cache refresh.

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
- **Skills:** Categorized technical and professional skills.
- **Projects:** Project descriptions, technologies, categories, screenshots, repository links, live-demo links, and featured-project presentation.
- **Experience:** Employment history, internships, responsibilities, achievements, dates, and relevant links where applicable.
- **Education:** Academic qualifications, institutions, study periods, and supporting details.
- **Certifications:** Certification title, issuing organization, issue date, credential identifier or verification link, and optional certificate image or document.
- **Contact:** Public contact information and a validated contact form.
- **Navigation and footer:** Configurable navigation links, social links, and footer content.
- **Responsive navigation:** Consistent usability across desktop, tablet, and mobile devices.
- **Animations:** Subtle entrance effects, content reveals, hover interactions, and meaningful feedback.
- **SEO and metadata:** Page titles, descriptions, canonical URLs where appropriate, social-sharing metadata, and semantic structure.
- **Content visibility:** Only content permitted for public display should be exposed through public APIs and pages.

The homepage must not depend on hardcoded portfolio content when the relevant information is intended to be managed through the dashboard.

The final navigation and page structure may be refined during implementation, but the public experience must remain consistent with the approved design system.

### 4.2 Admin Dashboard

The admin dashboard is a private application available only to authenticated and authorized administrators.

It must provide a centralized interface with a persistent sidebar, organized modules, reusable components, clear navigation, responsive layouts, and consistent success, error, loading, and empty states.

#### 4.2.1 Dashboard Overview and Analytics

The dashboard overview should provide useful information, including:

- Content totals and publishing status.
- Project and category counts.
- Contact-message counts, including unread messages.
- Recent administrative activity.
- Available visitor and project-engagement analytics.
- Date-range filters for supported analytics.
- System status indicators and relevant warnings.

Analytics must be based on real collected data. Visitor trends and project popularity must not be fabricated or presented as real measurements unless an actual collection mechanism is implemented.

#### 4.2.2 Personal Profile Management

The administrator must be able to:

- Create or initialize the profile record where applicable.
- View and edit personal details.
- Update name, professional title, contact information, and social links.
- Create, edit, and update the professional biography and summary.
- Upload, replace, update, and remove the profile picture.
- Manage other supported profile fields.
- Preview relevant profile changes.
- Save drafts where supported and publish approved changes.
- Validate required fields and receive clear feedback.

The system must define how the initial profile is created if the application expects one primary profile.

#### 4.2.3 Work Experience Management

The administrator must be able to:

- Add new experience records.
- View existing experience records.
- Edit and update any supported field.
- Delete or move records to trash according to the deletion policy.
- Manage employer, role, location, employment type, dates, responsibilities, and achievements.
- Indicate whether a role is current, where applicable.
- Reorder records for public presentation.
- Control draft and published status where applicable.

#### 4.2.4 Education Management

The administrator must be able to:

- Add, view, edit, update, and delete education records.
- Manage institution, qualification, field of study, dates, descriptions, and supporting links.
- Reorder education entries.
- Preview changes and control public visibility.

#### 4.2.5 Project Management

The administrator must be able to:

- Create, view, edit, update, and delete projects.
- Manage title, slug, description, project details, technologies, and categories.
- Upload, replace, reorder, and remove project images.
- Manage repository and live-demo links.
- Set featured-project status.
- Configure display order and publication status.
- Preview the project before publishing.
- Search, filter, sort, and paginate project records.
- Apply supported bulk operations to selected projects.

A project must not appear in public project listings merely because a draft record exists.

#### 4.2.6 Skills and Skill Categories

The administrator must be able to:

- Create, view, edit, update, and delete skills.
- Create, view, edit, update, and delete skill categories.
- Assign skills to appropriate categories.
- Update skill names, descriptions, proficiency information, and display order where supported.
- Prevent invalid category references.
- Control which skills and categories are publicly displayed.

#### 4.2.7 Project Categories

The administrator must be able to:

- Create, view, edit, update, and delete project categories.
- Assign and reassign projects to categories.
- Update category names, descriptions, slugs, and display order where supported.
- Search and filter category records.
- Handle category deletion safely when projects still reference a category.

The system must use an explicit relationship policy when deleting categories: reassignment, removal of the relationship, or rejection until dependencies are resolved.

#### 4.2.8 Certification Management

The administrator must be able to:

- Create, view, edit, update, and delete certifications.
- Manage certificate title, issuing organization, dates, credential ID, and verification URL.
- Upload, replace, and remove certificate images or documents where supported.
- Set display order and publication status.
- Validate external links and uploaded files appropriately.

#### 4.2.9 Media Library

The dashboard should provide centralized media management for supported images and documents.

Features include:

- Uploading, listing, viewing, replacing, and deleting media.
- Associating media with profiles, projects, certifications, and other supported content.
- Editing alternative text and supported metadata.
- Validating file type, size, and content.
- Previewing images before saving.
- Detecting media that is no longer referenced by content.
- Preventing accidental removal of media that is still in use.
- Handling failed uploads and broken media references safely.

Actual image storage must use an appropriate storage implementation. Database records may store metadata and storage references rather than entire files.

#### 4.2.10 Homepage and Appearance Controls

The administrator should be able to manage supported website presentation settings, including:

- Homepage section visibility.
- Section ordering.
- Featured-project selection and ordering.
- Profile headline, summary, and call-to-action content.
- Navigation and footer content.
- Supported theme or appearance presets.
- Previewing changes before publication.
- Publishing approved website configuration changes.

Appearance controls must be limited to the options explicitly supported by the design system; arbitrary changes must not be allowed to break the site's visual consistency or accessibility.

#### 4.2.11 Draft, Publishing, and Preview Workflow

Supported content modules should provide a clear publishing workflow.

Features include:

- Saving drafts.
- Editing drafts without exposing them publicly.
- Previewing content before publication.
- Publishing and unpublishing content.
- Featuring supported projects.
- Displaying publication status and timestamps.
- Preventing unpublished or deleted content from appearing publicly.
- Supporting scheduled publishing only if the required scheduling infrastructure is implemented.

The dashboard must clearly distinguish saved content from published content.

#### 4.2.12 Contact Inbox

The administrator must be able to:

- View submitted contact messages.
- Open individual message details.
- Mark messages as read or unread.
- Archive messages.
- Search, filter, and paginate messages.
- Identify and manage suspected spam.
- Delete messages according to the retention policy.
- View relevant timestamps and message status.
- Configure supported notification preferences.

Contact messages must remain private and accessible only to authorized administrators.

#### 4.2.13 Website Settings and SEO

Supported settings should include:

- Website title and description.
- Homepage metadata.
- Page-specific SEO metadata where applicable.
- Open Graph and social-sharing metadata.
- Favicon and supported branding assets.
- Public contact details.
- Social media links.
- Navigation and footer configuration.
- Supported URL slugs and redirects where implemented.
- SEO preview information.

Settings must be validated and safely applied to the public website.

#### 4.2.14 Search, Filtering, and Bulk Actions

The dashboard should support efficient content discovery and management through:

- Module-specific search.
- Global search across supported content.
- Filtering by category, publication status, date, and other relevant fields.
- Sorting by supported columns.
- Pagination for large collections.
- Multi-select operations.
- Supported bulk publish, unpublish, archive, delete, and category-assignment actions.
- Confirmation for destructive or high-impact operations.

Bulk operations must validate each operation and provide clear feedback about successful and failed records.

#### 4.2.15 Revision History and Trash

Where implemented, the dashboard should provide:

- Revision history for supported content.
- Previous-version comparison.
- Restoration of a previous version.
- Temporary trash for eligible deleted records.
- Restore and permanent-delete operations.
- Clear retention rules.
- Audit records for important restoration and deletion events.

Permanent deletion must be distinguishable from temporary deletion. The interface must explain when an operation cannot be reversed.

#### 4.2.16 Security and Session Management

Security-related administrative features should include:

- Secure login and logout.
- Password-change workflow.
- Session information and supported session revocation.
- Login history and failed-login monitoring.
- Optional multi-factor authentication if implemented.
- Audit logs for important administrative operations.
- Appropriate rate limits and abuse protections.
- Secure handling of session expiration and reauthentication.

Security controls must be enforced by the backend, not merely by hiding interface elements.

#### 4.2.17 System Health and Maintenance

The dashboard may provide operational information such as:

- Application and API health.
- Database connectivity status.
- Media-storage status.
- Recent application errors.
- Backup status and last successful backup time.
- Storage usage where measurable.
- Maintenance status.
- Relevant warnings and notifications.

Health checks must not expose database credentials, secrets, internal infrastructure details, or sensitive stack traces to unauthorized users.

A displayed backup status must come from a real backup process or monitoring source.

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
- Rate limiting and structured application logging.
- Environment-based configuration.
- Database constraints and appropriate indexes.
- Health checks and operational monitoring.

All content changes must be persisted through the backend. Frontend-only modifications do not count as completed content-management functionality.

### 4.4 Database and Media Storage

The data model must support the relationships and workflows required by the project.

Core entities may include:

- Administrator and session records.
- Profile and website settings.
- Work experience and education.
- Projects, project categories, and project technology relationships.
- Skills and skill categories.
- Certifications.
- Media assets and their content relationships.
- Contact messages.
- Audit events.
- Content revisions and trash metadata where required.
- Analytics records where collection is enabled.

The final schema must be consistent with the implemented Prisma models, API contracts, deletion policies, and publishing rules.

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
- Responsive layout and accessibility checks.
- Dependency vulnerability checks.
- Static analysis and code-quality checks.
- Performance and relevant security tests.

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

Optional features such as scheduled publishing, MFA, visitor analytics, revision restoration, and automated backup monitoring must be implemented only when their technical dependencies and operational requirements are defined.

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

Planned patterns include:

- Subtle hero-section entrance effects.
- Short text and content reveal transitions.
- Light scroll-triggered reveals.
- Refined project-card hover interactions.
- Small button and navigation transitions.
- Clear loading and form-submission feedback.
- Appropriate dashboard transitions and interaction feedback.

Animations must remain smooth and restrained. The application must respect `prefers-reduced-motion` and avoid unnecessary motion on mobile devices.

## 9. Proposed Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Authentication | Server-side sessions and Argon2id password hashing |
| Unit and component testing | Vitest and React Testing Library |
| End-to-end testing | Playwright |
| Local development | Docker Compose |
| CI/CD | GitHub Actions |
| Security and quality checks | Dependency auditing, CodeQL, and appropriate DAST tooling |
| Media storage | A validated local or object-storage implementation appropriate to deployment |
| Monitoring | Application health checks and appropriate logging/monitoring integrations |

These technologies are proposed architectural choices. Exact versions, configuration, and production suitability must be verified during implementation.

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

The project will be considered successful when:

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
16. Optional analytics and system-health indicators display real data from implemented sources.
17. Important user journeys are covered by automated tests.
18. The project passes its configured build, type-check, lint, and relevant test checks.
19. Dependencies and application security are checked before production release.
20. Environment configuration, migrations, deployment, backup, and recovery procedures are documented.
21. The codebase can support future features without unnecessary architectural complexity.

## 13. Development Phases

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
- Add global search and supported bulk actions.
- Implement revision history and trash/restore where specified.
- Add analytics, notifications, and operational indicators where their data sources are available.

### Phase 7 — Security, Testing, and Quality Assurance

- Test authentication and access control.
- Test CRUD, persistence, publishing, and public synchronization.
- Test media uploads and deletion behavior.
- Run unit, integration, API, and end-to-end tests.
- Review accessibility, responsiveness, performance, and SEO.
- Run dependency and application security checks.
- Resolve high-priority defects before release.

### Phase 8 — Deployment and Maintenance

- Configure production environment variables and secrets.
- Deploy using the selected hosting architecture.
- Configure HTTPS, database backups, and operational monitoring.
- Verify production behavior.
- Test recovery procedures.
- Document release, maintenance, and incident-response processes.

## 14. Future Enhancements

Potential future improvements include:

- A blog or technical-notes section.
- Advanced project categorization and filtering.
- A downloadable CV with version management.
- Privacy-conscious visitor analytics.
- Enhanced content preview and revision comparison.
- Scheduled publishing.
- Optional multi-factor authentication.
- Improved accessibility and performance analysis.
- Additional administrative roles only if a genuine requirement emerges.
- Import/export workflows for supported data.
- Additional monitoring and recovery automation.

Future features should be introduced based on demonstrated value rather than unnecessary technical complexity.

## 15. Project Status

**Current stage:** Requirements and documentation refinement.

The project requirements, visual direction, technology stack, architecture, core dashboard workflows, and advanced administrative features are being defined before or alongside implementation.

A feature must not be described as completed until it has been implemented and verified.

The documentation describes intended behavior, not proof that the current codebase already implements every feature. Requirements, schemas, APIs, and tests must be aligned with the actual application as development progresses.

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
