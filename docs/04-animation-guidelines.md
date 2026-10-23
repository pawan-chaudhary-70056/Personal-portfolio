# Animation Guidelines — Luxury Personal Portfolio

## 1. Purpose

This document defines the animation and motion standards for the Luxury Personal Portfolio and its administrative dashboard.

The objective is to create a polished, premium, and professional experience through subtle motion, smooth transitions, and meaningful interaction feedback.

Animations must support content hierarchy and usability rather than distract visitors. The website should feel refined and responsive, not overloaded with effects.

These guidelines apply to:

- Homepage and hero sections.
- Public page transitions.
- Section and text reveals.
- Project cards and interactive elements.
- Navigation and buttons.
- Forms, notifications, and dialogs.
- Admin dashboard interactions.
- Loading and feedback states.

## 2. Animation Philosophy

The portfolio follows a restrained, editorial approach to motion.

### Core principles

1. **Purposeful:** Every animation must communicate a change, establish hierarchy, or improve feedback.
2. **Subtle:** Motion should enhance the experience without becoming the main attraction.
3. **Fast:** Common interactions should feel immediate.
4. **Consistent:** Similar components should use similar motion patterns.
5. **Accessible:** Essential content and functionality must remain available when motion is reduced.
6. **Performant:** Prefer animations that do not trigger expensive layout recalculations.
7. **Predictable:** Motion should behave consistently across pages and devices.

The overall experience should resemble a refined digital publication rather than a flashy promotional website.

## 3. Motion Hierarchy

Different animation types serve different purposes.

| Category | Purpose | Priority |
|---|---|---|
| Hero entrance | Introduce the homepage | High |
| Text reveal | Establish editorial hierarchy | High |
| Section reveal | Guide the reading experience | Medium |
| Project hover | Provide interactive feedback | High |
| Button transitions | Clarify interaction states | High |
| Navigation transitions | Improve orientation | Medium |
| Page transitions | Maintain visual continuity | Optional |
| Decorative background motion | Add atmosphere | Low |
| Continuous animation | Rarely necessary | Avoid by default |

Animations should be selected based on the content and context, not applied automatically to every element.

## 4. Global Motion Tokens

All animation durations and easing functions should be centralized in reusable design tokens.

### 4.1 Duration scale

| Token | Duration | Typical use |
|---|---:|---|
| `motion-instant` | `100ms` | Immediate visual feedback |
| `motion-fast` | `150ms` | Buttons, icons, small controls |
| `motion-standard` | `250ms` | Cards, links, interface transitions |
| `motion-emphasis` | `400ms` | Section and content reveals |
| `motion-entrance` | `600ms` | Hero content entrance |
| `motion-editorial` | `800ms` | Selected headline or image reveals |

These values are starting points. Use shorter durations for frequent interactions and reserve longer durations for a small number of intentional entrance effects.

### 4.2 Easing functions

Recommended easing values:

```css
:root {
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-editorial: cubic-bezier(0.22, 1, 0.36, 1);
}
```

Usage:

- `--ease-standard`: General-purpose transitions.
- `--ease-enter`: Elements entering the visible interface.
- `--ease-exit`: Elements leaving the interface.
- `--ease-editorial`: Restrained, smooth entrance effects.

Avoid exaggerated elastic, bouncing, or spring-like effects unless a specific interaction genuinely benefits from them.

## 5. Homepage Hero Animation

The hero section establishes the portfolio's first impression and should receive particular attention.

### 5.1 Recommended sequence

The hero may reveal elements in this order:

1. Small introductory label.
2. Main headline.
3. Supporting description.
4. Primary and secondary actions.
5. Portrait, project visual, or decorative element if present.

Use a short, coordinated entrance sequence rather than making visitors wait for each element.

### 5.2 Recommended behavior

- Use a subtle opacity transition combined with a small upward movement.
- Keep movement restrained, typically around `8–20px`.
- Use staggered delays sparingly.
- Aim to complete the initial sequence within approximately `600–1000ms`.
- Keep the headline readable during loading.
- Ensure calls to action are immediately available and not blocked by animation.

The hero must not require a long preloader, intro screen, or animation sequence before visitors can interact with the page.

### 5.3 Example CSS

