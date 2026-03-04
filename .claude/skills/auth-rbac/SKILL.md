---
name: auth-rbac
description: "CASL-based authorization with role hierarchies, organization roles, and safe route protection. Use when implementing access control, role-based permissions, or protecting routes and API endpoints."
---

# Auth & RBAC Patterns

## Critical Rules

- **Authorization in services, not routes** — use CASL in the service layer.
- **Route groups for access control** — `(public)`, `(auth)`, `(app)`, `admin`.
- **Middleware for redirects** — protect routes at the edge.
- **Auth wrappers for pages** — `withAuth()`, `withAdmin()` in server components.
- **Never trust client-side role checks** — always verify server-side.
- **Principle of least privilege** — grant minimum required permissions.

## Role System

### Application Roles

```ts
// src/lib/roles.ts
export const APP_ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const;
export type AppRole = (typeof APP_ROLES)[number];
```

### Organization Roles

```ts
export const ORG_ROLES = ["MEMBER", "MANAGER", "OWNER"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];
```

- Every user has an **app role** (global) and an **org role** (per organization).
- Role checks always consider both: app role for platform features, org role for org resources.

## CASL Authorization

### Ability Definition

```ts
// src/lib/casl.ts
import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";

type Actions = "create" | "read" | "update" | "delete" | "manage";
type Subjects = "User" | "Post" | "Organization" | "all";
export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilityFor(user: AuthUser): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Base permissions for all authenticated users
  can("read", "Post", { published: true });
  can("update", "User", { id: user.id }); // own profile

  if (user.role === "ADMIN") {
    can("manage", "User");
    can("manage", "Post");
    can("read", "Organization");
  }

  if (user.role === "SUPER_ADMIN") {
    can("manage", "all");
  }

  return build();
}
```

### Organization Ability

```ts
export function defineOrgAbilityFor(user: AuthUser, orgRole: OrgRole): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can("read", "Organization");

  if (orgRole === "MANAGER" || orgRole === "OWNER") {
    can("update", "Organization");
    can("manage", "User"); // manage org members
  }

  if (orgRole === "OWNER") {
    can("delete", "Organization");
  }

  return build();
}
```

## Service Layer Authorization

Check permissions in the **service layer**, never in presentation or DAL:

```ts
// src/services/post.service.ts
import { ForbiddenError } from "@casl/ability";
import { defineAbilityFor } from "@/lib/casl";

export async function deletePost(user: AuthUser, postId: string) {
  const ability = defineAbilityFor(user);
  const post = await findPostById(postId);

  ForbiddenError.from(ability).throwUnlessCan("delete", {
    ...post,
    __typename: "Post",
  });

  return removePost(postId);
}
```

## Safe Route Protection

### Middleware-Level

```ts
// middleware.ts
const publicRoutes = ["/", "/login", "/register", "/api/webhook"];
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const session = await getSession();

  if (!session && !publicRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (adminRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
    if (session?.user.role !== "ADMIN" && session?.user.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
}
```

### Route Group Structure

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

### Auth Wrappers

```ts
// src/lib/auth-wrappers.ts
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function withAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function withAdmin() {
  const user = await withAuth();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") redirect("/");
  return user;
}

export async function withOrgRole(orgId: string, requiredRole: OrgRole) {
  const user = await withAuth();
  const membership = await getOrgMembership(user.id, orgId);
  if (!membership || !hasOrgRole(membership.role, requiredRole)) redirect("/");
  return { user, membership };
}
```

## Do

- Define all abilities in a single `casl.ts` file for discoverability.
- Check permissions in the service layer — not in routes, components, or the data access layer.
- Use route groups (`(public)`, `(auth)`, `(app)`, `admin`) to organize access levels structurally.
- Combine app role and org role checks when accessing organization resources.
- Use `ForbiddenError.from(ability).throwUnlessCan()` for consistent error handling.

## Don't

- Don't check roles in client components as a security measure — always verify server-side.
- Don't scatter permission checks across routes and API handlers — centralize in services.
- Don't use string comparisons for roles (`if (role === "admin")`) — use CASL abilities instead.
- Don't grant `manage("all")` to non-super-admin roles — follow least privilege.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Client-side role gating as security** | Users can bypass by modifying client code | Use client checks for UX only; enforce permissions server-side with CASL |
| **Checking roles in API route handlers** | Scattered logic, inconsistent enforcement | Move authorization to the service layer with `defineAbilityFor()` |
| **Flat role strings without hierarchy** | Adding new roles requires updating every check | Use CASL ability builder with role inheritance |
| **Missing org role check on org resources** | Users from one org can access another org's data | Always verify both app role and org membership before accessing org resources |
| **Hardcoding admin emails** | Fragile, doesn't scale, easy to forget updates | Use role column in the database and manage through admin UI |
