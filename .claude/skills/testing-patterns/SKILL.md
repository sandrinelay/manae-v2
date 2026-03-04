---
name: testing-patterns
description: "Vitest testing strategy with role-based patterns, seed data factories, and CI/CD integration. Use when writing tests, creating test data, or setting up continuous integration pipelines."
---

# Testing Patterns

## Critical Rules

- **Test every role** — PUBLIC, USER, ADMIN for every feature.
- **Test services, not routes** — service layer is the source of truth.
- **Use seed factories** — deterministic, reusable test data.
- **Clean up after each test** — truncate tables, no test pollution.
- **CI runs tests + build** — every PR must pass before merge.
- **No mocking the database** — test against a real PostgreSQL instance.

## Role-Based Test Matrix

Every feature must be tested from 3 perspectives:

| Role | What to test |
|------|-------------|
| **PUBLIC** | Unauthenticated access — redirects, public pages, API 401s |
| **USER** | Standard user — CRUD own resources, forbidden on others |
| **ADMIN** | Admin user — manage all resources, admin-only features |

```ts
describe("deletePost", () => {
  it("should return 401 for public (unauthenticated)", async () => {
    const result = await deletePost(null, postId);
    expect(result.error).toBe("Unauthorized");
  });

  it("should allow USER to delete own post", async () => {
    const result = await deletePost(userSession, ownPostId);
    expect(result.success).toBe(true);
  });

  it("should forbid USER from deleting another's post", async () => {
    const result = await deletePost(userSession, otherPostId);
    expect(result.error).toBe("Forbidden");
  });

  it("should allow ADMIN to delete any post", async () => {
    const result = await deletePost(adminSession, otherPostId);
    expect(result.success).toBe(true);
  });
});
```

## Vitest Configuration

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["node_modules", "tests/setup.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

## Seed Data

### Seed Users

```ts
// tests/seed/users.ts
export const SEED_USERS = {
  public: null, // no session
  user: {
    id: "user-1",
    email: "user@test.com",
    name: "Test User",
    role: "USER" as const,
  },
  admin: {
    id: "admin-1",
    email: "admin@test.com",
    name: "Test Admin",
    role: "ADMIN" as const,
  },
} as const;
```

### Seed Data Factory

```ts
// tests/seed/factories.ts
import { db } from "@/lib/db";
import { users, posts } from "@/schema";

export async function seedUser(overrides?: Partial<NewUser>) {
  const [user] = await db.insert(users).values({
    name: "Test User",
    email: `test-${Date.now()}@test.com`,
    role: "USER",
    ...overrides,
  }).returning();
  return user;
}

export async function seedPost(authorId: string, overrides?: Partial<NewPost>) {
  const [post] = await db.insert(posts).values({
    title: "Test Post",
    content: "Test content",
    authorId,
    published: true,
    ...overrides,
  }).returning();
  return post;
}
```

## Test Setup

```ts
// tests/setup.ts
import { beforeAll, afterAll, afterEach } from "vitest";
import { db } from "@/lib/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

afterEach(async () => {
  // Clean up test data — truncate in reverse FK order
  await db.execute(sql`TRUNCATE posts, users CASCADE`);
});
```

## Service Layer Testing

```ts
// src/services/__tests__/user.service.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { listUsers, deleteUser } from "@/services/user.service";
import { SEED_USERS } from "tests/seed/users";
import { seedUser } from "tests/seed/factories";

describe("user.service", () => {
  let testUser: User;

  beforeEach(async () => {
    testUser = await seedUser();
  });

  describe("listUsers", () => {
    it("should allow ADMIN to list all users", async () => {
      const result = await listUsers(SEED_USERS.admin);
      expect(result).toHaveLength(1);
    });

    it("should forbid USER from listing users", async () => {
      await expect(listUsers(SEED_USERS.user)).rejects.toThrow("Forbidden");
    });
  });
});
```

## CI/CD Integration

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
```

## Do

- Test every feature from all three role perspectives: PUBLIC, USER, and ADMIN.
- Use seed factories to create deterministic, isolated test data for each test.
- Truncate tables in reverse foreign-key order in `afterEach` to prevent test pollution.
- Test the service layer directly; it is the single source of truth for business logic.
- Run tests against a real PostgreSQL instance to catch real query and constraint issues.
- Keep each test case focused on a single behavior; one assertion per logical concern.
- Use `describe` blocks to group tests by feature or method, and nested `describe` for sub-scenarios.
- Run the full test suite in CI on every push and pull request before allowing merge.

## Don't

- Don't mock the database; real queries catch constraint violations and type mismatches that mocks hide.
- Don't share mutable state between tests; always set up fresh data in `beforeEach`.
- Don't test implementation details like internal function calls; test observable behavior and outputs.
- Don't rely on test execution order; each test must be independent and idempotent.
- Don't skip the ADMIN or PUBLIC role tests because "they probably work"; permission bugs are critical.
- Don't hardcode IDs or timestamps; use factories that generate unique values.
- Don't write tests that pass when the feature is broken (tautological assertions like `expect(true).toBe(true)`).
- Don't leave `console.log` debugging in committed test files; use proper assertions.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Database Mocking** | Mocking `db.query` hides real SQL errors, constraint violations, and type mismatches. | Use a real PostgreSQL test database with proper seed data and truncation. |
| **Shared Mutable Fixtures** | One test modifies a shared object, causing the next test to fail intermittently. | Create fresh data in `beforeEach` using seed factories; truncate in `afterEach`. |
| **Single-Role Testing** | Only testing the happy path as USER; missing that PUBLIC can access protected resources. | Use the role-based test matrix: always test PUBLIC, USER, and ADMIN for each feature. |
| **Testing Routes Instead of Services** | Writing integration tests against HTTP routes, which are slow and couple tests to transport details. | Test the service layer directly; only add a thin integration test for route wiring. |
| **Snapshot Overuse** | Using `toMatchSnapshot()` for dynamic data, causing constant snapshot updates. | Use explicit assertions on specific fields; reserve snapshots for stable UI output. |
| **Ignoring CI Failures** | Merging PRs with failing tests by re-running CI until it passes. | Fix flaky tests immediately; treat CI red as a blocking issue. |
| **God Test Files** | Putting hundreds of tests in one file, making it slow to run and hard to navigate. | Split tests by feature or service into separate files under `__tests__/`. |
