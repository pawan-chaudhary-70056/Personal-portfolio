# Design System — Luxury Personal Portfolio

## 1. Purpose

This document defines the visual identity and interface design standards for the Luxury Personal Portfolio and its administrative dashboard.

The design system establishes a consistent set of colors, typography, spacing, layout rules, reusable components, interaction states, and responsive behavior.

Every public page and dashboard component should follow these guidelines to maintain a cohesive, premium, and professional experience.

The goal is not simply to make the website look luxurious. The interface must also remain readable, accessible, responsive, functional, and easy to maintain.

## 2. Design Vision

The portfolio follows a **modern luxury editorial design** direction inspired by premium digital publications, refined typography, architectural layouts, and minimalist interfaces.

The visual experience should communicate:

- Professionalism.
- Confidence.
- Precision.
- Technical competence.
- Sophistication.
- Attention to detail.

The interface should feel deliberately designed rather than assembled from a generic template.

### Core design principles

1. **Less, but better:** Every visual element must have a clear purpose.
2. **Typography first:** Strong typography establishes hierarchy and personality.
3. **Space creates luxury:** Generous whitespace improves focus and presentation.
4. **Contrast creates clarity:** Text and controls must remain easy to understand.
5. **Consistency builds trust:** Reusable tokens and components should behave predictably.
6. **Motion stays subtle:** Animation supports the interface rather than competing with content.
7. **Function comes first:** A premium appearance must never compromise usability or accessibility.

## 3. Brand Identity

### 3.1 Visual direction

| Property | Direction |
|---|---|
| Design style | Luxury minimalism |
| Visual influence | Editorial, architectural, premium digital experiences |
| Primary mood | Refined, confident, professional |
| Layout | Spacious, structured, asymmetrical where appropriate |
| Typography | Elegant serif headings and clean sans-serif body text |
| Accent treatment | Restrained champagne gold |
| Imagery | Authentic work, project screenshots, and purposeful visuals |
| Animation | Subtle, smooth, and intentional |
| Overall density | Low to moderate |

### 3.2 Brand consistency

The same visual language must be used across:

- Homepage.
- About page.
- Projects and project details.
- Experience and credentials.
- Contact page.
- Authentication screens.
- Admin dashboard.
- Forms, dialogs, notifications, and error states.

The dashboard may use a denser layout to support content management, but it must retain the portfolio's visual identity.

## 4. Color System

The color palette uses charcoal, ivory, and champagne gold as its foundational colors.

### 4.1 Core brand colors

<box gap={3}>
  <row align=start gap={3}>
    <box background="#111110" radius="lg" size="88px" border={{size:1,color:"#3B3B38"}} />
    <box flex="1" gap={1}>
      **Charcoal**

      <title size="md" color="#111110">`#111110`</title>
      <text color="secondary" size="sm">Primary dark background</text>
      Used for dark hero sections, dark page surfaces, premium visual blocks, and selected navigation elements.
    </box>
  </row>
  <divider color="subtle" />
  <row align=start gap={3}>
    <box background="#F4F0E8" radius="lg" size="88px" border={{size:1,color:"#D7D1C6"}} />
    <box flex="1" gap={1}>
      **Ivory**

      <title size="md">`#F4F0E8`</title>
      <text color="secondary" size="sm">Primary light background</text>
      Used for light page sections, content surfaces, and editorial layouts.
    </box>
  </row>
  <divider color="subtle" />
  <row align=start gap={3}>
    <box background="#C6AA78" radius="lg" size="88px" border={{size:1,color:"#A88B5C"}} />
    <box flex="1" gap={1}>
      **Champagne Gold**

      <title size="md">`#C6AA78`</title>
      <text color="secondary" size="sm">Brand accent</text>
      Used selectively for small highlights, decorative details, active indicators, and restrained emphasis.
    </box>
  </row>
</box>

### 4.2 Supporting neutral colors

