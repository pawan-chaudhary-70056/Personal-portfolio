# Frontend — Luxury Personal Portfolio

React, TypeScript, Vite, and Tailwind CSS. Contains the public portfolio homepage and the authenticated admin dashboard.

**Implemented:** the public site (`/`, `/about`, `/projects`, `/projects/:slug`, `/experience`, `/contact`, plus a not-found page) rendered entirely from published backend records, with a validated contact form; and the authenticated admin dashboard: overview, project list with search/filter/pagination, project create/edit with publish, archive, confirmed delete, and a screenshot gallery editor (URL + alt text + optional caption, up to 8, ordered by list position), a profile module (identity, biography, approved links, portrait URL with live preview), a homepage hero module (managed portrait upload with local preview before upload, draft alt text and visibility, tilt/animation/floating controls with a live draft preview, save-as-draft, publish, and confirmed removal), skills, experience, education, and certification modules (list, create, edit, publish/hide, confirmed delete), a contact inbox (`/admin/messages`) with search, status filters, full message reading, read/unread/archive actions, confirmed delete, and filtered CSV export, a filterable activity log, and session management. Admin navigation is grouped by dashboard, portfolio content, inbox, and security.

## Getting started

The admin login needs the API running.

```bash
# repository root
docker compose up -d db
cd backend && npm run dev      # terminal 1

cd frontend && npm run dev     # terminal 2, http://localhost:5173
```

Vite proxies `/api` to `http://127.0.0.1:4000`, so development is same-origin and session cookies behave exactly as in production.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check (`tsc -b`) then build for production |
| `npm run preview` | Serve the production build locally (also proxies `/api`) |
| `npm run lint` | Lint with `oxlint` |
| `npm run verify:homepage` | Playwright + axe checks for the public site |
| `npm run verify:admin` | Playwright + axe checks for the admin flows |

## Public routes

| Route | Purpose |
|---|---|
| `/` | Homepage with featured work, skills, experience, credentials, and contact call to action |
| `/about` | Profile, biography, expertise, and credentials |
| `/projects` | Every published project |
| `/projects/:slug` | Project detail; unpublished or unknown slugs show a not-found state |
| `/experience` | Full professional history |
| `/contact` | Published contact details plus the contact message form |

All public pages read from the same request in `PortfolioProvider`, so navigation between them does not refetch content. Only published records are returned by the API; the navigation marks the current page with `aria-current`.

## Admin routes

| Route | Access | Purpose |
|---|---|---|
| `/admin/login` | Public | Sign in |
| `/admin` | Authenticated | Overview and recent audit activity |
| `/admin/profile` | Authenticated | Public profile form with live preview |
| `/admin/homepage` | Authenticated | Hero portrait upload, draft preview, effect controls, publish, remove |
| `/admin/projects` | Authenticated | Project table, search, status and category filters, actions |
| `/admin/projects/new` | Authenticated | Create a project |
| `/admin/projects/:id` | Authenticated | Edit a project |
| `/admin/project-categories` | Authenticated | Project categories: create, rename, reorder, usage counts, delete when unused |
| `/admin/skills` | Authenticated | Skill table with search and visibility actions |
| `/admin/skill-categories` | Authenticated | Skill categories: create, rename, reorder, usage counts, delete when unused |
| `/admin/skills/new` | Authenticated | Create a skill |
| `/admin/skills/:id` | Authenticated | Edit a skill |
| `/admin/experience` | Authenticated | Experience table with search and visibility actions |
| `/admin/experience/new` | Authenticated | Create an experience entry |
| `/admin/experience/:id` | Authenticated | Edit an experience entry |
| `/admin/audit-logs` | Authenticated | Append-only activity log with search, area/action/date filters, pagination, and event details |
| `/admin/messages` | Authenticated | Contact inbox with search, status filter, full message view, actions, and CSV export |
| `/admin/sessions` | Authenticated | Active sessions for this account with revoke-one and revoke-others actions |

