---
name: ui-ux-guidelines
description: "UI/UX design rules for accessibility, interaction, typography, color, and animation. Use when building user-facing interfaces, reviewing designs, checking accessibility compliance, or choosing fonts and color palettes."
---

# UI/UX Design Guidelines

Comprehensive design guide covering accessibility, interaction, layout, typography, color, and animation — prioritized by impact.

## Critical Rules

- **Color contrast**: minimum 4.5:1 for normal text, 3:1 for large text.
- **Touch targets**: minimum 44x44px on mobile.
- **No `h-screen`** — use `h-dvh` for correct mobile viewport.
- **No animation unless requested** — respect `prefers-reduced-motion`.
- **Empty states must have one clear next action** — never blank screens.
- **All icon-only buttons must have `aria-label`**.

## Priority 1 — Accessibility (CRITICAL)

- **Color is not enough**: never convey information by color alone — add icons or text.
- **Alt text**: descriptive alt for all meaningful images. Use `alt=""` only for decorative images.
- **Heading hierarchy**: sequential h1 → h2 → h3, one `<h1>` per page.
- **Keyboard navigation**: tab order matches visual order, no keyboard traps.
- **Focus states**: visible focus rings on all interactive elements — never `outline-none` without replacement.
- **Form labels**: every input must have a visible `<label>` — placeholder alone is never enough.
- **Error announcements**: use `aria-live="polite"` or `role="alert"` for dynamic errors.
- **Skip links**: provide "Skip to main content" on navigation-heavy pages.
- **Motion sensitivity**: always respect `prefers-reduced-motion` — disable parallax and scroll-jacking.

## Priority 2 — Touch & Interaction (CRITICAL)

- **Touch spacing**: minimum 8px gap between adjacent touch targets.
- **Hover vs tap**: never rely on hover for primary interactions — use click/tap.
- **Cursor pointer**: add `cursor-pointer` to all clickable elements.
- **Focus states**: `focus:ring-2 focus:ring-primary` on interactive elements.
- **Hover states**: `hover:bg-accent cursor-pointer` for visual feedback.
- **Active states**: `active:scale-95` for press feedback.
- **Disabled states**: `opacity-50 cursor-not-allowed pointer-events-none`.
- **Loading buttons**: disable button and show spinner during async actions — prevent double submission.
- **Error feedback**: show clear error message near the problem — never silent failures.
- **Success feedback**: always confirm completed actions with toast or visual change.
- **Confirmation dialogs**: require confirmation before any destructive/irreversible action.

## Priority 3 — Layout & Responsive (HIGH)

- **Mobile first**: base styles for mobile, `md:` and `lg:` for larger screens.
- **Viewport**: always set `<meta name="viewport" content="width=device-width, initial-scale=1">`.
- **No horizontal scroll**: ensure all content fits viewport — `max-w-full overflow-x-hidden`.
- **Viewport units**: use `min-h-dvh` not `h-screen` — mobile browser chrome breaks `100vh`.
- **Container width**: limit text to 65-75 characters per line — `max-w-prose`.
- **Content jumping**: reserve space for async content — use `aspect-ratio` or fixed dimensions.
- **Z-index scale**: use a fixed scale (10, 20, 30, 50) — never `z-[9999]`.
- **Fixed elements**: account for safe areas, never stack multiple fixed elements carelessly.
- **Breakpoint testing**: always test at 375px, 768px, 1024px, 1440px.
- **Image scaling**: `max-w-full h-auto` on all images.
- **Table handling**: wrap tables in `overflow-x-auto` for mobile.

## Priority 4 — Typography (MEDIUM)

- **Body font size**: minimum 16px (`text-base`) on mobile — never `text-xs` for body.
- **Line height**: 1.5–1.75 for body text — `leading-relaxed`.
- **Line length**: 65-75 characters max — `max-w-prose` or `max-w-3xl`.
- **Heading hierarchy**: clear size/weight difference from body text.
- **Font loading**: use `font-display: swap` with similar fallback to prevent layout shift.
- **Numeric data**: use `tabular-nums` for aligned numbers in tables and dashboards.
- **Text wrapping**: use `text-balance` for headings, `text-pretty` for paragraphs.
- **Truncation**: `truncate` or `line-clamp-2` with expand option for long content.

### Recommended Font Pairings

