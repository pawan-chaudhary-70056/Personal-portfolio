# Master Prompt: Documentation-First Update → Implementation

You are a senior full-stack engineer, software architect, UI/UX engineer, and security-focused code reviewer.

Your task is to continue developing my luxury personal portfolio website and its secure Admin Dashboard. Follow a strict **Documentation-First → Implementation → Testing → Verification** workflow.

Do not start coding immediately. First inspect the existing project and documentation, update the necessary documentation files, and only then implement the features.

## PHASE 1 — Inspect the Existing Project

Before making any changes:

1. Identify the actual project root using the current working directory and Git repository.
2. Inspect the existing folder structure, `README.md`, all relevant Markdown files in `docs/`, frontend and backend `package.json` files, environment examples, database schema, API routes, authentication, media handling, tests, Docker configuration, and CI workflows where available.
3. Identify the existing framework, architecture, libraries, database, ORM, coding conventions, and implemented features.
4. Run `git status --short` and preserve all existing user changes.
5. Do not assume that a feature exists simply because it is mentioned in documentation.
6. Do not overwrite, delete, or restructure existing files without a justified reason.
7. Do not expose secrets, API keys, credentials, or private environment values in output or documentation.

Create an internal checklist of:
- Existing functionality
- Missing functionality
- Documentation inconsistencies
- Implementation dependencies
- Security and testing requirements

If the repository or required files cannot be found, stop and report the issue rather than guessing the project structure.

## PHASE 2 — Update Documentation Before Coding

Review the existing documentation set, including, where present:

- `README.md`
- `docs/01-project-overview.md`
- `docs/02-portfolio-requirements.md`
- `docs/03-design-system.md`
- `docs/04-animation-guidelines.md`
- `docs/05-system-architecture.md`
- `docs/06-frontend-architecture.md`
- `docs/07-backend-api.md`
- `docs/08-database-schema.md`
- `docs/09-admin-dashboard.md`
- `docs/10-security.md`
- `docs/11-testing-and-qa.md`
- `docs/12-deployment-and-maintenance.md`
- `docs/13-admin-advanced-features.md`
- `docs/14-dynamic-content-and-media-management.md`

The list above is a reference, not permission to create duplicate files or assume every file exists. Discover the actual documentation structure first.

Update only the files that need changes. Keep all documentation consistent with the actual codebase and the requirements below.

### New Feature: Admin-Managed Interactive 3D Hero Portrait

I want to upload my own portrait through the Admin Dashboard and display it on the right side of my public portfolio homepage with a premium, interactive 3D-style effect.

#### A. Public Homepage

- Maintain the luxury editorial design direction.
- Use charcoal `#111110`, ivory `#F4F0E8`, and champagne gold `#C6AA78` as the established palette unless the existing design system specifies otherwise.
- Place the main introduction, professional title, short description, and CTA on the left.
- Display my portrait on the right on desktop and adapt the composition for mobile and tablet.
- The portrait must come from the published content managed through the Admin Dashboard.
- Support a refined depth effect, subtle perspective tilt, and smooth pointer-responsive movement where supported.
- Use restrained lighting, shadows, layering, and transitions. Avoid excessive rotation, distracting movement, or a gaming-style appearance.
- Respect `prefers-reduced-motion`.
- Provide a static, attractive fallback on mobile, touch devices, unsupported browsers, or when animations are disabled.
- Prevent layout shifts by reserving the image's dimensions.
- Include meaningful alternative text and ensure sufficient contrast and keyboard accessibility.
- Do not invent a new 3D model or require a paid external service unless explicitly justified and approved.

#### B. Admin Dashboard — Hero Portrait Management

Add an appropriate section under the existing homepage/content management interface.

An authorized administrator must be able to:

1. Upload a portrait image from their device.
2. Preview the image before saving or publishing.
3. Replace the existing portrait.
4. Remove the portrait or restore a configured default fallback.
5. Edit the image's alternative text.
6. Manage the portrait's visibility or publication status.
7. Preview how the portrait appears on the homepage before publishing.
8. Save a draft and publish changes using the existing content workflow.
9. Receive clear validation messages, upload progress where practical, and success/error feedback.

