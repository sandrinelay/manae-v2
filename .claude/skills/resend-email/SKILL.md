---
name: resend-email
description: "Email sending patterns with Resend and React Email templates. Use when implementing transactional emails, creating email templates, or adding i18n email support."
---

# Resend Email Patterns

## Critical Rules

- **Emails via service layer** — never send directly from routes.
- **React Email for templates** — type-safe, previewable components.
- **I18n support** — every email must support multiple locales.
- **Inline styles only** — CSS classes don't work in most email clients.
- **Handle delivery webhooks** — bounces and complaints must be processed.
- **Preview emails locally** — use `email dev` command during development.

## Setup

```ts
// src/lib/resend.ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

## Email Service Layer

- Emails are sent from a dedicated service — never from routes or components directly.
- Located in `src/services/email.service.ts`.

```ts
// src/services/email.service.ts
import { resend } from "@/lib/resend";
import { WelcomeEmail } from "@/emails/welcome";
import { InviteEmail } from "@/emails/invite";

const FROM = "App Name <noreply@yourdomain.com>";

export async function sendWelcomeEmail(to: string, name: string, locale: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: getSubject("welcome", locale),
    react: WelcomeEmail({ name, locale }),
  });
}

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  orgName: string,
  inviteUrl: string,
  locale: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: getSubject("invite", locale, { orgName }),
    react: InviteEmail({ inviterName, orgName, inviteUrl, locale }),
  });
}
```

## React Email Templates

```tsx
// src/emails/welcome.tsx
import {
  Html, Head, Body, Container, Section, Text, Button, Hr,
} from "@react-email/components";
import { getEmailTranslations } from "@/lib/email-i18n";

interface WelcomeEmailProps {
  name: string;
  locale: string;
}

export function WelcomeEmail({ name, locale }: WelcomeEmailProps) {
  const t = getEmailTranslations(locale, "welcome");

  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Text style={heading}>{t("title", { name })}</Text>
          <Text style={paragraph}>{t("description")}</Text>
          <Section style={buttonSection}>
            <Button style={button} href="https://app.yourdomain.com/dashboard">
              {t("cta")}
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{t("footer")}</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Inline styles for email compatibility
const body = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = { margin: "0 auto", padding: "40px 20px", maxWidth: "560px" };
const heading = { fontSize: "24px", fontWeight: "bold", marginBottom: "16px" };
const paragraph = { fontSize: "16px", lineHeight: "1.5", color: "#333" };
const buttonSection = { textAlign: "center" as const, margin: "32px 0" };
const button = {
  backgroundColor: "#000", color: "#fff", padding: "12px 24px",
  borderRadius: "6px", fontSize: "16px", textDecoration: "none",
};
const hr = { borderColor: "#e6ebf1", margin: "32px 0" };
const footer = { fontSize: "12px", color: "#8898aa" };
```

## I18n for Emails

```ts
// src/lib/email-i18n.ts
const emailMessages: Record<string, Record<string, Record<string, string>>> = {
  en: {
    welcome: {
      title: "Welcome, {name}!",
      description: "We're excited to have you on board.",
      cta: "Go to Dashboard",
      footer: "You received this email because you created an account.",
    },
    invite: {
      title: "{inviterName} invited you to {orgName}",
      description: "Click below to accept the invitation.",
      cta: "Accept Invitation",
    },
  },
  fr: {
    welcome: {
      title: "Bienvenue, {name} !",
      description: "Nous sommes ravis de vous compter parmi nous.",
      cta: "Aller au tableau de bord",
      footer: "Vous avez reçu cet e-mail car vous avez créé un compte.",
    },
  },
};

export function getEmailTranslations(locale: string, namespace: string) {
  const messages = emailMessages[locale]?.[namespace] ?? emailMessages.en[namespace];

  return (key: string, params?: Record<string, string>) => {
    let message = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        message = message.replace(`{${k}}`, v);
      }
    }
    return message;
  };
}
```

## Webhook for Delivery Status

```ts
// src/app/api/webhook/resend/route.ts
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const payload = await request.json();

  switch (payload.type) {
    case "email.delivered":
      // Log successful delivery
      break;
    case "email.bounced":
      // Mark email as bounced, disable future sends
      break;
    case "email.complained":
      // Unsubscribe user
      break;
  }

  return NextResponse.json({ received: true });
}
```

## Do

- Send emails from a dedicated service layer (`email.service.ts`), never from routes or components.
- Use React Email components for type-safe, previewable templates.
- Support i18n in every email by passing `locale` and using the email-i18n helper.
- Use inline styles exclusively — CSS classes are stripped by most email clients.
- Handle bounce and complaint webhooks to maintain sender reputation.

## Don't

- Don't send emails directly from API routes or Server Actions — route through the service layer.
- Don't use CSS classes or external stylesheets in email templates — use inline `style` props.
- Don't hardcode the "from" address in multiple places — define it once as a constant.
- Don't ignore bounce/complaint webhooks — unprocessed bounces degrade deliverability.

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Sending emails in route handlers** | Scattered send logic, hard to test, no reuse | Centralize all email sending in `email.service.ts` |
| **Using CSS classes in email templates** | Styles are stripped by Gmail, Outlook, and most clients | Use inline `style` props on every element |
| **No locale support in emails** | Users receive emails in the wrong language | Pass `locale` to every email function, use `getEmailTranslations()` |
| **Ignoring delivery webhooks** | Bounced addresses keep receiving sends, harming sender reputation | Process `email.bounced` and `email.complained` events to disable future sends |
| **Hardcoding strings in email templates** | Cannot translate or update copy without code changes | Use the email-i18n translation system with message files |