| Style | Heading | Body | Best For |
|-------|---------|------|----------|
| Modern Professional | Poppins | Open Sans | SaaS, corporate, startups |
| Tech Startup | Space Grotesk | DM Sans | Tech, developer tools, AI |
| Minimal Swiss | Inter | Inter | Dashboards, admin panels, docs |
| Friendly SaaS | Plus Jakarta Sans | Plus Jakarta Sans | Web apps, productivity tools |
| Classic Elegant | Playfair Display | Inter | Luxury, fashion, editorial |
| Bold Statement | Bebas Neue | Source Sans 3 | Marketing, portfolios, agencies |
| Developer Mono | JetBrains Mono | IBM Plex Sans | Dev tools, documentation, CLI |
| Playful Creative | Fredoka | Nunito | Children's apps, gaming, education |
| Corporate Trust | Lexend | Source Sans 3 | Enterprise, government, healthcare |

## Priority 5 — Color Palettes by Product Type (MEDIUM)

| Product | Primary | CTA | Background | Text |
|---------|---------|-----|------------|------|
| SaaS (General) | `#2563EB` blue | `#F97316` orange | `#F8FAFC` | `#1E293B` |
| Micro SaaS | `#6366F1` indigo | `#10B981` emerald | `#F5F3FF` | `#1E1B4B` |
| E-commerce | `#059669` green | `#F97316` orange | `#ECFDF5` | `#064E3B` |
| E-commerce Luxury | `#1C1917` black | `#CA8A04` gold | `#FAFAF9` | `#0C0A09` |
| Landing Page | `#0EA5E9` sky | `#F97316` orange | `#F0F9FF` | `#0C4A6E` |
| Financial Dashboard | `#0F172A` navy | `#22C55E` green | `#020617` | `#F8FAFC` |
| Healthcare | `#0891B2` cyan | `#059669` green | `#ECFEFF` | `#164E63` |
| Education | `#4F46E5` indigo | `#F97316` orange | `#EEF2FF` | `#1E1B4B` |
| Creative Agency | `#EC4899` pink | `#06B6D4` cyan | `#FDF2F8` | `#831843` |
| Portfolio | `#18181B` zinc | `#2563EB` blue | `#FAFAFA` | `#09090B` |
| AI / Chatbot | `#7C3AED` purple | `#06B6D4` cyan | `#FAF5FF` | `#1E1B4B` |
| Productivity | `#0D9488` teal | `#F97316` orange | `#F0FDFA` | `#134E4A` |

> Use these as starting points. Always map to your design system's semantic tokens (`bg-primary`, `text-foreground`, etc.) rather than hardcoding hex values.

## Priority 6 — Animation (MEDIUM)

- **Only when needed**: never add animation unless explicitly requested.
- **Timing**: 150-300ms for micro-interactions — never exceed 500ms for UI.
- **Performance**: animate only `transform` and `opacity` — never `width`, `height`, `top`, `left`, `margin`, `padding`.
- **Easing**: `ease-out` for entering, `ease-in` for exiting — never `linear` for UI.
- **Continuous animation**: only for loading indicators — never for decorative elements.
- **Reduced motion**: always check `prefers-reduced-motion` and disable non-essential animation.
- **Maximum scope**: animate 1-2 key elements per view — never everything.
- **No layout shift**: hover states must not cause layout shift — use `transform` not size changes.

## Priority 7 — Forms (MEDIUM)

- **Labels**: always visible above or beside input — never placeholder-only.
- **Error placement**: show error directly below the related input, not at form top.
- **Inline validation**: validate on blur for most fields, not only on submit.
- **Input types**: use `email`, `tel`, `number`, `url` — not `text` for everything.
- **Autofill**: use `autocomplete` attribute properly — never `autocomplete="off"` everywhere.
- **Required fields**: mark clearly with asterisk `*` or "(required)" text.
- **Password visibility**: always provide a show/hide toggle.
- **Mobile keyboards**: use `inputmode="numeric"` for number-only inputs.
- **Submit feedback**: show loading state → success/error — never no feedback.

## Priority 8 — Feedback & Empty States (LOW-MEDIUM)

- **Loading indicators**: show spinner/skeleton for operations > 300ms — never frozen UI.
- **Empty states**: show helpful message + one clear action — never blank screen.
- **Error recovery**: provide clear next steps — "Try again" button + help link.
- **Progress indicators**: show "Step 2 of 4" for multi-step processes.
- **Toast notifications**: auto-dismiss after 3-5 seconds — never persistent.
- **Truncation**: handle long content gracefully with `line-clamp` + expand.
- **No results**: show suggestions when search yields nothing — never just "0 results".