Where appropriate, support crop positioning or focal-point adjustment without introducing unnecessary complexity.

The public homepage must not display unpublished changes. Publishing a new portrait should update the public homepage through the existing content delivery mechanism and invalidate any relevant cache.

#### C. 3D Effect Controls

Provide sensible, safe defaults for the interactive effect.

If appropriate for the existing architecture, allow administrators to enable or disable the effect and configure a limited set of safe options, such as:

- Effect enabled/disabled
- Tilt intensity
- Animation intensity
- Optional subtle floating motion
- Reduced-motion-compatible behavior

Do not create an unnecessarily complicated animation editor. Keep the experience simple, premium, performant, and maintainable.

Store configuration in the existing site settings or homepage content model when suitable. Avoid introducing a separate table unless the current architecture requires it.

#### D. Image Upload and Storage Security

Follow the project's existing media-management architecture.

- Authenticate and authorize every administrative upload, update, and delete operation.
- Validate file size, actual image content, and allowed image formats on the server.
- Use an explicit allowlist of supported formats, such as JPEG, PNG, and WebP, where supported by the existing image pipeline.
- Do not trust the client-provided MIME type or filename.
- Generate safe storage filenames and prevent path traversal.
- Reject SVG uploads unless the project has a specifically reviewed and safe SVG sanitization pipeline.
- Prevent executable content from being treated as an image.
- Apply the existing request-size limits, rate limits, CSRF protection, and session-security rules as appropriate.
- Use the existing storage provider or local media storage pattern. Do not expose private filesystem paths.
- Do not place uploaded binary image data directly into ordinary database records.
- Store only the required media metadata and references in the database.
- Avoid deleting an image that is still referenced by another published page or content revision.
- Ensure upload failure does not break the existing homepage.
- Keep secrets and storage credentials in environment variables.
- Follow existing audit logging and retention requirements.

Do not introduce a new storage vendor or paid service without explaining why it is needed.

## PHASE 3 — Reconcile the Technical Design

Before implementation, ensure the updated documents agree on:

- Frontend and backend responsibilities
- Database fields and relationships
- Public and administrative API endpoints
- Authentication, authorization, sessions, and CSRF
- Draft, preview, publish, and unpublish behavior
- Media storage, replacement, and deletion
- Cache invalidation and error handling
- Accessibility, responsive behavior, and reduced motion
- Testing and deployment requirements

Document the new feature in the relevant existing files. Do not update all 15 files mechanically if only a subset needs changes.

If the existing architecture differs from the proposed design, adapt the feature to the existing architecture rather than replacing working technology unnecessarily.

Do not mark planned functionality as implemented until it has been verified.

## PHASE 4 — Documentation Review Gate

After updating documentation:

1. Review the actual diffs.
2. Check Markdown formatting and links where practical.
3. Verify that endpoint names, database fields, settings, and implementation instructions do not contradict each other.
4. Clearly list:
   - Files updated
   - What changed in each file
   - Any unresolved decisions
5. Save the documentation changes before starting implementation.

Then continue to Phase 5 in the same session if the repository is accessible and the changes are safe. Do not stop after producing a plan or asking for approval for ordinary implementation decisions. Ask for clarification only when a genuinely blocking decision requires user input or an irreversible/destructive action is involved.

## PHASE 5 — Implement the Feature

Implement the feature according to the verified documentation and the existing project's conventions.

### Frontend

- Integrate the portrait into the existing homepage rather than creating a duplicate homepage.
- Use the existing component structure, design tokens, API client, state-management conventions, and routing.
- Build a reusable hero portrait component.
- Support loading, missing-image, failed-image, and fallback states.
- Implement subtle interactive perspective/depth effects using existing dependencies where possible.
- Avoid unnecessary libraries, excessive animation, and avoidable re-renders.
- Ensure responsive behavior, keyboard accessibility, reduced-motion support, and touch-device compatibility.
- Avoid layout shifts and optimize image delivery.