Route protection in `RequireAdmin` is a convenience only: every admin API request is authorized again on the server. The session cookie is `HttpOnly`, so no token is readable from JavaScript, and the app stores no session data in `localStorage` or `sessionStorage`.

## Editing public content

Every public page is backend-driven: publish or hide records in the admin dashboard and the public site reflects the change on the next load. `src/content/` only holds navigation labels, so nothing on the public site requires a code change to update.

## Verification

Both scripts drive a real browser:

```bash
npm run build
npm run preview -- --port 4174 --strictPort        # terminal 1
BASE_URL=http://127.0.0.1:4174 npm run verify:homepage

# admin checks need the API and dev server
cd ../backend && npm run dev                       # terminal 1
npm run dev                                        # terminal 2
npm run verify:admin
```

`verify:homepage` covers rendering, fonts, entrance and scroll animations, reduced motion, mobile navigation, the 404 route, layout overflow, axe WCAG A/AA, and every public route: heading, current-page indicator, project listing parity with the API, project detail navigation, related projects, the screenshot gallery and its card cover fallback, unknown project slugs, deep links to in-page sections, and the contact form's field-level validation.

`verify:admin` covers the sign-out redirect, invalid credentials, deep-link restore after sign-in, cookie flags, absence of client-readable session state, validation errors, project and skill category management (create, rename, delete when unused), homepage portrait upload with local preview, draft privacy, save/publish, published bytes, removal restoring the fallback, trash selection with bulk restore and confirmed bulk permanent deletion across records, create → publish → edit → delete with confirmation for projects (including the screenshot gallery: client-side row validation, public gallery rendering, cover fallback, and persistence across edits), skills, and experience, public API visibility (drafts and hidden records absent), the disabled end-date rule for current roles, profile validation plus save/restore when a profile already exists, contact submission through the public form followed by filtering, exporting (CSV header, UTF-8 BOM, formula-injection guard, and status), opening, marking read, archiving, and deleting it in the admin inbox, activity-log filtering and event details, revision snapshot previews with field-level diffs and raw JSON, session listing and revocation from a second browser, sign-out, mobile navigation, axe audits, and unexpected console errors. It creates and deletes its own records.

The Playwright browser is installed once with `npx playwright install chromium --only-shell`.

## Design tokens

[`src/themes/tokens.css`](src/themes/tokens.css) holds colors, type scale, containers, and easing curves from `docs/03-design-system.md`.

Rules enforced there and worth keeping:

- `--color-gold` (`#C6AA78`) is only 1.96:1 on ivory. Use `--color-gold-ink` (`#7A6434`) for gold text, borders, or focus rings on light surfaces.
- Secondary text uses `--color-muted-dark` / `--color-muted-light` instead of opacity modifiers such as `text-ivory/40`, which fails AA.
- Success text on light surfaces uses `--color-success-ink`; the brighter `--color-success` fails AA once an alert tint is applied.
- `Section` and the admin shell set `data-tone`, which switches the focus-ring color for light versus dark surfaces.

## Structure

```text
src/
├── @types/       Content and admin API types
├── api/          Typed fetch client (CSRF aware) and resource functions
├── auth/         Session context, provider, and hook
├── components/   ui/, layout/, navigation/, portfolio/, projects/, forms/, feedback/, admin/
├── content/      Public navigation definitions
├── hooks/        useApiResource, useReducedMotion, useScrollReveal, useScrolled
├── pages/        public/, admin/, errors/
├── routes/       Route objects for public and admin areas
├── templates/    PublicLayout, AdminLayout
├── themes/       tokens.css
└── utils/        cn, metadata, dates, form payloads, error mapping, audit labels, user-agent summaries
```

## Not implemented yet

- Admin modules for site settings and the media library.
- A general media library, plus uploads for project covers, gallery screenshots, and the profile portrait (those still accept validated `http(s)` URLs; only the homepage hero portrait is uploaded today).
- Email notifications for new contact messages; submissions are stored in the inbox only.
- Pre-rendering of public routes for reliable link previews (`docs/06-frontend-architecture.md` §15).