| Token | Value | Purpose |
|---|---|---|
| `color-neutral-950` | `#111110` | Primary dark surface |
| `color-neutral-900` | `#1B1B19` | Elevated dark surface |
| `color-neutral-800` | `#292925` | Dark borders and separators |
| `color-neutral-700` | `#45443F` | Secondary dark details |
| `color-neutral-500` | `#858178` | Muted neutral elements |
| `color-neutral-300` | `#D5CFC4` | Light borders and separators |
| `color-neutral-200` | `#E5DFD4` | Subtle light surfaces |
| `color-neutral-100` | `#F4F0E8` | Primary light surface |
| `color-white` | `#FFFFFF` | Selected clean surfaces |

These values provide a starting palette. Their actual text/background combinations must be checked for sufficient contrast before use.

### 4.3 Semantic colors

Semantic colors communicate meaning and must remain consistent throughout the application.

| Purpose | Suggested color | Usage |
|---|---|---|
| Success | `#287A52` | Confirmed success |
| Warning | `#94651C` | Caution or non-critical warning |
| Error | `#B42318` | Validation and failure states |
| Information | `#245EA8` | Informational feedback |

Semantic colors should be adjusted for contrast on their intended backgrounds. Color must never be the only way to communicate a status; pair it with text or an appropriate icon.

### 4.4 Color usage rules

- Charcoal and ivory form the primary visual foundation.
- Champagne gold is an accent, not the dominant interface color.
- Use gold for selected details rather than large blocks of small text.
- Maintain strong foreground/background contrast.
- Do not introduce additional brand colors without a clear reason.
- Use semantic colors only for their intended meanings.
- Keep light and dark sections visually balanced.
- Avoid excessive gradients and glow effects.

### 4.5 Color contrast

Target WCAG 2.2 Level AA contrast requirements:

- Normal text: at least `4.5:1`.
- Large text: at least `3:1`.
- Meaningful interface boundaries and graphical controls: generally at least `3:1` against adjacent colors where the criterion applies.

The champagne gold color must not automatically be assumed suitable for small text on ivory or charcoal. Check each actual combination and select an accessible foreground color when necessary.

## 5. Typography System

Typography is one of the main elements responsible for the portfolio's premium appearance.

The system combines an elegant serif typeface for editorial emphasis with a clean sans-serif typeface for readability and interface controls.

### 5.1 Font roles

**Display and headings:** A refined serif font, such as `DM Serif Display`, `Cormorant Garamond`, or a comparable licensed and technically suitable typeface.

**Body and interface:** A clean sans-serif font, such as `Inter`, `Manrope`, or a comparable typeface.

Choose one heading family and one body family for the final implementation. Avoid mixing several decorative typefaces.

### 5.2 Font stacks

Example CSS font stacks:

```css
:root {
  --font-heading: "DM Serif Display", Georgia, serif;
  --font-body: "Inter", Arial, sans-serif;
}
```

The selected fonts should be loaded efficiently. Use suitable fallback fonts and avoid unnecessary font weights.

### 5.3 Type scale

| Token | Desktop size | Typical use |
|---|---:|---|
| `text-display` | `clamp(3rem, 7vw, 6.5rem)` | Hero headline |
| `text-h1` | `clamp(2.5rem, 5vw, 4.5rem)` | Main page heading |
| `text-h2` | `clamp(2rem, 3.5vw, 3.25rem)` | Major section headings |
| `text-h3` | `1.5rem–2rem` | Card and subsection headings |
| `text-h4` | `1.125rem–1.5rem` | Minor headings |
| `text-body-lg` | `1.125rem` | Introductory text |
| `text-body` | `1rem` | Standard body copy |
| `text-body-sm` | `0.875rem` | Supporting text |
| `text-caption` | `0.75rem–0.8125rem` | Metadata and captions |

These values are starting points. Actual sizes must be tested across mobile and desktop layouts.

### 5.4 Typography rules

- Use serif typography for large, expressive headlines.
- Use sans-serif typography for body text, forms, labels, and dashboard data.
- Maintain readable line lengths.
- Use generous line-height for paragraphs.
- Avoid excessive letter spacing in body copy.
- Use uppercase text selectively for short labels.
- Keep paragraphs concise and easy to scan.
- Do not use small, low-contrast text simply to make the interface look minimal.
- Avoid long blocks of italic text.

### 5.5 Line-height guidance

