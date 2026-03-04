---
name: nextjs-conventions
description: "Next.js 15+ / React 19 / TypeScript conventions for App Router, RSC, route groups, and file naming. Use when creating pages, components, layouts, or structuring a Next.js application."
---

# Next.js Conventions

## Critical Rules

- **RSC by default** — only add `"use client"` when strictly needed.
- **Functional over OOP** — pure functions, composition, immutability. Never class components.
- **kebab-case for all new files** — `user-profile.tsx`, `format-date.ts`.
- **Top-down design** — extract sub-functions/sub-components when >100 lines.
- **Never use `any`** — use `unknown` if the type is truly unknown.

## App Router

- Use the App Router (`src/app/`) exclusively. Never use the Pages Router.
- Every route segment should have a `page.tsx`. Use `layout.tsx` for shared UI.
- Use `loading.tsx` for Suspense boundaries and `error.tsx` for error boundaries.
- Use `not-found.tsx` for 404 pages at the appropriate route level.

## Route Groups

Organize routes by access level using route groups:

```
src/app/
  (public)/        # No auth required — landing, login, register
    login/
    register/
  (auth)/          # Auth required, any role — onboarding
    onboarding/
  (app)/           # Auth required, active user — main app
    dashboard/
    settings/
  admin/           # Admin only — user management, app settings
    users/
    settings/
```

- `(public)` routes are accessible without authentication.
- `(auth)` routes require a session but no specific role.
- `(app)` routes require an active, verified user.
- `admin` routes require admin role — not a route group so the URL reflects `/admin/`.

## Server vs Client Components

- **RSC by default**. Only add `"use client"` when strictly needed:
  - Event handlers (`onClick`, `onChange`, etc.)
  - React hooks (`useState`, `useEffect`, `useRef`, etc.)
  - Browser-only APIs (`window`, `localStorage`, etc.)
- Never import server-only modules in client components.
- Pass server data to client components via props, not by importing server functions.
- Wrap async data in `<Suspense>` boundaries for streaming and progressive rendering.

## Data Fetching

- Fetch data in Server Components using `async/await` directly.
- Use Server Actions (`"use server"`) for mutations. Define them in `src/actions/`.
- Always revalidate with `revalidatePath()` or `revalidateTag()` after mutations.
- Use `Suspense` boundaries for streaming and progressive rendering.

## File Naming

- **All new files: `kebab-case`** (e.g., `user-profile.tsx`, `format-date.ts`).
- Types: define in `src/types/` with `.ts` extension.
- Server Actions: `src/actions/{entity}.actions.ts`.
- Schemas: `src/schemas/{entity}.schema.ts`.

## TypeScript

- Enable `strict: true` in `tsconfig.json`.
- Prefer `interface` over `type` for object shapes.
- Never use `any`. Use `unknown` if the type is truly unknown.
- Use `satisfies` operator for type-safe object literals.

## Styling

- Use Tailwind CSS utility classes as the primary styling method.
- Use `cn()` from `@/lib/utils` to merge conditional classes.
- Avoid inline styles. Avoid CSS modules unless absolutely necessary.
- Follow mobile-first responsive design: base styles for mobile, `md:` and `lg:` for larger screens.

## Imports

- Use the `@/` path alias for all imports from `src/`.
- Group imports: React/Next.js first, then external libs, then internal modules.
- Prefer named exports over default exports (except for page/layout components).

## Performance

- Use `next/image` for all images with proper `width`, `height`, and `alt`.
- Use `next/link` for internal navigation. Never use `<a>` for internal links.
- Use `next/font` for font loading.
- Lazy load heavy client components with `dynamic()` from `next/dynamic`.

## Code Design

- **Functional over OOP** — pure functions, composition, immutability. Never use class components.
- **Top-down design** — if a function or component exceeds ~100 lines, extract sub-functions or sub-components.
- Prefer named exports over default exports (except for page/layout components).
- Group imports: React/Next.js first, then external libs, then internal modules.

## Do

- Keep Server Components as the default; push `"use client"` to the smallest leaf component that needs interactivity.
- Colocate `loading.tsx`, `error.tsx`, and `not-found.tsx` at every route segment that fetches data.
- Use `revalidatePath()` or `revalidateTag()` after every Server Action mutation to keep caches fresh.
- Wrap slow async data in `<Suspense>` boundaries so the rest of the page streams immediately.
- Prefer `next/image`, `next/link`, and `next/font` over raw HTML equivalents for automatic optimization.
- Use `satisfies` on config objects and route params to get type checking without widening.
- Place shared types in `src/types/` and shared utils in `src/lib/` to avoid circular imports.
- Validate environment variables at build time with `zod` in a single `src/env.ts` file.

## Don't

- Don't add `"use client"` to a file just because a child component needs it; pass server data as props instead.
- Don't fetch data in Client Components when it can be done in a parent Server Component.
- Don't use `useEffect` for data fetching; rely on Server Components or Server Actions.
- Don't import server-only code (`db`, `fs`, secrets) in any file that has `"use client"`.
- Don't nest route groups more than two levels deep; it makes the URL structure hard to reason about.
- Don't use `<a>` tags for internal navigation; always use `next/link`.
- Don't use CSS modules or `styled-components` alongside Tailwind; pick one system.
- Don't skip `alt` text on `next/image`; it is required for accessibility and build will warn.
- Don't use `any`; use `unknown` and narrow with type guards.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **God Client Component** | Marking an entire page `"use client"` to use one `onClick` handler, losing all RSC benefits. | Extract only the interactive piece into a small Client Component; keep the page as RSC. |
| **useEffect Data Fetching** | Fetching data in `useEffect` causes waterfalls, loading flicker, and duplicates server work. | Fetch in a Server Component with `async/await` and pass data as props. |
| **Prop Drilling Contexts** | Creating a React Context just to pass server data through three levels. | Pass props directly or restructure with composition (`children` pattern). |
| **Wildcard Revalidation** | Calling `revalidatePath("/")` after every mutation, busting the entire cache. | Use `revalidatePath("/specific/path")` or `revalidateTag("tag")` for surgical invalidation. |
| **Barrel Files** | Re-exporting everything from `index.ts` barrels, which breaks tree-shaking and slows builds. | Import directly from the source file: `@/components/button` not `@/components`. |
| **Mixing Routers** | Using Pages Router (`pages/`) alongside App Router (`app/`), causing confusing routing conflicts. | Use App Router exclusively; migrate any remaining Pages Router routes. |
| **Raw `<img>` Tags** | Using `<img>` instead of `next/image`, missing automatic optimization, lazy loading, and sizing. | Replace with `<Image>` from `next/image` and provide `width`, `height`, and `alt`. |
