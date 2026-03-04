---
name: form-validation
description: "Zod dual validation patterns for client and server with react-hook-form and ShadCN Form. Use when building forms, implementing validation, or creating input schemas with i18n error messages."
---

# Form Validation Patterns

## Critical Rules

- **One Zod schema, two validations** — share between client and server.
- **Schema files in `src/schemas/`** — never inline schemas in components.
- **Use ShadCN Form components** — `FormField`, `FormMessage` for consistent UX.
- **Always show inline errors** — next to the field, not in toasts.
- **Disable submit while pending** — prevent double submissions.
- **Default values required** — every field needs a `defaultValues` entry in useForm.

## Dual Validation Strategy

Every form must validate on **both client and server**:
- **Client**: instant feedback, UX quality.
- **Server**: security, data integrity — never trust client validation alone.

Use a single Zod schema shared between client and server.

## Shared Schema Definition

```ts
// src/schemas/user.schema.ts
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  bio: z.string().max(500).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

## Client-Side Validation with react-hook-form

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "@/schemas/user.schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateUserForm() {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", role: "USER" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* More fields... */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Create
        </Button>
      </form>
    </Form>
  );
}
```

## Server-Side Validation

```ts
// src/actions/user.actions.ts
"use server";
import { createUserSchema } from "@/schemas/user.schema";

export async function createUser(input: unknown) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  // proceed with validated data...
}
```

## I18n Error Messages with Zod

For internationalized error messages, use a Zod error map:

```ts
// src/lib/zod-i18n.ts
import { z } from "zod";
import { getTranslations } from "next-intl/server";

export async function createI18nSchema() {
  const t = await getTranslations("validation");

  return {
    createUser: z.object({
      name: z.string().min(2, t("name.min", { min: 2 })),
      email: z.string().email(t("email.invalid")),
    }),
  };
}
```

Or use a custom error map:

```ts
// src/lib/zod-error-map.ts
import { type ZodErrorMap, ZodIssueCode } from "zod";

export function createZodErrorMap(t: (key: string, params?: Record<string, unknown>) => string): ZodErrorMap {
  return (issue, ctx) => {
    switch (issue.code) {
      case ZodIssueCode.too_small:
        return { message: t("too_small", { minimum: issue.minimum }) };
      case ZodIssueCode.too_big:
        return { message: t("too_big", { maximum: issue.maximum }) };
      case ZodIssueCode.invalid_string:
        if (issue.validation === "email") return { message: t("invalid_email") };
        break;
    }
    return { message: ctx.defaultError };
  };
}
```

## Multi-Card Form Layout

For complex forms, split into logical sections using Cards:

```tsx
<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
  <Card>
    <CardHeader>
      <CardTitle>Personal Information</CardTitle>
    </CardHeader>
    <CardContent className="grid gap-4 md:grid-cols-2">
      {/* Name, Email fields */}
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Preferences</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Role, Bio fields */}
    </CardContent>
  </Card>

  <div className="flex justify-end">
    <Button type="submit">Create User</Button>
  </div>
</form>
```

## Do

- Define one Zod schema per form in `src/schemas/` and share it between client and server.
- Always provide `defaultValues` for every field in `useForm` -- react-hook-form requires it for controlled behavior.
- Use ShadCN `FormField` + `FormMessage` so validation errors render inline next to each field.
- Disable the submit button while `isSubmitting` is true to prevent double submissions.
- Use `zodResolver` from `@hookform/resolvers/zod` for client-side validation.
- Re-validate on the server with `schema.safeParse()` -- never trust client-only validation.
- Split complex forms into logical Card sections for readability.
- Use `.optional()` and `.default()` in Zod to express optional fields explicitly.

## Don't

- Don't inline Zod schemas inside components -- keep them in `src/schemas/{entity}.schema.ts`.
- Don't show validation errors only in toasts -- always show them inline next to the relevant field.
- Don't skip server-side validation because the client already validated -- the client can be bypassed.
- Don't forget `defaultValues` -- missing defaults cause react-hook-form to treat fields as uncontrolled.
- Don't use `onChange` mode for validation unless the form specifically needs real-time feedback -- `onSubmit` (default) is less noisy.
- Don't duplicate Zod schemas for client and server -- use a single shared schema file.
- Don't use native HTML validation attributes (`required`, `pattern`) alongside Zod -- let Zod be the single source of truth.
- Don't leave the submit button enabled during pending requests -- users will double-submit.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Duplicated schemas** | Separate Zod schemas for client and server drift apart, causing inconsistent validation. | Define one schema in `src/schemas/` and import it in both places. |
| **Toast-only errors** | Validation errors shown only as toasts disappear quickly and don't indicate which field failed. | Use `FormMessage` to render errors inline next to each field. |
| **Missing defaultValues** | Omitting `defaultValues` in `useForm` causes uncontrolled-to-controlled warnings and broken resets. | Provide a `defaultValues` entry for every field, even if it's an empty string. |
| **Client-only validation** | Validating only on the client; a crafted request bypasses the form and submits invalid data. | Always call `schema.safeParse(input)` on the server inside the action. |
| **Inline schema definition** | Schema defined inside the component file, making it impossible to share with the server. | Move the schema to `src/schemas/{entity}.schema.ts` and import it. |
| **No pending state** | Submit button stays enabled during the request, causing duplicate submissions and race conditions. | Check `form.formState.isSubmitting` or `isPending` from `useTransition` and disable the button. |
