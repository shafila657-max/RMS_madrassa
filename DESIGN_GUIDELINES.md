# RMS Madrasa Frontend Guidelines

This document is the reference for design, structure, and implementation decisions in this app. Keep changes aligned with it so the UI stays consistent across contributors.

## Product Shape

- This is a mobile-first education platform with separate experiences for `admin`, `teacher`, `parent`, and `student`.
- The app should feel polished, calm, and practical.
- Prefer clear hierarchy over decorative complexity.
- Keep the product usable on both desktop and mobile, but design for mobile first.

## Visual Language

- Preserve the existing theme unless a screen explicitly needs a new layout system.
- Use soft rounded corners, subtle shadows, and spacing that makes the UI feel layered.
- Keep backgrounds clean and readable.
- Use contrast to create hierarchy, not random color changes.
- Avoid introducing new accent colors unless they are part of a deliberate redesign.

## Color Theme

- Primary color: `emerald` tones for the main brand actions, active states, success states, and primary navigation highlights.
- Secondary color: `amber` tones for ranks, leaderboard emphasis, awards, and callout moments.
- Support colors:
  - `sky` for informational emphasis
  - `rose` or `red` for warnings and destructive states
  - `slate` and `stone` for text, borders, cards, and neutral backgrounds
- Backgrounds:
  - use light neutral gradients or soft tinted surfaces for general screens
  - use deep slate/emerald backgrounds only for special showcase sections
- State usage:
  - primary buttons and active pills should use the primary emerald family
  - badges and highlights should use the most fitting semantic color, not decoration-only color changes
  - keep text on colored backgrounds readable with strong contrast
- Avoid:
  - random purple/blue replacement themes
  - using too many saturated colors in one screen
  - mixing competing accent colors in the same hierarchy level

## Layout Rules

- Use full-width mobile sections with safe-area padding where appropriate.
- Important page areas should usually follow this structure:
  - header
  - primary content
  - floating/stacked secondary panel
  - bottom navigation if the role uses one
- When a screen has a “sheet over background” effect, the top section should visually sit behind the card.
- If two sections are meant to feel connected, overlap them slightly instead of separating them with a hard gap.

## Typography Rules

- Page titles should be the largest and boldest text on the screen.
- Scores, totals, and rank numbers should be highly scannable.
- Secondary details like handles, labels, and helper text must stay muted.
- Avoid using too many font sizes in one view.

## Leaderboard Rules

- The leaderboard must always preserve a clear rank hierarchy.
- Top 3 use a podium layout:
  - rank 1 in the center
  - rank 2 on the left
  - rank 3 on the right
  - rank 1 is tallest
  - rank 2 and rank 3 are shorter and visually balanced
- Podium avatars are circular.
- Ranked list avatars are rounded-square.
- Top-3 badges are circular pin-style badges overlapping the avatar bottom edge.
- Ranked list badges are star-shaped rank icons.
- The list below the podium must be a single sheet/card with row dividers, not separate cards per row.
- Keep the podium and list visually connected as one screen, not two unrelated blocks.

## Component Rules

- Reuse shared components when the same pattern appears in more than one place.
- Prefer a single canonical component for shared screens like the leaderboard.
- If a component needs to support multiple contexts, add a prop for variant behavior instead of copying the component.
- Do not keep old or hidden duplicate UI blocks after a redesign.

## Navigation Rules

- Bottom navigation should only contain the role-specific primary actions.
- Secondary pages should move into settings, drawers, or nested panels instead of crowding the bottom bar.
- If a section is moved into settings, keep the subsection list easy to scan and tap.

## Data and Security Rules

- Never trust client-side state for permissions.
- Auth and profile access must be derived from the active Supabase session and server data.
- Do not reintroduce cached-profile shortcuts that bypass access checks.
- If a UI action depends on role or approval state, enforce that rule in the backend as well.

## Form and Upload Rules

- File uploads should be optional unless the business rule requires otherwise.
- Prefer direct upload flows over raw URL input when the user is expected to provide images.
- Show a preview before saving when possible.
- Keep destructive actions separate and explicit.

## Mobile UX Rules

- Buttons should be large enough to tap comfortably.
- Prevent text wrapping that makes common actions feel awkward.
- Keep bottom navs, sheets, and modals usable on small screens.
- Use row spacing and card padding that works on narrow devices before tuning for desktop.

## Code Style Rules

- Use React function components and hooks.
- Keep shared logic in `src/utils` or `src/components`, not duplicated inside pages.
- Prefer `apply_patch` for edits when working in this repo.
- Keep changes small and reviewable.
- Do not delete user work unless explicitly asked.

## Before Pushing

- Run the production build.
- Check for broken layout, syntax, or obvious spacing regressions.
- If you changed a shared component, verify every screen that uses it.
- Keep commits focused on one product change when possible.

## Collaboration Notes

- If you are adding a new screen or major UI refactor, update this file if the visual rules change.
- If a design pattern becomes repeated, promote it to a shared component.
- When in doubt, preserve consistency with the rest of the app rather than introducing a new style.