### Admin Dashboard

- Integrate portrait management into the existing Admin Dashboard.
- Reuse existing authentication, authorization, form validation, upload components, notifications, and preview/publish workflows.
- Implement upload, preview, replacement, removal, alternative-text editing, and applicable effect controls.
- Display clear validation and server-error messages.
- Do not expose administrative controls or unpublished content through public APIs.

### Backend and API

- Follow the existing REST API conventions and versioning.
- Implement or extend the necessary protected upload and content-management endpoints.
- Validate requests on the server using the project's established validation library.
- Verify administrative permissions for every privileged operation.
- Implement correct draft/published behavior.
- Integrate the media reference and effect configuration into the existing content/settings model where appropriate.
- Ensure transactions, error handling, audit logging, and cache invalidation follow the existing architecture.
- Do not create duplicate endpoints, models, services, or migrations when existing functionality can be extended safely.

### Database

- Inspect the existing schema before modifying it.
- Add only the fields or relationships genuinely required.
- Create a migration only if the schema actually changes.
- Preserve existing data and migration history.
- Never reset or drop the database to make the feature work.
- Keep Prisma commands compatible with the installed Prisma version and the project's scripts.

## PHASE 6 — Testing and Verification

Run the applicable existing checks and add tests for the new feature.

At minimum, verify:

### Admin and API
- Authorized administrator can upload a valid image.
- Unauthorized requests are rejected.
- Invalid formats, oversized files, and malformed requests are rejected.
- Replacing or removing a portrait works correctly.
- Alternative text and effect settings are saved and validated.
- Draft changes are not exposed publicly.
- Publishing updates the public content correctly.
- Cache invalidation behaves correctly.
- Failed uploads do not corrupt existing published content.
- Media deletion does not break other references.

### Frontend
- The portrait renders correctly on desktop, tablet, and mobile.
- Missing or failed images use a graceful fallback.
- The 3D effect works without blocking normal interaction.
- Reduced-motion preferences are respected.
- Keyboard and screen-reader accessibility are considered.
- The admin upload and preview workflows work correctly.
- Existing homepage and Admin Dashboard functionality remains intact.

### Project Quality
Run the checks actually available in the repository, such as:

- Formatting
- Linting
- Type checking
- Unit and integration tests
- Relevant API/database tests
- Production builds
- Existing end-to-end tests

Do not invent package scripts or report tests as passed when they were not run.

If a check fails, investigate and fix failures introduced by your changes. Clearly identify unrelated existing failures and environmental blockers.

Do not weaken security controls, remove meaningful tests, or suppress errors merely to obtain a passing build.

## PHASE 7 — Final Report

At completion, provide a concise report with these sections:

1. **Documentation Updated** — exact filenames and changes.
2. **Implementation Completed** — actual frontend, backend, API, and database changes.
3. **Admin Workflow** — how to upload, preview, and publish the portrait.
4. **3D Effect** — implemented behavior, settings, and fallback behavior.
5. **Tests and Build** — exact checks executed and their actual results.
6. **Migration and Environment** — any necessary commands, environment variables, or deployment steps.
7. **Remaining Work** — anything not implemented, unverified, or blocked.

Clearly distinguish between completed, partially completed, and planned features.

## Non-Negotiable Rules

- Documentation first; coding second.
- Inspect before modifying.
- Preserve existing working features and user changes.
- Follow the actual repository rather than assumptions.
- Reuse existing architecture and dependencies wherever practical.
- Keep the design professional, luxury, responsive, accessible, and performant.
- Keep media handling and authentication secure.
- Never claim a feature or test is complete without evidence.
- Do not finish with documentation alone if implementation can safely proceed.
- Do not stop after the plan; continue through implementation, testing, and final reporting.

**Start now with Phase 1. Inspect the repository and its documentation before editing any files or writing application code.**