| Text type | Suggested line height |
|---|---:|
| Display headlines | `0.95–1.1` |
| Page headings | `1.05–1.2` |
| Section headings | `1.15–1.3` |
| Body paragraphs | `1.5–1.8` |
| Labels and buttons | `1.3–1.5` |

## 6. Spacing System

Consistent spacing makes the interface feel deliberate and professionally aligned.

Use a spacing scale based primarily on multiples of four pixels.

| Token | Value | Typical use |
|---|---:|---|
| `space-1` | `4px` | Small icon gaps |
| `space-2` | `8px` | Compact control spacing |
| `space-3` | `12px` | Label and field spacing |
| `space-4` | `16px` | Standard internal spacing |
| `space-5` | `20px` | Card content |
| `space-6` | `24px` | Related elements |
| `space-8` | `32px` | Component groups |
| `space-10` | `40px` | Larger component gaps |
| `space-12` | `48px` | Section subdivisions |
| `space-16` | `64px` | Section spacing |
| `space-20` | `80px` | Large content gaps |
| `space-24` | `96px` | Major editorial sections |

### Spacing rules

- Use larger vertical spacing between unrelated sections.
- Keep related content grouped together.
- Apply consistent padding to cards and forms.
- Avoid arbitrary spacing values throughout the codebase.
- Use responsive spacing for different screen sizes.
- Maintain sufficient space between interactive elements.
- Avoid excessive empty space that makes important content difficult to find.

## 7. Layout and Grid System

### 7.1 Container widths

Suggested layout tokens:

| Token | Value | Usage |
|---|---:|---|
| `container-reading` | `720px` | Long-form text |
| `container-content` | `1120px` | Standard page content |
| `container-wide` | `1280px` | Project grids and dashboards |
| `container-maximum` | `1440px` | Large-screen layout limit |

These values are guidelines rather than mandatory dimensions for every section.

### 7.2 Grid behavior

- Use CSS Grid for project collections and dashboard summaries.
- Use Flexbox for navigation, button groups, and simple alignments.
- Keep cards aligned and consistent.
- Allow grids to collapse naturally on smaller screens.
- Use asymmetrical editorial layouts selectively.
- Avoid unnecessary nested containers.
- Ensure that content does not stretch excessively on wide screens.

### 7.3 Section layout

Public pages should have clear visual separation between:

- Introduction.
- Main content.
- Supporting information.
- Calls to action.
- Footer.

Use backgrounds, whitespace, typography, and alignment to establish separation rather than placing borders around every section.

## 8. Border, Radius, and Shadow System

The visual identity should feel refined rather than excessively rounded or heavily elevated.

### 8.1 Border radius

| Token | Value | Usage |
|---|---:|---|
| `radius-none` | `0px` | Editorial panels and selected image treatments |
| `radius-sm` | `4px` | Small controls |
| `radius-md` | `8px` | Inputs and standard cards |
| `radius-lg` | `12px` | Larger cards and dialogs |
| `radius-full` | `9999px` | Pills and circular controls |

Prefer subtle corner radii for the public website. Use fully rounded controls selectively rather than applying the same pill shape everywhere.

### 8.2 Borders

- Use thin, subtle borders.
- Prefer neutral border colors.
- Use stronger borders for focus or meaningful separation.
- Avoid excessive boxed-in layouts.
- Ensure input boundaries remain visible on all backgrounds.

### 8.3 Shadows

Shadows should be restrained and purposeful.

Use them for:

- Dropdowns.
- Modals.
- Floating navigation where appropriate.
- Elevated interface elements that need separation.

Avoid strong shadows on every card. Whitespace and contrast should do most of the visual work.

## 9. Buttons and Links

### 9.1 Primary button

Used for the most important action in a section.

Examples:

- Explore Projects.
- Contact Me.
- Save Changes.

Requirements:

- Clear action label.
- Sufficient contrast.
- Consistent height and padding.
- Visible hover, focus, active, and disabled states.
- Clear feedback during asynchronous operations.

### 9.2 Secondary button

Used for supporting actions.

Examples:

- View Experience.
- Read More.
- Cancel.

The secondary button should remain visually distinct from the primary action without competing with it.

### 9.3 Text links

