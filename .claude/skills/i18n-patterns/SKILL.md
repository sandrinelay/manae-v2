---
name: i18n-patterns
description: "Internationalization with next-intl for RSC, Server Actions, and Zod messages. Use when adding multi-language support, translating user-facing strings, or implementing locale-aware validation."
---

# I18n Patterns

## Critical Rules

- **All user-facing strings must be translated** — no hardcoded text in components.
- **Use namespaces** — group translations by feature/page.
- **Server-side `getTranslations`** — use in RSC and Server Actions.
- **Client-side `useTranslations`** — use in Client Components only.
- **Validation messages are translated** — use i18n error map with Zod.
- **ICU message syntax** for plurals and interpolation: `"{count, plural, one {# item} other {# items}}"`.

## Setup with next-intl

### Configuration

```ts
// src/i18n/config.ts
export const locales = ["en", "fr", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
```

### Message Files

```
messages/
  en.json
  fr.json
  de.json
```

Structure messages by namespace:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading..."
  },
  "auth": {
    "login": "Sign in",
    "logout": "Sign out",
    "register": "Create account"
  },
  "users": {
    "title": "Users",
    "create": "Create user",
    "name": "Name",
    "email": "Email"
  },
  "validation": {
    "required": "This field is required",
    "email.invalid": "Please enter a valid email",
    "too_small": "Must be at least {minimum} characters",
    "too_big": "Must be at most {maximum} characters"
  }
}
```

## Server Components (RSC)

```tsx
import { getTranslations } from "next-intl/server";

export default async function UsersPage() {
  const t = await getTranslations("users");

  return (
    <div>
      <h1>{t("title")}</h1>
      <Button>{t("create")}</Button>
    </div>
  );
}
```

## Client Components

```tsx
"use client";
import { useTranslations } from "next-intl";

export function UserForm() {
  const t = useTranslations("users");

  return <label>{t("name")}</label>;
}
```

## Server Actions with I18n

Pass locale context to server actions for localized error messages:

```ts
// src/actions/user.actions.ts
"use server";
import { getLocale, getTranslations } from "next-intl/server";

export async function createUser(input: unknown) {
  const t = await getTranslations("validation");
  const locale = await getLocale();

  const schema = z.object({
    name: z.string().min(2, t("too_small", { minimum: 2 })),
    email: z.string().email(t("email.invalid")),
  });

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  // ...
}
```

## Zod Validation with I18n

### Custom Error Map

```ts
// src/lib/zod-i18n.ts
import { z } from "zod";

export function createI18nErrorMap(
  t: (key: string, params?: Record<string, unknown>) => string
): z.ZodErrorMap {
  return (issue, ctx) => {
    switch (issue.code) {
      case z.ZodIssueCode.too_small:
        if (issue.type === "string") {
          return { message: t("too_small", { minimum: issue.minimum }) };
        }
        break;
      case z.ZodIssueCode.too_big:
        if (issue.type === "string") {
          return { message: t("too_big", { maximum: issue.maximum }) };
        }
        break;
      case z.ZodIssueCode.invalid_string:
        if (issue.validation === "email") {
          return { message: t("email.invalid") };
        }
        break;
      case z.ZodIssueCode.invalid_type:
        if (issue.received === "undefined") {
          return { message: t("required") };
        }
        break;
    }
    return { message: ctx.defaultError };
  };
}
```

## Date and Number Formatting

```tsx
import { useFormatter } from "next-intl";

function PriceDisplay({ amount }: { amount: number }) {
  const format = useFormatter();
  return <span>{format.number(amount, { style: "currency", currency: "EUR" })}</span>;
}

function DateDisplay({ date }: { date: Date }) {
  const format = useFormatter();
  return <span>{format.dateTime(date, { dateStyle: "medium" })}</span>;
}
```

## Do

- Use namespaces to group translations by feature or page (`"users"`, `"auth"`, `"common"`).
- Use `getTranslations` in Server Components and Server Actions for server-side translations.
- Use ICU message syntax for plurals and interpolation instead of string concatenation.
- Use `useFormatter` for locale-aware date, number, and currency formatting.
- Keep a `"common"` namespace for shared strings like "Save", "Cancel", "Delete".

## Don't

- Don't hardcode user-facing strings in components — always use translation keys.
- Don't use `useTranslations` in Server Components — use `getTranslations` instead.
- Don't concatenate translated strings to build sentences — use ICU message parameters.
- Don't forget to translate Zod validation messages — use the custom error map pattern.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Hardcoded strings in JSX** | Untranslatable, breaks multi-language support | Extract all user-facing text to message files with translation keys |
| **String concatenation for plurals** | Incorrect grammar in many languages (`"1 items"`) | Use ICU plural syntax: `"{count, plural, one {# item} other {# items}}"` |
| **One giant flat translation file** | Hard to maintain, merge conflicts, slow to find keys | Split translations into namespaces by feature or page |
| **Translating in client components with `getTranslations`** | Server-only function called in client context causes errors | Use `useTranslations` hook in Client Components |
| **Formatting dates with `toLocaleDateString()`** | Inconsistent with app locale, ignores user preferences | Use `useFormatter().dateTime()` from next-intl for consistent locale-aware formatting |
