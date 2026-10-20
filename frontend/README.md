# Frontend — Luxury Personal Portfolio

React, TypeScript, Vite, and Tailwind CSS. Contains the public portfolio homepage and the authenticated admin dashboard.

**Implemented:** homepage (`/`), not-found page, admin sign-in, dashboard overview, project list with search/filter/pagination, project create/edit with publish, archive, and confirmed delete, plus skills and experience modules (list, create, edit, publish/hide, confirmed delete).

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

## Admin routes

| Route | Access | Purpose |
|---|---|---|
| `/admin/login` | Public | Sign in |
| `/admin` | Authenticated | Overview and recent audit activity |
| `/admin/projects` | Authenticated | Project table, search, status filter, actions |
| `/admin/projects/new` | Authenticated | Create a project |
| `/admin/projects/:id` | Authenticated | Edit a project |
| `/admin/skills` | Authenticated | Skill table with search and visibility actions |
| `/admin/skills/new` | Authenticated | Create a skill |
| `/admin/skills/:id` | Authenticated | Edit a skill |
| `/admin/experience` | Authenticated | Experience table with search and visibility actions |
| `/admin/experience/new` | Authenticated | Create an experience entry |
| `/admin/experience/:id` | Authenticated | Edit an experience entry |

Route protection in `RequireAdmin` is a convenience only: every admin API request is authorized again on the server. The session cookie is `HttpOnly`, so no token is readable from JavaScript, and the app stores no session data in `localStorage` or `sessionStorage`.

## Editing public content

Public homepage copy lives in [`src/content/portfolio.ts`](src/content/portfolio.ts). While `CONTENT_IS_PLACEHOLDER` is `true`, a notice appears in the hero and sample entries are labelled "Sample". Replace the values with real, verifiable information and set the flag to `false` before deploying.

Projects created in the admin dashboard are stored in PostgreSQL, but the homepage does not render them yet — it still reads the static content module. Wiring the public page to `GET /api/projects` is the next step.

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

`verify:homepage` covers rendering, fonts, entrance and scroll animations, reduced motion, mobile navigation, the 404 route, layout overflow, and axe WCAG A/AA.

`verify:admin` covers the sign-out redirect, invalid credentials, deep-link restore after sign-in, cookie flags, absence of client-readable session state, validation errors, create → publish → edit → delete with confirmation for projects, skills, and experience, public API visibility (drafts and hidden records absent), the disabled end-date rule for current roles, sign-out, mobile navigation, axe audits, and unexpected console errors. It creates and deletes its own records.

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
├── content/      Public homepage copy and navigation
├── hooks/        useApiResource, useReducedMotion, useScrollReveal, useScrolled
├── pages/        public/, admin/, errors/
├── routes/       Route objects for public and admin areas
├── templates/    PublicLayout, AdminLayout
├── themes/       tokens.css
└── utils/        cn, metadata, dates, form payloads, error mapping
```

## Not implemented yet

- Backend-driven homepage content (projects/skills/experience from the API).
- `/about`, `/projects`, `/projects/:slug`, `/experience`, and `/contact` pages.
- Contact form with server-side validation.
- Admin modules for education, certifications, and contact messages.
- Homepage sections still read the static content module; the admin-managed records are not rendered there yet.
- Media uploads (image fields accept validated URLs).
- Pre-rendering of public routes for reliable link previews (`docs/06-frontend-architecture.md` §15).