- Use descriptive link text.
- Provide a visible hover state.
- Maintain keyboard focus visibility.
- Do not rely on color alone to distinguish links when that would reduce clarity.
- Clearly identify external destinations when useful.

### 9.4 Button behavior

Buttons must not be decorative elements without functionality.

- Navigation should use links.
- Actions should use buttons.
- Destructive actions must be clearly identified.
- Disabled controls must have a meaningful reason.
- Loading buttons must prevent unintended duplicate submissions where appropriate.

## 10. Cards and Content Surfaces

### 10.1 Project cards

Project cards are major visual elements of the portfolio.

They should support:

- A project image or screenshot.
- Project title.
- Short description.
- Technology labels.
- Relevant action links.

Design requirements:

- Maintain consistent image proportions within the same grid.
- Use high-quality images.
- Avoid excessive borders and shadows.
- Apply subtle hover transitions.
- Keep important content visible without requiring hover.
- Handle missing images gracefully.
- Make interactive elements keyboard-accessible.

### 10.2 Experience and credential cards

Use a structured editorial layout or timeline when appropriate.

Requirements:

- Clear titles and dates.
- Consistent metadata placement.
- Readable descriptions.
- Logical ordering.
- Minimal decoration.

### 10.3 General cards

Reusable cards should share consistent padding, typography, border treatment, and responsive behavior.

Not every section needs to be displayed inside a card. Open layouts are often better suited to the portfolio's editorial design.

## 11. Form Design

Forms must be visually consistent and accessible.

Required elements:

- Visible labels.
- Inputs with consistent heights and padding.
- Clear required-field indicators where needed.
- Helpful validation messages.
- Visible focus states.
- Disabled and loading states.
- Clear success and error feedback.

### Form behavior rules

- Never use placeholder text as the only label.
- Explain how to correct validation errors.
- Keep error messages close to the relevant field.
- Preserve entered information after recoverable failures when appropriate.
- Prevent accidental repeated submissions where appropriate.
- Do not expose technical server errors to visitors.

The same form foundation should be used for public contact forms and administrative forms, with dashboard-specific density and controls where necessary.

## 12. Header and Footer

### Header

The header must:

- Reflect the portfolio's brand identity.
- Provide consistent navigation.
- Remain readable on dark and light backgrounds.
- Support responsive navigation.
- Display visible focus states.
- Avoid unnecessary decorative effects.

A transparent header may be used over a hero section when contrast remains sufficient.

### Footer

The footer should include relevant navigation, professional links, and a copyright notice.

Requirements:

- Use consistent spacing and typography.
- Keep secondary links organized.
- Ensure readable contrast.
- Avoid unnecessary columns or decorative elements.
- Adapt naturally to narrow screens.

## 13. Admin Dashboard Design

The admin dashboard uses the same design system with a stronger focus on clarity and productivity.

### 13.1 Layout

Suggested structure:

- Sidebar navigation on larger screens.
- Top navigation with page title and account actions.
- Main content area.
- Dashboard summary cards.
- Searchable and filterable data tables.
- Forms and confirmation dialogs.
- Toast notifications or inline feedback.

On smaller screens, the sidebar should collapse into an accessible mobile navigation pattern.

### 13.2 Dashboard colors

The dashboard may use charcoal navigation surfaces, ivory or neutral content surfaces, and restrained champagne-gold accents.

However:

- Table text must remain readable.
- Form fields must have visible boundaries.
- Status colors must remain semantically meaningful.
- Gold must not replace success, warning, or error colors.
- Data density must remain manageable.
- Decorative design must not reduce productivity.

### 13.3 Tables

Tables should support, where appropriate:

- Clear column headings.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Empty states.
- Loading states.
- Error states.
- Responsive overflow or an alternative mobile layout.

Important actions must not depend exclusively on hover.

### 13.4 Dashboard feedback

Use consistent patterns for:

- Successful saves.
- Validation failures.
- Network errors.
- Authentication expiry.
- Confirmation requests.
- Destructive actions.
- Empty results.

Destructive actions should require suitable confirmation. Prefer archive and restore workflows where permanent deletion is unnecessary.

## 14. Icons and Imagery

### Icons