```css
@keyframes hero-enter {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-enter {
  animation: hero-enter 600ms var(--ease-editorial) both;
}
```

For staggered hero elements, use a small number of deliberate delay values rather than a separate animation for every word.

The final implementation must also include reduced-motion handling.

## 6. Typography and Text Reveals

Typography is a central part of the portfolio's luxury aesthetic.

### Recommended patterns

- Headline fade-in with a small vertical movement.
- Short line-by-line reveal for a selected hero headline.
- Subtle opacity transition for supporting text.
- Gentle emphasis transitions for selected metadata.

### Requirements

- Preserve readable text throughout the animation.
- Avoid excessive word-by-word or character-by-character effects.
- Avoid animated text that continuously changes content.
- Do not hide long paragraphs until they enter the viewport.
- Avoid clipping text when font sizes or viewport dimensions change.
- Ensure screen readers can access the complete text without depending on visual animation.

Line-by-line reveals should be used selectively. A simple fade-and-rise transition is usually more robust and accessible.

## 7. Scroll-Triggered Section Reveals

Scroll reveals can create a natural reading rhythm across long editorial pages.

### 7.1 Suitable elements

- Section headings.
- Project cards.
- Experience entries.
- Selected images.
- Short introductory blocks.

### 7.2 Recommended behavior

- Start with content visible or ensure it becomes visible immediately if animation initialization fails.
- Trigger the reveal when the element enters or approaches the viewport.
- Use small movement distances.
- Animate each group once by default.
- Keep animation delays short.
- Avoid making visitors scroll through hidden content.

A practical default is to begin the reveal when approximately `10–20%` of the element becomes visible.

### 7.3 Avoid

- Animating every paragraph independently.
- Large upward or sideways movements.
- Repeated animations every time the visitor scrolls up and down.
- Content that remains invisible when JavaScript fails.
- Scroll-linked effects that make reading difficult.
- Excessive staggered delays on large grids.

### 7.4 Implementation guidance

Use an efficient viewport-observation approach, such as the Intersection Observer API, when scroll-triggered behavior is required.

Prefer a shared reusable hook or animation utility rather than duplicating scroll-observation logic across components.

The implementation should clean up observers correctly and avoid unnecessary state updates.

## 8. Project Card Interactions

Project cards are among the most important interactive elements on the portfolio.

### Recommended effects

- A subtle image scale.
- A small title-color transition.
- A restrained border or background transition.
- A small arrow or link-indicator movement.
- A slight change in shadow where appropriate.

### Suggested limits

- Image scale: approximately `1.01–1.03`.
- Transition duration: approximately `180–300ms`.
- Movement: small enough to avoid shifting surrounding content.

### Requirements

- Keep project titles and descriptions readable.
- Do not rely on hover to expose essential information.
- Avoid large card lifts or aggressive zooming.
- Prevent animated images from overflowing their containers.
- Ensure keyboard users receive equivalent interaction feedback.
- Avoid layout shifts when cards enter the viewport.
- Disable or simplify hover-specific movement on touch-oriented devices where appropriate.

## 9. Buttons, Links, and Navigation

### Buttons

Buttons should provide immediate and predictable feedback.

Recommended states:

- Default.
- Hover.
- Keyboard focus.
- Pressed.
- Disabled.
- Loading.
- Success or error where relevant.

Use subtle changes in color, border, opacity, or position.

Avoid dramatic scaling or bouncing when a button is clicked.

### Links

Links may use a short color, underline, or indicator transition.

Ensure the link remains recognizable and does not depend on motion alone to communicate interactivity.

### Navigation

Navigation transitions should be restrained.

Suitable effects include:

- A short active-indicator transition.
- A subtle color change.
- A simple mobile-menu reveal.
- A modest dropdown entrance.

The mobile menu must not trap focus incorrectly, obscure necessary controls without a way to close it, or delay navigation.

## 10. Page Transitions

Page transitions are optional and should be introduced only if they improve the overall experience.

### Recommended approach

- Use a short opacity transition when appropriate.
- Avoid blocking navigation while animations finish.
- Preserve browser back and forward behavior.
- Respect reduced-motion settings.
- Ensure direct URL navigation works correctly.
- Avoid implementing complex transitions that interfere with routing or data loading.

