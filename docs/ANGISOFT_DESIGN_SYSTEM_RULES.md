# AngiSoft Design System Rules

These rules are the executable subset of `REVAMP_PLAN.md`. Every public, client-portal, and admin UI change must follow them.

## Brand

- Primary blue: `#0875FF`
- Cyan: `#00AFFF`
- Green: `#27D94B`
- Navy: `#07142B`
- Off-white: `#F5F7FA`
- Use blue as the default accent. Cyan and green are reserved for state, data, or deliberate highlights.
- Company colors must remain visible through action, link, focus, and key-highlight colors—not through decorative surfaces.

## Color and theme

- One primary accent per view.
- Headings stay neutral: navy in light mode, off-white in dark mode.
- Primary actions use solid brand blue. Secondary actions stay neutral.
- No decorative gradients, glows, blobs, or multicolor washes by default.
- A gradient is allowed only for a rare, deliberate hero or campaign moment and must be documented in `docs/DESIGN_PROVENANCE.md`.
- No squared/technical grid backgrounds.
- Light and dark themes must both be premium and accessible.
- Never rely on color alone for status; pair color with icon or text.
- Dark surfaces are elevated navy, never pure black.
- Light surfaces are white/off-white with subtle neutral borders.

## Typography

- Display: Sora.
- Body: DM Sans.
- Headings use `text-wrap: balance`.
- Body paragraphs use `text-wrap: pretty`.
- Numbers, dates, prices, and metrics use tabular numerals.
- Display line-height: `1.08`.
- Heading line-height: `1.12`.
- Body line-height: `1.65`.
- Avoid gradient text. Use neutral headings with a restrained accent only where it aids meaning.
- Sentence case for labels; avoid decorative all-caps eyebrows.

## Layout and spacing

- Homepage section padding: `clamp(2.75rem, 4vw, 4.5rem)`.
- Compact sections may use `clamp(2rem, 3vw, 3rem)`.
- Group with spacing before adding borders.
- Equivalent peer items share size, alignment, radius, and type treatment.
- Minimum interactive target: `44 × 44px`.
- Give images and videos an explicit `aspect-ratio`.
- Remove accidental vertical gaps; whitespace must clarify hierarchy, not make the page feel empty.

## Motion

- Motion explains a state change; it is not decoration.
- Use `transform` and `opacity` only.
- Interaction feedback is at or under `200ms`.
- Entrance motion starts near final scale, never from zero.
- Respect `prefers-reduced-motion`.
- Do not run looping animations when off-screen or when the document is hidden.
- Avoid large-surface backdrop blur.

## Components and states

- All loading states use `@angisoft/ui` `LoadingIndicator`.
- No visible “Loading…”, “Could not load…”, or “Not available…” copy.
- Empty/error states use `VisualState` or a content-shaped skeleton and offer one clear action.
- Forms use visible labels and inline field errors.
- Icon-only controls require `aria-label`.
- Confirm destructive actions.
- Content-shaped skeletons are preferred over generic page spinners.

## Media

- Media carries the story; text supports it.
- Use real product UI, project galleries, team/delivery photos, or purposeful backgrounds.
- Reserve media space with `aspect-ratio`.
- Lazy-load below-the-fold media.
- Use optimized modern formats where available.
- Respect captions and reduced-motion alternatives.

## Content

- Public business content comes from AngiSoft APIs or CDN-backed storage.
- No hardcoded marketing content in components.
- Outcome and proof lead; feature lists support.
- Avoid wordy documentation-style sections.
- The homepage must not over-index on a small set of product names. Speak to capabilities, industries, delivery, and outcomes.

## Provenance

Every new or substantially redesigned page/component must be recorded in `docs/DESIGN_PROVENANCE.md` with:

1. Inspiration source.
2. Structural or behavioral pattern borrowed.
3. AngiSoft-specific implementation.
4. Confirmation that no third-party code or assets were copied.