- Use one consistent icon library.
- Keep stroke weight and size consistent.
- Use icons to improve recognition, not merely for decoration.
- Provide accessible labels for icon-only controls.
- Avoid mixing unrelated icon styles.

### Imagery

- Prefer authentic project screenshots and relevant visuals.
- Use consistent image aspect ratios within similar components.
- Optimize image dimensions and file sizes.
- Prevent image loading from causing layout shifts.
- Provide meaningful alternative text for informative images.
- Use empty alternative text for purely decorative images.
- Avoid fabricated project screenshots that misrepresent completed work.

## 15. Responsive Design Rules

The design system must work across mobile, tablet, laptop, and desktop devices.

### Mobile

- Stack content vertically where appropriate.
- Use readable typography and comfortable spacing.
- Keep interactive controls touch-friendly.
- Collapse navigation accessibly.
- Prevent horizontal overflow.
- Avoid oversized decorative elements that dominate the viewport.

### Tablet

- Use balanced two-column layouts when space permits.
- Maintain appropriate spacing.
- Keep project cards and content readable.

### Desktop

- Use wider editorial layouts and project grids.
- Maintain controlled line lengths.
- Use whitespace to improve hierarchy.
- Avoid spreading content across the entire screen unnecessarily.

### Responsive implementation

- Prefer fluid widths and CSS Grid/Flexbox.
- Use responsive typography such as `clamp()` where appropriate.
- Define project breakpoints consistently.
- Test actual content at different viewport widths.
- Do not rely on a fixed desktop layout.

Exact breakpoints should be centralized in the styling configuration and documented when implementation begins.

## 16. Interaction States

Every interactive component must have appropriate states.

| State | Requirement |
|---|---|
| Default | Clear, consistent appearance |
| Hover | Subtle visual feedback where applicable |
| Focus | Visible keyboard focus indicator |
| Active | Clear interaction feedback |
| Disabled | Visually distinct and non-interactive |
| Loading | Indicates that an operation is in progress |
| Success | Communicates confirmed completion |
| Error | Explains the issue and next step |
| Empty | Provides context when no data exists |

The design must not communicate important information using color alone.

## 17. Motion and Transition Styling

The design system supports restrained transitions for:

- Buttons and links.
- Navigation indicators.
- Project cards.
- Dropdowns and dialogs.
- Loading and feedback states.
- Content entrance effects.

Transitions should feel quick and natural. Long or continuous animations must be avoided unless they have a clear purpose.

Respect the user's reduced-motion preference. Essential content and functionality must remain available when animations are disabled.

Detailed animation durations, easing curves, entrance patterns, and scroll behavior belong in `04-animation-guidelines.md`.

## 18. Accessibility Standards

The design system targets WCAG 2.2 Level AA.

Requirements:

- Sufficient text contrast.
- Visible focus states.
- Keyboard-operable controls.
- Accessible labels.
- Appropriate heading hierarchy.
- Meaningful image alternatives.
- Clear validation feedback.
- Readable typography.
- Responsive layouts at zoomed browser settings.
- Reduced-motion support.
- Adequate spacing for interactive controls.

Accessibility must be considered when designing reusable components, not added only after the visual implementation is complete.

## 19. Design Tokens and CSS Architecture

Visual values should be centralized in design tokens to reduce duplication and maintain consistency.

Example foundational CSS:

```css
:root {
  /* Brand colors */
  --color-charcoal: #111110;
  --color-ivory: #f4f0e8;
  --color-champagne: #c6aa78;

  /* Surfaces */
  --color-surface-dark: #1b1b19;
  --color-border-dark: #45443f;
  --color-border-light: #d5cfc4;

  /* Typography */
  --font-heading: "DM Serif Display", Georgia, serif;
  --font-body: "Inter", Arial, sans-serif;

  /* Layout */
  --container-content: 70rem;
  --container-wide: 80rem;

  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  /* Motion */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
}
```

This snippet is an illustrative starting point. Final tokens should be reconciled with the selected fonts, Tailwind configuration, component library decisions, and accessibility checks.

### Token rules