A well-structured website with clear layouts and responsive interactions is more important than animated page changes.

## 11. Image and Media Motion

Images may use subtle transitions to improve presentation.

Suitable effects include:

- Gentle image entrance.
- Small hover-scale effect.
- A restrained transition between available image states.

Requirements:

- Reserve image dimensions to avoid layout shifts.
- Optimize image files.
- Do not animate large images unnecessarily.
- Avoid auto-playing video or sound.
- Do not use motion to conceal poor image loading.
- Provide appropriate alternative text.
- Keep project screenshots stable and readable.

## 12. Admin Dashboard Animations

The admin dashboard must prioritize clarity, speed, and efficient workflows.

### Suitable animations

- Sidebar expansion and collapse.
- Dropdown menus.
- Dialog entrance and exit.
- Toast notifications.
- Loading indicators.
- Button loading states.
- Small changes in active navigation.
- Table-row feedback where it helps communicate interaction.

### Requirements

- Keep most transitions around `100–250ms`.
- Do not animate entire tables unnecessarily.
- Avoid delaying form submission or saving.
- Never hide validation errors behind elaborate effects.
- Make confirmation dialogs accessible.
- Prevent repeated clicks while a critical operation is in progress where appropriate.
- Keep dashboard animations more restrained than homepage entrance effects.

Administrative functionality must remain usable if animations are disabled.

## 13. Loading, Success, and Error States

Motion can help communicate the status of an operation.

### Loading

- Use a small spinner or restrained progress indicator when appropriate.
- Prefer skeleton placeholders only when they improve perceived responsiveness.
- Avoid infinite loading animations when no operation is in progress.
- Provide meaningful feedback for longer operations.

### Success

- Use a brief confirmation message or toast.
- Do not depend on animation alone to communicate success.
- Announce important status changes accessibly when appropriate.

### Error

- Display a clear explanation and, where possible, a recovery action.
- Avoid shaking fields or using aggressive flashing effects.
- Keep error messages visible until they can reasonably be corrected or dismissed.

### Empty states

- Use a simple illustration or icon only if it adds value.
- Provide a useful explanation or next step.
- Avoid elaborate entrance animations for empty content.

## 14. Reduced Motion and Accessibility

The website must respect the operating system and browser `prefers-reduced-motion` setting.

When reduced motion is requested:

- Remove nonessential entrance animations.
- Disable large movement and parallax effects.
- Remove unnecessary staggered sequences.
- Avoid continuous decorative movement.
- Keep essential state feedback understandable.
- Preserve all content and functionality.
- Avoid long transitions that delay interaction.

### Example CSS

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is a broad fallback, not a replacement for thoughtful component-level motion design. Review components that rely on animation events, visibility changes, or JavaScript-controlled motion to ensure they still work correctly.

### Accessibility requirements

- Content must not depend on animation to become accessible.
- Keyboard focus must remain visible.
- Motion must not cause flashing or seizure risks.
- Auto-running animation must not interfere with reading.
- Status changes must be communicated through accessible text where appropriate.
- Screen readers must receive complete text, not fragmented animated content.

## 15. Performance Guidelines

Animation performance affects the perceived quality of the portfolio.

### Preferred properties

Where suitable, animate:

- `transform`
- `opacity`

These properties can often be animated efficiently by the browser.

### Use carefully

Avoid frequent animation of:

- `width`
- `height`
- `top`
- `left`
- `margin`
- `padding`
- Large `box-shadow` changes
- Expensive filters across large areas

These may trigger layout or painting work and should be profiled when used in motion effects.

### Additional requirements

- Avoid unnecessary animation libraries.
- Use CSS transitions for simple effects.
- Use JavaScript animation tools only when their capabilities are genuinely needed.
- Avoid adding permanent `will-change` declarations to many elements.
- Clean up event listeners and observers.
- Avoid excessive concurrent animations.
- Optimize images and fonts.
- Test on lower-powered devices as well as desktop hardware.

## 16. Recommended Implementation Strategy

Implement motion progressively rather than adding all effects at once.

### Phase 1 — Foundation

