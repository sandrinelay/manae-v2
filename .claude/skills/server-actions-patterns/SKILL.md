---
name: server-actions-patterns
description: "Next.js Server Actions with safe wrappers, validation, and error handling. Use when implementing mutations, creating form handlers, or building 'use server' functions."
---

# Server Actions Patterns

## Critical Rules

- **Always validate inputs** — never trust client data.
- **Always check auth** — every action must verify the user session.
- **Never expose internal errors** — return generic messages to the client.
- **Revalidate after mutations** — stale UI is a bug.
- **Keep actions thin** — delegate to facades/services for business logic.
- **One action per mutation** — avoid multi-purpose actions.
- **Never import server-only code in client files** — pass actions via props or use wrappers.

## File Organization

- Server Actions are defined in `src/actions/` directory.
- One file per domain entity: `src/actions/{entity}.actions.ts`.
- Every action file starts with `"use server"` directive at the top.

```
src/actions/
  user.actions.ts
  post.actions.ts
  organization.actions.ts
```

## Safe Server Action Wrapper

Use a `safeAction` wrapper for consistent validation, auth, and error handling:

```ts
// src/lib/safe-action.ts
"use server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

export function createSafeAction<TInput extends z.ZodType, TOutput>(
  schema: TInput,
  handler: (input: z.infer<TInput>, user: AuthUser) => Promise<TOutput>
) {
  return async (input: z.infer<TInput>): Promise<ActionResult<TOutput>> => {
    try {
      const user = await getCurrentUser();
      if (!user) return { success: false, error: "Unauthorized" };

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return { success: false, error: parsed.error.errors[0].message };
      }

      const data = await handler(parsed.data, user);
      return { success: true, data };
    } catch (error) {
      console.error("Action error:", error);
      return { success: false, error: "An unexpected error occurred" };
    }
  };
}
```

## Action Implementation

```ts
// src/actions/user.actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSafeAction } from "@/lib/safe-action";
import { updateUserProfile } from "@/facades/user.facade";

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
});

export const updateProfile = createSafeAction(
  UpdateProfileSchema,
  async (input, user) => {
    const result = await updateUserProfile(user.id, input);
    revalidatePath("/profile");
    return result;
  }
);
```

## Server-Only Modules

- Mark server-only modules with the `server-only` package:
```ts
import "server-only";
```
- Use `"use server"` only in action files — never in utility or service files.

## Integration with Forms

### With useActionState (React 19)

```tsx
"use client";
import { useActionState } from "react";
import { updateProfile } from "@/actions/user.actions";

export function ProfileForm() {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  return (
    <form action={formAction}>
      <input name="name" />
      {state?.error && <p className="text-destructive">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

### With react-hook-form

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { updateProfile } from "@/actions/user.actions";
import { toast } from "sonner";

export function ProfileForm() {
  const [isPending, startTransition] = useTransition();
  const form = useForm({ resolver: zodResolver(UpdateProfileSchema) });

  const onSubmit = form.handleSubmit((data) => {
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) toast.success("Profile updated");
      else toast.error(result.error);
    });
  });

  return <form onSubmit={onSubmit}>{/* fields */}</form>;
}
```

## Revalidation

- Always call `revalidatePath()` or `revalidateTag()` after mutations.
- Use path revalidation for simple cases: `revalidatePath("/users")`.
- Use tag revalidation for granular cache control: `revalidateTag("user-list")`.
- Redirect with `redirect()` after create operations when appropriate.

## Do

- Wrap every action with `createSafeAction` (or equivalent) for consistent auth, validation, and error handling.
- Validate all inputs with Zod on the server -- even if the client already validated.
- Call `revalidatePath()` or `revalidateTag()` after every mutation so the UI stays fresh.
- Keep actions thin -- delegate to facades/services for actual business logic.
- Define one action per mutation (e.g., `createUser`, `updateUser`, `deleteUser`).
- Return a typed `ActionResult<T>` from every action for predictable client-side handling.
- Use `useTransition` or `useActionState` to track pending state and disable the submit button.
- Mark server-only utilities with `import "server-only"` to prevent accidental client bundling.

## Don't

- Don't trust client data -- always validate and parse with Zod on the server side.
- Don't expose internal error messages or stack traces to the client -- return generic messages.
- Don't put `"use server"` on utility or service files -- only action files.
- Don't call services or DAL directly from actions -- go through the facade layer.
- Don't create multi-purpose actions that handle create, update, and delete in one function.
- Don't forget to revalidate after mutations -- stale UI is a bug.
- Don't import server action files into client components -- pass actions via props or use dynamic imports.
- Don't perform side effects (emails, webhooks) inside the action -- delegate to services.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Unvalidated input** | Action uses `input` directly without parsing, exposing the app to injection or malformed data. | Always run `schema.safeParse(input)` before processing. |
| **Leaked errors** | Catching an error and returning `error.message` to the client, exposing internals. | Log the real error server-side; return a generic `"An unexpected error occurred"` to the client. |
| **Fat action** | Action contains business logic, database calls, and auth checks all in one function. | Keep actions thin -- call a facade, which calls a service, which calls the DAL. |
| **Missing revalidation** | Data is mutated but the page still shows stale cached content. | Call `revalidatePath()` or `revalidateTag()` after every successful mutation. |
| **Shared mega-action** | One `handleFormAction` that switches on an `action` field to handle multiple operations. | Create separate named actions: `createUser`, `updateUser`, `deleteUser`. |
| **No pending state** | Submit button stays enabled during the request, causing double submissions. | Use `useTransition` or `useActionState` and disable the button while `isPending` is true. |
