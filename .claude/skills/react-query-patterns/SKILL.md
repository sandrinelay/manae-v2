---
name: react-query-patterns
description: "TanStack React Query for data fetching, caching, mutations, and optimistic updates. Use when managing server state in client components, implementing data fetching hooks, or caching API responses."
---

# React Query Patterns

## Critical Rules

- **Query keys are structured** — use the factory pattern from `query-keys.ts`.
- **Custom hooks for reuse** — wrap `useQuery`/`useMutation` in domain hooks.
- **Invalidate on mutation** — always invalidate related queries after writes.
- **Optimistic updates for UX** — use for edits and deletes where latency matters.
- **Prefetch in RSC** — hydrate queries in server components for instant loads.
- **Never fetch in useEffect** — use React Query instead.

## Setup

```tsx
// src/providers/query-provider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

## Query Keys Convention

```ts
// src/lib/query-keys.ts
export const queryKeys = {
  users: {
    all: ["users"] as const,
    list: (filters: UserFilters) => ["users", "list", filters] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
  posts: {
    all: ["posts"] as const,
    list: (filters: PostFilters) => ["posts", "list", filters] as const,
    detail: (id: string) => ["posts", "detail", id] as const,
    comments: (postId: string) => ["posts", postId, "comments"] as const,
  },
} as const;
```

## Queries

### Basic Query

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function UserList() {
  const { data: users, isLoading, error } = useQuery({
    queryKey: queryKeys.users.all,
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <ul>{users.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### Query with Server Action

```tsx
import { useQuery } from "@tanstack/react-query";
import { getUserList } from "@/actions/user.actions";

const { data } = useQuery({
  queryKey: queryKeys.users.list(filters),
  queryFn: () => getUserList(filters),
});
```

## Mutations

### Basic Mutation

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/actions/user.actions";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      toast.success("User created");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
```

### Optimistic Update

```tsx
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      updateUser(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(id) });
      const previous = queryClient.getQueryData(queryKeys.users.detail(id));
      queryClient.setQueryData(queryKeys.users.detail(id), (old: User) => ({
        ...old,
        ...data,
      }));
      return { previous };
    },
    onError: (_err, { id }, context) => {
      queryClient.setQueryData(queryKeys.users.detail(id), context?.previous);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
    },
  });
}
```

## Custom Hooks

```ts
// src/hooks/use-users.ts
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.users.list(filters ?? {}),
    queryFn: () => getUserList(filters),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUserById(id),
    enabled: !!id,
  });
}
```

## Prefetching with RSC

```tsx
// app/users/page.tsx (Server Component)
import { HydrationBoundary, dehydrate, QueryClient } from "@tanstack/react-query";
import { getUserList } from "@/actions/user.actions";
import { queryKeys } from "@/lib/query-keys";
import { UserList } from "./user-list";

export default async function UsersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.users.all,
    queryFn: getUserList,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}
```

## Do

- Use the query key factory pattern (`queryKeys.users.detail(id)`) for consistent, structured keys.
- Wrap `useQuery`/`useMutation` in custom domain hooks (`useUsers`, `useCreateUser`) for reuse.
- Invalidate related queries after every mutation using `queryClient.invalidateQueries()`.
- Prefetch data in Server Components with `HydrationBoundary` for instant page loads.
- Use optimistic updates for user-facing edits and deletes where latency matters.

## Don't

- Don't fetch data in `useEffect` — use `useQuery` with a `queryFn` instead.
- Don't use inline string arrays as query keys — use the factory pattern from `query-keys.ts`.
- Don't forget to invalidate queries after mutations — stale UI is a common bug.
- Don't create a new `QueryClient` on every render — use `useState` to create it once.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Fetching in `useEffect`** | No caching, no deduplication, manual loading/error state management | Use `useQuery` which handles caching, dedup, loading, and errors automatically |
| **Inline query keys (`["users", id]`)** | Typos cause cache misses, no autocomplete, hard to invalidate | Use the `queryKeys` factory pattern for structured, type-safe keys |
| **Not invalidating after mutation** | UI shows stale data after create/update/delete | Call `queryClient.invalidateQueries()` in the mutation's `onSuccess` callback |
| **New `QueryClient()` in render** | Client is recreated every render, wiping the cache | Create `QueryClient` inside `useState(() => new QueryClient(...))` |
| **Optimistic update without rollback** | Failed mutation leaves UI in an incorrect state | Always implement `onError` rollback using the `context.previous` pattern |
