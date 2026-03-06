---
name: env-validation
description: "Environment variable validation with Zod schemas and type-safe access. Use when configuring environment variables, adding new secrets, or setting up project configuration."
---

# Environment Variable Validation

## Critical Rules

- **Validate at startup** — crash early if env vars are missing/invalid.
- **Single source of truth** — `src/env.ts` is the only place to access env vars.
- **Never use `process.env` directly** — always import from `@/env`.
- **Type-safe prefixes** — validate format (e.g., `startsWith("sk_")` for Stripe keys).
- **Maintain `.env.example`** — document all required variables without values.
- **Never commit secrets** — `.env.local` and `.env.production` are gitignored.

## Schema Definition

Validate all environment variables at startup with a Zod schema:

```ts
// src/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // Email
  RESEND_API_KEY: z.string().startsWith("re_"),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
```

## Usage

Always import from `@/env` — never access `process.env` directly:

```ts
// Good
import { env } from "@/env";
const db = drizzle(env.DATABASE_URL);

// Bad — unvalidated, untyped
const db = drizzle(process.env.DATABASE_URL!);
```

## Client-Side Variables

Only `NEXT_PUBLIC_` prefixed variables are available in the browser:

```ts
// src/env.ts
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  RESEND_API_KEY: z.string().startsWith("re_"),
  // ...server-only vars
});

// Merge for full validation
const envSchema = serverSchema.merge(clientSchema);

export const env = envSchema.parse(process.env);

// Client-only export for safe use in client components
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});
```

## .env Files

```
.env                  # Shared defaults (committed)
.env.local            # Local overrides (gitignored)
.env.development      # Dev-specific
.env.production       # Prod-specific (gitignored)
.env.test             # Test-specific
```

### .env.example

Maintain a `.env.example` with all required variables (no values):

```env
# Database
DATABASE_URL=

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Email
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Startup Validation

The `env.ts` import triggers validation. Import it early in your app:

```ts
// src/app/layout.tsx
import "@/env"; // Validates env vars at startup
```

If validation fails, the app crashes immediately with a clear error:

```
ZodError: [
  { path: ["DATABASE_URL"], message: "Required" },
  { path: ["RESEND_API_KEY"], message: "Invalid" }
]
```

## Do

- Validate env vars at startup by importing `@/env` in the root layout.
- Use Zod refinements like `.startsWith("sk_")` to catch wrong-environment keys early.
- Maintain `.env.example` with every required variable (no values) so new developers can onboard.
- Separate client and server schemas — export `clientEnv` for safe browser access.
- Use `z.coerce.number()` for numeric env vars like ports.

## Don't

- Don't access `process.env` directly anywhere outside `src/env.ts`.
- Don't commit `.env.local` or `.env.production` — keep them gitignored.
- Don't use non-null assertions (`process.env.KEY!`) — this defeats the purpose of validation.
- Don't put server secrets in `NEXT_PUBLIC_` variables — they are shipped to the browser.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Scattered `process.env` access** | No validation, no types, easy to misspell variable names | Centralize all access through `src/env.ts` with Zod validation |
| **Using `!` assertions on env vars** | App crashes at runtime with unhelpful "undefined" errors | Validate at startup with Zod; the import itself ensures correctness |
| **Missing `.env.example`** | New developers don't know which variables are required | Maintain `.env.example` with all keys and no values |
| **Server secrets in `NEXT_PUBLIC_`** | Secrets are bundled into client JS and visible in the browser | Keep server-only vars without the `NEXT_PUBLIC_` prefix; use separate schemas |
| **No prefix validation** | Wrong-environment keys (test key in production) go unnoticed | Use `.startsWith()` refinements for keys with known prefixes |
