# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint code linting
```

## Architecture Overview

Manae is a French-language productivity app for task capture, mood tracking, and intelligent scheduling with Google Calendar integration.

**Tech Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth)

### Project Structure

```
app/                    # Next.js App Router pages
├── capture/            # Main capture interface
├── onboarding/         # 4-step onboarding flow (step1-4)
├── api/auth/google/    # Google OAuth token exchange (server-side)
└── layout.tsx          # Root layout with AuthInitializer

components/
├── auth/               # AuthInitializer (dev auto-login)
├── capture/            # CaptureInput, MoodSelector, VoiceRecorder, OrganizeModal
├── layout/             # Header, BottomNav
└── ui/                 # Button, Input, ConstraintCard, EnergyCard, modals

lib/
├── supabase/           # client.ts (browser), server.ts (SSR)
├── googleCalendar.ts   # OAuth popup flow
└── layout/             # Header utilities, CalendarBadge

services/
└── supabaseService.ts  # All database CRUD operations

hooks/useAuth.ts        # Auth state management
utils/conflictDetector.ts  # Time constraint overlap detection
types/index.ts          # TypeScript interfaces
middleware.ts           # Supabase session refresh
```

### Authentication Flow

1. `middleware.ts` refreshes Supabase session on every request
2. `useAuth()` hook manages session state with anonymous fallback
3. Separate Supabase clients for browser (`lib/supabase/client.ts`) and server (`lib/supabase/server.ts`)
4. Dev mode: `AuthInitializer` auto-logs in with `dev@manae.app`

### Data Flow

- **Capture**: Text + mood → `thoughts` table
- **Onboarding**: Dual persistence (Supabase DB + localStorage for UI flow)
- **Constraints**: Time availability rules with conflict detection via `conflictDetector.ts`
- **Google Calendar**: OAuth popup → `/api/auth/google` for secure token exchange

### Database Tables (Supabase)

- `users` - User profiles with onboarding status
- `thoughts` - Raw text captures with mood tags
- `items` - Organized tasks/projects
- `constraints` - Time availability rules

### Conventions

- **UI Language**: French (all user-facing text)
- **Database columns**: `snake_case`
- **Variables/functions**: `camelCase`
- **Components**: `'use client'` directive for interactive components
- **Supabase operations**: Always verify auth with `getUser()`, throw errors for UI handling

### Design System

- **Primary**: Teal (#14B8A6)
- **Secondary**: Slate (#334155)
- **Background**: Mint (#F0FDFA)
- **Fonts**: Geist Sans (body), Quicksand (headings)
- **CSS Variables**: Defined in `styles/globals.css`

### Google Calendar Integration

OAuth popup flow in `lib/googleCalendar.ts`:
1. Opens popup with Google OAuth URL
2. Callback page receives authorization code
3. Code sent via postMessage to parent
4. `/api/auth/google` exchanges code for tokens server-side
5. Tokens currently stored in localStorage (TODO: move to secure server storage)
