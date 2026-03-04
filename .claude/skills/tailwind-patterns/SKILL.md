---
name: tailwind-patterns
description: "Tailwind CSS utility conventions, responsive design, and component styling. Use when styling components, implementing responsive layouts, or applying consistent spacing and typography."
---

# Tailwind CSS Patterns

## Critical Rules

- **Utility-first** — use utility classes directly in JSX, avoid `@apply`.
- **Mobile-first** — base styles for mobile, then `sm:`, `md:`, `lg:`, `xl:`.
- **Semantic color tokens** — use `bg-background`, `text-foreground`, never hardcode hex.
- **Progressive padding** — `px-0 sm:px-2 md:px-4 lg:px-6` grows with viewport.
- **Use `cn()`** — from `@/lib/utils` for conditional and merged classes.

## Utility-First Approach

- Always use utility classes directly in JSX. Avoid `@apply` except in global base styles.
- Use `cn()` helper for conditional and merged classes:
  ```tsx
  className={cn("base-classes", condition && "conditional-classes", className)}
  ```

## Spacing & Layout

- Use consistent spacing scale: `gap-2` (8px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).
- Prefer `flex` and `grid` for layout. Avoid absolute positioning except for overlays.
- Use `container mx-auto px-4` for page-level content width.
- Standard page padding: `p-6` for main content areas.

## Responsive Design

- Mobile-first: write base styles for mobile, add `sm:`, `md:`, `lg:`, `xl:` for larger screens.
- Common breakpoints:
  - `sm:` (640px) — small tablets
  - `md:` (768px) — tablets
  - `lg:` (1024px) — laptops
  - `xl:` (1280px) — desktops
- Grid responsive pattern: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Progressive padding**: `px-0 sm:px-2 md:px-4 lg:px-6` — spacing grows with viewport.
- **Cards border adaptatif**: `border-0 sm:border` — no border on mobile, border on larger screens.
- **Table columns by breakpoint**: hide non-essential columns on small screens with `hidden sm:table-cell`, `hidden md:table-cell`, `hidden lg:table-cell`.

## Typography

- Headings: `text-3xl font-bold tracking-tight` (h1), `text-2xl font-semibold` (h2), `text-lg font-semibold` (h3)
- Body text: `text-sm` or `text-base`
- Muted text: `text-muted-foreground`
- Truncation: `truncate` or `line-clamp-2`

## Colors & Theming

- Always use CSS variable-based colors from the design system: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, etc.
- Never hardcode hex colors. Use the semantic tokens.
- For dark mode, rely on the `dark:` variant only when CSS variables don't handle it.

## Interactive States

- Hover: `hover:bg-accent` or `hover:bg-accent/50`
- Focus: handled by ShadCN defaults via `outline-ring/50`
- Transitions: `transition-colors` for color changes, `transition-all` sparingly
- Disabled: `disabled:opacity-50 disabled:pointer-events-none`

## Component Patterns

- Card: use ShadCN `Card` components. Add `hover:bg-accent/50 transition-colors` for clickable cards.
- Forms: stack fields with `space-y-4`, use `grid gap-4 md:grid-cols-2` for side-by-side fields.
- Buttons: use ShadCN `Button` with appropriate `variant` and `size`.
- Badges: use ShadCN `Badge` with `variant="secondary"` for tags, `variant="outline"` for less emphasis.

## Do

- Use `cn()` for every conditional or merged class — keep logic readable.
- Apply responsive prefixes in ascending order: base, `sm:`, `md:`, `lg:`, `xl:`.
- Use semantic color tokens (`bg-primary`, `text-muted-foreground`) for theme compatibility.
- Stick to the spacing scale (`gap-2`, `gap-4`, `gap-6`, `gap-8`) — avoid arbitrary values.
- Use `flex` and `grid` for all layout — they cover virtually every case.
- Add `transition-colors` to interactive elements for smooth hover/focus feedback.
- Use `truncate` or `line-clamp-*` to prevent text overflow in constrained layouts.
- Test responsive designs at 375px, 768px, 1024px, and 1440px.

## Don't

- Don't use `@apply` in component files — keep utilities in JSX.
- Don't hardcode hex or RGB colors — always use design system tokens.
- Don't use `h-screen` — use `h-dvh` or `min-h-dvh` for correct mobile viewport.
- Don't skip mobile-first — never write desktop styles as the base.
- Don't use arbitrary values (`w-[347px]`) when a scale value (`w-full`, `max-w-sm`) works.
- Don't nest Tailwind classes inside ternaries without `cn()` — it causes merge conflicts.
- Don't use `absolute` positioning for layout — reserve it for overlays and decorations.
- Don't add `!important` via `!` prefix — fix specificity issues at the source.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **`@apply` everywhere** | Defeats utility-first approach, hides styles from JSX | Use utility classes directly in JSX |
| **Hardcoded hex colors** | Breaks theming and dark mode | Use semantic tokens: `bg-primary`, `text-foreground` |
| **Desktop-first breakpoints** | Styles break on mobile, requires overrides | Write base styles for mobile, add `sm:`, `md:`, `lg:` |
| **`className={condition ? "a b c" : "a b d"}`** | Duplicated classes, hard to maintain | Use `cn("a b", condition ? "c" : "d")` |
| **`z-[9999]`** | Z-index wars, unpredictable stacking | Use a fixed scale: `z-10`, `z-20`, `z-30`, `z-50` |
| **`w-[calc(100%-32px)]`** | Fragile, breaks at other sizes | Use `w-full px-4` or proper flex/grid layout |
| **Missing responsive classes** | UI breaks on smaller screens | Always test and add `sm:`, `md:` variants as needed |
| **`style={{ }}` inline styles** | Bypasses Tailwind, inconsistent with system | Use Tailwind utilities or CSS variables |