- Define motion tokens.
- Implement shared transition utilities.
- Add reduced-motion support.
- Establish consistent focus and interaction states.

### Phase 2 — Homepage

- Add hero entrance effects.
- Refine headline presentation.
- Add selected section reveals.
- Implement project-card interactions.

### Phase 3 — Public Pages

- Add subtle transitions to shared components.
- Apply scroll reveals only where useful.
- Verify content remains accessible during loading.

### Phase 4 — Admin Dashboard

- Add dialog and dropdown transitions.
- Refine button and notification feedback.
- Add loading states where needed.
- Keep data-heavy interfaces responsive.

### Phase 5 — Validation

- Test keyboard interactions.
- Test reduced-motion behavior.
- Inspect performance.
- Verify animations do not hide content.
- Remove effects that add complexity without measurable benefit.

## 17. Testing Requirements

Animation testing must include:

### Functional testing

- All buttons remain usable during transitions.
- Navigation works without waiting for animation completion.
- Dialogs open and close correctly.
- Form errors and success messages remain visible.
- Content remains available when animation scripts fail.

### Accessibility testing

- Reduced-motion preference is respected.
- Keyboard focus remains visible.
- Screen readers can access animated content.
- No essential information depends on hover.
- Motion does not create inaccessible interaction states.

### Performance testing

- No significant layout shifts are introduced.
- Scroll behavior remains smooth on supported devices.
- Large grids do not trigger excessive simultaneous animations.
- Image animations do not cause overflow.
- Performance remains acceptable with reduced CPU and network capabilities.

### Cross-device testing

- Desktop browsers.
- Tablet layouts.
- Mobile browsers.
- Touch interaction.
- Reduced-motion settings.
- Browser zoom and responsive text scaling.

## 18. Acceptance Criteria

The animation system is ready for release when:

1. The homepage uses restrained and coordinated entrance effects.
2. Section reveals are limited to content that benefits from them.
3. Project cards provide subtle and consistent feedback.
4. Buttons and links have appropriate interaction states.
5. The dashboard prioritizes immediate feedback and efficient operation.
6. Essential content remains visible and usable without animation.
7. Reduced-motion preferences are respected.
8. Animation behavior does not introduce significant layout shifts.
9. Animations do not block navigation or important actions.
10. Accessibility checks cover motion-related behavior.
11. Motion tokens and reusable utilities are documented.
12. Unnecessary or distracting animations have been removed.

## 19. Hero Portrait Interaction (Implemented)

- The portrait honours the existing hero entrance (600ms, `--ease-editorial`, small upward offset) and then settles. It is never part of a longer sequence.
- Pointer tilt: maximum rotation is `tiltIntensity / 100 × 10°` on each axis; the default 40 maps to 4°. Perspective is 1200px. Values are clamped and eased with a 300–500ms `--ease-standard` transition; there is no spring, bounce, or inertia.
- Translation follows the tilt: at most 8px on either axis, scaled by `animationIntensity`.
- Floating motion (optional): a 16px-maximum drift over 9–14 seconds, amplitude capped at 6px, gated by the `floating` setting. It pauses when the pointer is over the portrait.
- The effect is disabled entirely on coarse pointers (`(pointer: coarse)`), when the administrator disables it, when intensity is 0, and under `prefers-reduced-motion: reduce`. In those cases the portrait is a static image with no transform.
- No animation runs while the image is loading; the frame and fallback are static.
- The effect must not intercept pointer events beyond its own frame and must not move focus targets.

## 20. Related Documentation

- [`README.md`](../README.md) — Project overview and setup.
- [`01-project-overview.md`](./01-project-overview.md) — Project goals and scope.
- [`02-portfolio-requirements.md`](./02-portfolio-requirements.md) — Homepage and public page requirements.
- [`03-design-system.md`](./03-design-system.md) — Colors, typography, spacing, and reusable components.
- [`05-system-architecture.md`](./05-system-architecture.md) — Application architecture.
- [`06-frontend-architecture.md`](./06-frontend-architecture.md) — Frontend implementation structure.
- [`09-admin-dashboard.md`](./09-admin-dashboard.md) — Dashboard functionality.
- [`11-testing-and-qa.md`](./11-testing-and-qa.md) — Testing and quality assurance.
