---
name: project-bootstrap
description: "AI-driven stack detection, context file enrichment, and project scaffolding. Use when initializing a new project or analyzing an existing codebase."
---

# Project Bootstrap

## Critical Rules

- **Detect before assuming** — always scan the project before making recommendations.
- **Enrich the context file** — add discovered stack info to the project's context.
- **Respect existing choices** — never override what's already configured.
- **Validate the environment** — check that required tools and versions are available.
- **Document discoveries** — record all detected tools, frameworks, and patterns.

## Stack Detection

Scan the project to detect the tech stack:

### Package Manager
| File | Manager |
|------|---------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` | bun |
| `package-lock.json` | npm |

### Framework
| Signal | Framework |
|--------|-----------|
| `next.config.*` | Next.js |
| `nuxt.config.*` | Nuxt |
| `astro.config.*` | Astro |
| `app.json` + `expo` in deps | Expo / React Native |
| `manifest.json` + `background` | Chrome Extension |

### Database / ORM
| Signal | Tool |
|--------|------|
| `prisma/schema.prisma` | Prisma |
| `drizzle.config.*` | Drizzle |
| `supabase/` directory | Supabase |

### Auth
| Signal | Solution |
|--------|----------|
| `better-auth` in deps | Better Auth |
| `@supabase/auth-helpers` in deps | Supabase Auth |
| `next-auth` in deps | NextAuth.js |

### Styling
| Signal | Tool |
|--------|------|
| `tailwind.config.*` | Tailwind CSS |
| `components.json` | shadcn/ui |

### Testing
| Signal | Tool |
|--------|------|
| `vitest.config.*` | Vitest |
| `playwright.config.*` | Playwright |
| `jest.config.*` | Jest |

## Context File Enrichment

After detection, add a `## Tech Stack` section to the context file:

```markdown
## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Better Auth
- **Testing**: Vitest + Playwright
- **Package Manager**: pnpm
```

## Project Scaffolding Checklist

When bootstrapping a new project:

- [ ] Detect or choose package manager
- [ ] Verify Node.js version (>= 20)
- [ ] Initialize framework with recommended defaults
- [ ] Configure TypeScript strict mode
- [ ] Set up linting (ESLint + Prettier or Biome)
- [ ] Configure path aliases (`@/` → `src/`)
- [ ] Set up environment variables (`.env.example`)
- [ ] Initialize git with `.gitignore`
- [ ] Create initial directory structure
- [ ] Generate context file with detected stack

## Directory Structure Template

```
src/
  app/              # Next.js App Router pages
  components/       # Shared UI components
  lib/              # Utilities, configs, helpers
  services/         # Business logic layer
  schemas/          # Zod validation schemas
  types/            # TypeScript type definitions
  actions/          # Server Actions
```

## Do

- Run detection before asking the user about their stack
- Add detected information to the context file automatically
- Verify that detected versions match minimum requirements
- Suggest missing tools (e.g., "No linter detected — recommend ESLint")

## Don't

- Don't override existing configuration files
- Don't assume a tool is absent just because you can't detect it
- Don't install dependencies without user confirmation
- Don't generate files that conflict with the existing project structure
