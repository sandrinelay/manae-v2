---
name: layered-architecture
description: "Enforces strict layered architecture: Presentation → Facade → Service → DAL → Persistence. Use when structuring a Next.js application, creating new features with separation of concerns, or refactoring code into layers."
---

# Layered Architecture

Strict separation of concerns across five layers. Each layer only calls the layer directly below it.

## Critical Rules

- **Never skip layers** — presentation must not call services directly.
- **No business logic in facades** — they coordinate, not decide.
- **No auth checks in DAL** — DAL is purely data access.
- **No database calls in services** — services call DAL.
- **Functional style** — pure functions, no classes, prefer composition over inheritance.
- **Top-down design** — keep functions short, extract when >100 lines.

## Layer Overview

```
Presentation (RSC / Client Components)
    ↓
Facade (entry point for business logic)
    ↓
Service (business rules, authorization)
    ↓
DAL — Data Access Layer (queries, data shaping)
    ↓
Persistence (Drizzle ORM / database)
```

## Presentation Layer

- React Server Components and Client Components live here.
- Components call **facades only** — never services or DAL directly.
- RSC by default. Only add `"use client"` when strictly needed (hooks, events, browser APIs).
- Top-down design: if a component exceeds ~100 lines, extract sub-functions/sub-components.
- Functional over OOP — pure functions, composition, immutability.

```tsx
// app/(app)/users/page.tsx — Presentation
import { getUserList } from "@/facades/user.facade";

export default async function UsersPage() {
  const users = await getUserList();
  return <UserTable users={users} />;
}
```

## Facade Layer

- Entry points for business logic. One facade per domain entity.
- Located in `src/facades/` — files named `{entity}.facade.ts`.
- Facades orchestrate service calls and transform data for the presentation.
- Facades handle auth context extraction and pass it down.
- Never contain business logic — only coordination.

```ts
// src/facades/user.facade.ts
import { getCurrentUser } from "@/lib/auth";
import { listUsers, createUser } from "@/services/user.service";

export async function getUserList() {
  const currentUser = await getCurrentUser();
  return listUsers(currentUser);
}
```

## Service Layer

- Contains all business rules and authorization checks.
- Located in `src/services/` — files named `{entity}.service.ts`.
- Services receive the auth context as parameter — never fetch it themselves.
- CASL authorization checks happen here.
- Services call DAL functions for data access.

```ts
// src/services/user.service.ts
import { ForbiddenError } from "@casl/ability";
import { defineAbilityFor } from "@/lib/casl";
import { findAllUsers } from "@/dal/user.dal";

export async function listUsers(currentUser: AuthUser) {
  const ability = defineAbilityFor(currentUser);
  ForbiddenError.from(ability).throwUnlessCan("read", "User");
  return findAllUsers();
}
```

## Data Access Layer (DAL)

- Pure data access — no business logic, no authorization.
- Located in `src/dal/` — files named `{entity}.dal.ts`.
- DAL functions shape data: select specific columns, join relations, paginate.
- Always return typed results — never raw query results.

```ts
// src/dal/user.dal.ts
import { db } from "@/lib/db";
import { users } from "@/schema";

export async function findAllUsers() {
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users);
}
```

## Persistence Layer

- Drizzle ORM schema definitions and database client.
- Located in `src/schema/` for table definitions, `src/lib/db.ts` for the client.
- Schema-only — no query logic here.

## File Naming Convention

```
src/
  facades/         # {entity}.facade.ts
  services/        # {entity}.service.ts
  dal/             # {entity}.dal.ts
  schema/          # {entity}.ts (Drizzle table defs)
  lib/db.ts        # Database client
```

- All new files use **kebab-case**.
- One file per entity per layer — avoid catch-all files.

## Do

- Call only the layer directly below -- Presentation calls Facade, Facade calls Service, Service calls DAL.
- Pass the auth context (current user) as a parameter from Facade to Service -- never fetch it inside a service.
- Keep facades thin -- they orchestrate calls and shape data for the UI, nothing more.
- Put all authorization checks (CASL) in the Service layer.
- Put all data shaping (column selection, joins, pagination) in the DAL layer.
- Create one file per entity per layer: `user.facade.ts`, `user.service.ts`, `user.dal.ts`.
- Use functional style -- pure functions, no classes, prefer composition.
- Extract sub-functions when any function exceeds ~100 lines.

## Don't

- Don't call a DAL function directly from a component or page -- always go through Facade then Service.
- Don't put business rules or authorization in the Facade layer -- that belongs in Service.
- Don't put auth checks or business logic in the DAL -- it is purely data access.
- Don't import Drizzle `db` in service or facade files -- only DAL and `lib/db.ts` touch the database.
- Don't create catch-all files like `api.service.ts` that mix multiple entities.
- Don't let the persistence layer (schema files) contain query logic.
- Don't pass raw Drizzle query results up through the layers -- shape them in the DAL.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Layer skipping** | A component imports a service or DAL function directly, bypassing the facade. | Always route through Facade -- it ensures auth context is attached and coordination is centralized. |
| **Fat facade** | Facade contains business rules, conditionals, or authorization logic. | Move business logic to the Service layer; the Facade only orchestrates and transforms. |
| **Auth in DAL** | DAL functions check user permissions before running queries. | Remove auth from DAL; let the Service layer handle all authorization with CASL. |
| **Database in Service** | Service imports `db` and runs queries directly instead of calling DAL functions. | Extract every query into the DAL; the Service layer never touches Drizzle directly. |
| **God file** | A single `data.ts` or `api.ts` that handles users, posts, and orgs in one file. | Split into one file per entity per layer: `user.dal.ts`, `post.dal.ts`, etc. |
| **Upward dependency** | A DAL file imports from a service or facade, creating a circular dependency. | Dependencies flow strictly downward: Presentation > Facade > Service > DAL > Persistence. |