- Do not scatter repeated brand values throughout components.
- Prefer semantic tokens for text, surfaces, borders, and states.
- Use consistent naming conventions.
- Keep design tokens independent of page-specific content.
- Avoid creating new tokens for one-off values unless there is a clear need.
- Document any deliberate exception.

## 20. Component Architecture

Reusable interface components should be created for repeated visual patterns.

Potential shared components include:

- `Container`
- `SectionHeading`
- `Button`
- `TextLink`
- `ProjectCard`
- `ExperienceItem`
- `CredentialCard`
- `Tag`
- `Input`
- `Textarea`
- `FormField`
- `Alert`
- `Toast`
- `Modal`
- `EmptyState`
- `LoadingState`
- `ErrorState`

The actual component list should reflect real reuse. Avoid building an unnecessarily complex component system for elements that appear only once and have no meaningful shared behavior.

Components must separate visual presentation from business logic where appropriate and support accessible behavior.

## 21. Design Quality Checklist

Before approving a page or component, verify the following:

- [ ] Uses the approved brand palette.
- [ ] Uses consistent typography.
- [ ] Follows the spacing system.
- [ ] Has a clear visual hierarchy.
- [ ] Maintains readable text contrast.
- [ ] Uses consistent component styling.
- [ ] Works at mobile, tablet, and desktop widths.
- [ ] Has appropriate hover, focus, active, and disabled states.
- [ ] Supports keyboard navigation where applicable.
- [ ] Respects reduced-motion preferences.
- [ ] Uses authentic and optimized imagery.
- [ ] Handles long text and missing optional content.
- [ ] Avoids unnecessary decoration.
- [ ] Meets applicable accessibility requirements.
- [ ] Does not compromise functionality for appearance.

## 22. Acceptance Criteria

The design system is ready for implementation when:

1. Brand colors and their intended uses are documented.
2. Typography families, roles, and scales are defined.
3. Spacing, containers, borders, and radii use consistent tokens.
4. Buttons, links, cards, and form elements follow reusable patterns.
5. Public pages share a coherent visual identity.
6. The dashboard remains visually consistent while prioritizing efficient workflows.
7. Responsive layout rules are documented.
8. Interaction states are specified.
9. Accessibility and contrast requirements are established.
10. Motion styling aligns with the animation guidelines.
11. Design tokens can be implemented consistently in the frontend.
12. Visual quality can be reviewed against a repeatable checklist.

## 23. Hero Portrait Frame (Implemented)

- Aspect ratio `4 / 5` on every breakpoint, with the frame never wider than `26rem`.
- Frame treatment: a 1px gold hairline at low opacity, a charcoal-to-charcoal-900 vertical gradient behind the image, and a soft offset shadow. No bright borders, no neon, no glassmorphism.
- The image fills the frame with `object-cover`; the visible focal area sits slightly above centre so a head-and-shoulders portrait is not cropped at the jaw.
- Fallback panel: same frame, centred serif monogram (up to two initials from the display name), caption-sized gold label “Portrait”. It must look intentional rather than like a broken image.
- Optional depth cue: a second hairline offset 12–18px down-right, at gold/25, to suggest layering without extra imagery.
- Caption/label typography uses `text-caption` with the standard `0.16em` tracking; body copy is never overlaid on the portrait.
- On light surfaces the frame uses `gold-ink`; the hero stays on the charcoal surface, where `gold` is safe.

## 24. Related Documentation

- [`README.md`](../README.md) — Project overview and setup.
- [`01-project-overview.md`](./01-project-overview.md) — Project scope and goals.
- [`02-portfolio-requirements.md`](./02-portfolio-requirements.md) — Homepage and public page requirements.
- [`04-animation-guidelines.md`](./04-animation-guidelines.md) — Animation behavior and motion standards.
- [`05-system-architecture.md`](./05-system-architecture.md) — System architecture.
- [`06-frontend-architecture.md`](./06-frontend-architecture.md) — Frontend structure and conventions.
- [`09-admin-dashboard.md`](./09-admin-dashboard.md) — Dashboard functionality and layout.
- [`10-security.md`](./10-security.md) — Application security requirements.
- [`11-testing-and-qa.md`](./11-testing-and-qa.md) — Testing and quality assurance.