## Do

- Meet WCAG 2.1 AA contrast ratios: 4.5:1 for normal text, 3:1 for large text.
- Make all touch targets at least 44x44px with 8px minimum spacing between them.
- Use `h-dvh` or `min-h-dvh` instead of `h-screen` for correct mobile viewport behavior.
- Provide visible `<label>` for every form input — never rely on placeholder text alone.
- Use `aria-label` on every icon-only button.
- Show loading indicators (spinner or skeleton) for operations exceeding 300ms.
- Include one clear call-to-action in every empty state.
- Reserve `AlertDialog` for destructive or irreversible actions.
- Use `tabular-nums` for numeric data in tables and dashboards.
- Respect `prefers-reduced-motion` — disable parallax, auto-play, and scroll-jacking.

## Don't

- Don't convey information by color alone — always add an icon or text label.
- Don't use `outline-none` without providing an alternative visible focus indicator.
- Don't rely on hover for primary interactions — mobile users cannot hover.
- Don't add animation unless explicitly requested by the user or spec.
- Don't use `linear` easing for UI transitions — use `ease-out` for enters, `ease-in` for exits.
- Don't animate `width`, `height`, `margin`, or `padding` — use `transform` and `opacity`.
- Don't use `z-[9999]` — follow a fixed z-index scale (10, 20, 30, 50).
- Don't show validation errors only on submit — validate on blur for better UX.
- Don't auto-dismiss toasts for error messages — only auto-dismiss success toasts.
- Don't use `text-xs` for body text on mobile — minimum `text-base` (16px).

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Color-only status indicators** | Inaccessible for colorblind users | Add icon or text label alongside color |
| **`h-screen` for full-height layouts** | Broken on mobile (browser chrome overlaps content) | Use `min-h-dvh` or `h-dvh` |
| **Placeholder as label** | Disappears on focus, fails accessibility audits | Use visible `<label>` above or beside input |
| **Hover-dependent interactions** | Non-functional on touch devices | Make all interactions work via click/tap |
| **Silent form failures** | User has no idea what went wrong | Show inline error near the problem field |
| **Blank empty states** | User is confused, no path forward | Show message + one clear action button |
| **Animating layout properties** | Jank and repaints, poor performance | Animate only `transform` and `opacity` |
| **No loading feedback** | UI appears frozen during async operations | Show spinner/skeleton after 300ms threshold |
| **`z-[9999]` stacking** | Z-index wars, unpredictable layering | Use a fixed scale: `z-10`, `z-20`, `z-30`, `z-50` |
| **Missing `aria-label` on icon buttons** | Screen readers announce nothing useful | Add descriptive `aria-label` to every icon-only button |

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emoji icons — use Lucide, Heroicons, or SF Symbols (SVG)
- [ ] Consistent icon set throughout the interface
- [ ] Hover states without layout shift
- [ ] Semantic color tokens used (not hardcoded hex)
- [ ] No purple/multicolor gradients unless explicitly requested
- [ ] No glow effects as primary affordances
- [ ] Empty states have one clear next action

### Interaction
- [ ] All clickable elements have `cursor-pointer`
- [ ] Clear visual hover feedback on interactive elements
- [ ] Smooth transitions (150-300ms)
- [ ] Visible keyboard focus states
- [ ] Destructive actions require `AlertDialog` confirmation
- [ ] Loading buttons disabled during async actions

### Light/Dark Mode
- [ ] Light text contrast: 4.5:1 minimum
- [ ] Borders visible in both modes
- [ ] Test both themes before delivery

### Layout
- [ ] No content hidden behind fixed navbars
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No horizontal scroll on mobile
- [ ] `min-h-dvh` used instead of `h-screen`
- [ ] `safe-area-inset` respected for fixed elements

### Accessibility
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Color is not the sole indicator of state
- [ ] `prefers-reduced-motion` respected
- [ ] Icon-only buttons have `aria-label`
- [ ] Skip link present on nav-heavy pages

### Performance
- [ ] Images optimized (WebP/AVIF, `srcset`, lazy loading)
- [ ] No `will-change` outside active animations
- [ ] No large `blur()` or `backdrop-filter` surfaces animated
- [ ] No `useEffect` for what can be render logic
