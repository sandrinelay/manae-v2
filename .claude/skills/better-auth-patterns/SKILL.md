---
name: better-auth-patterns
description: "Better Auth setup with session management, social login, organization plugin, and middleware. Use when implementing authentication, adding social login providers, or managing user sessions with Better Auth."
---

# Better Auth Patterns

## Critical Rules

- **Server-side session check** — use `getCurrentUser()` in RSC and Server Actions.
- **Client-side `useSession()`** — only in Client Components for UI state.
- **Middleware for redirects** — protect routes at the edge, not in pages.
- **Never expose auth secrets** — keep `BETTER_AUTH_SECRET` server-only.
- **Use plugins** — `organization()`, `admin()` for built-in features.
- **Social login always available** — Google + GitHub as defaults.

## Server Setup

```ts
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization, admin } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization(),
    admin(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
});
```

## Client Setup

```ts
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [organizationClient(), adminClient()],
});

export const { useSession, signIn, signUp, signOut } = authClient;
```

## API Route Handler

```ts
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

## Session Management

### Server-Side Session

```ts
// src/lib/auth-server.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
```

### Client-Side Session

```tsx
"use client";
import { useSession } from "@/lib/auth-client";

export function UserMenu() {
  const { data: session, isPending } = useSession();

  if (isPending) return <Skeleton />;
  if (!session) return <LoginButton />;

  return <span>{session.user.name}</span>;
}
```

## Authentication Flows

### Sign Up

```tsx
"use client";
import { authClient } from "@/lib/auth-client";

async function handleSignUp(data: SignUpInput) {
  const { error } = await authClient.signUp.email({
    email: data.email,
    password: data.password,
    name: data.name,
  });
  if (error) toast.error(error.message);
  else router.push("/dashboard");
}
```

### Social Login

```tsx
async function handleGoogleLogin() {
  await authClient.signIn.social({ provider: "google" });
}
```

### Sign Out

```tsx
async function handleSignOut() {
  await authClient.signOut();
  router.push("/");
}
```

## Middleware

```ts
// middleware.ts
import { betterFetch } from "@better-fetch/fetch";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "better-auth/types";

const publicRoutes = ["/", "/login", "/register", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Check session
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: { cookie: request.headers.get("cookie") ?? "" },
    }
  );

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin route protection
  if (pathname.startsWith("/admin") && session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Organization Plugin

```tsx
// Create organization
const { data: org } = await authClient.organization.create({
  name: "Acme Inc",
  slug: "acme",
});

// Invite member
await authClient.organization.inviteMember({
  email: "user@example.com",
  role: "member",
  organizationId: org.id,
});

// Switch active organization
await authClient.organization.setActive({ organizationId: org.id });
```

## Do

- Use `getCurrentUser()` in Server Components and Server Actions for session checks.
- Keep auth client and server modules in separate files (`auth-client.ts` vs `auth.ts`).
- Configure session refresh (`updateAge`) to avoid unnecessary database lookups.
- Use the organization plugin for multi-tenant features instead of building custom logic.
- Always redirect unauthenticated users from middleware, not from page components.

## Don't

- Don't call `useSession()` in Server Components — it is a client-only hook.
- Don't store `BETTER_AUTH_SECRET` in `NEXT_PUBLIC_` variables or expose it to the browser.
- Don't skip the middleware and rely solely on page-level auth checks — middleware catches unauthenticated requests earlier.
- Don't create custom session tables — use Better Auth's built-in schema and plugins.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Checking auth in every page** | Duplicated logic, easy to forget on new pages | Use middleware for route protection and `requireAuth()` in server components |
| **Using `process.env.BETTER_AUTH_SECRET` on the client** | Exposes secret, compromises all sessions | Keep secret server-only; use `auth-client.ts` for client code |
| **Fetching session in `useEffect`** | Causes flash of unauthenticated content, race conditions | Use `useSession()` hook which manages loading state automatically |
| **Hardcoding social provider config** | Breaks when credentials rotate or new providers are added | Store client IDs/secrets in env vars, validate with Zod at startup |
| **Not setting `expiresIn` and `updateAge`** | Sessions never expire or refresh too often | Configure both values explicitly in the `session` config |
