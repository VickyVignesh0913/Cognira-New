# Server Functions

## Overview
TanStack Start server-side API functions for the Cognira study companion. All functions are created via `createServerFn` and execute on the server (Cloudflare Workers / Node.js runtime). They handle authentication, database operations via Drizzle ORM on D1, file storage, and AI coach integration.

## Interface
- `getState` — Aggregates full user state (profile, tasks, habits, focus sessions, resources, coach messages, mastery) for dashboard hydration. Returns `{ signedIn: false }` if not authenticated, or `{ signedIn: true, user, profile, tasks, habits, sessions, resources, messages, mastery }`.
- `saveProfile` — Creates or updates the user profile with onboarding data, optional seed tasks/habits, and preferences (theme, widgets, sounds, etc.). Returns `{ ok: true }`.
- `buildStarter` — Seeds starter tasks and habits based on persona (`student` | `professional`) and profile subjects/skills; no-op if tasks already exist. Returns `{ ok: true, skipped?: true }`.
- `upsertTask` — Creates or updates a task (title, time window, category, repeat days, completion dates). Returns `{ ok: true, id: string }`.
- `deleteTask` — Deletes a task owned by the current user. Returns `{ ok: true }`.
- `upsertHabit` — Creates or updates a habit (title, icon, frequency, target, completion dates). Returns `{ ok: true, id: string }`.
- `deleteHabit` — Deletes a habit owned by the current user. Returns `{ ok: true }`.
- `saveFocusSession` — Records a completed focus session (duration, mode, subject) and awards coins (+10) and XP (+20). Returns `{ ok: true, id: string }`.
- `upsertResource` — Creates or updates a resource (link or uploaded file); enforces fileKey ownership prefix `public/resources/{userId}/`. Returns `{ ok: true, id: string }`.
- `deleteResource` — Deletes a resource and its associated storage file (if fileKey present). Returns `{ ok: true }`.
- `uploadResourceFile` — Uploads a file (PDF, image, text ≤8 MB) to storage under `public/resources/{userId}/` and returns `fileKey` and public URL. Returns `{ ok: true, fileKey: string, url: string }`.
- `coachReply` — Sends user message to AI coach (system prompt includes profile, tasks, habits, recent sessions) and persists both user and coach messages. Returns `{ reply: string }`.
- `addCoins` — Adjusts user coin balance (clamped to ±1000, floor at 0). Returns `{ ok: true }`.
- `logMastery` — Logs study minutes and confidence for a subject; aggregates into existing mastery entry or creates new one (logs capped at 60 entries). Returns `{ ok: true, id: string }`.
- `setMasteryConfidence` — Updates confidence (1–5) for a subject; creates entry with 0 minutes if none exists. Returns `{ ok: true, id: string }`.
- `deleteMastery` — Deletes a mastery entry by ID or subject name (case-insensitive). Returns `{ ok: true }`.
- `deleteAccount` — Hard-deletes all user data across all tables (profiles, tasks, habits, sessions, resources, coach messages, mastery, auth sessions/accounts/user). Returns `{ ok: true }`.

## Invariants
- All functions require authenticated user via `requireUser()` (throws 401 if no session).
- All database writes are scoped to `userId` from session; no cross-user access possible.
- `saveFocusSession` atomically awards coins/XP to profile after inserting session in the same transaction.
- `uploadResourceFile` validates MIME type (PDF, image, text/plain) and size ≤8 MB; stores under user-scoped key `public/resources/{userId}/`.
- `deleteResource` attempts storage deletion before DB deletion; storage errors are silently swallowed.
- `coachReply` truncates user message to 2000 chars; system prompt includes truncated context (tasks ≤6, habits ≤6, sessions ≤5).
- `logMastery` clamps minutes to [0, 480] and confidence to [1, 5]; requires at least one of minutes or confidence.
- `addCoins` clamps amount to ±1000 and ensures coins never go negative (floor at 0).
- `deleteAccount` deletes in dependency order: child tables first, then auth tables (session, account, user).
- ID generation uses timestamp + random suffix format: `{timestamp}-{random}` for collision resistance.

## Side Effects
- **Database (D1 via Drizzle ORM)**: Reads/writes to `profiles`, `tasks`, `habits`, `focusSessions`, `resources`, `coachMessages`, `masteryEntries`, `session`, `account`, `user` tables.
- **Storage (R2 via `@/lib/storage`)**: `uploadResourceFile` writes object to user-scoped location; `deleteResource` deletes object.
- **AI (via `@/lib/ai`)**: `coachReply` calls `ai.generateText` with constructed system prompt containing user context.
- **Authentication**: All functions depend on `@/lib/session.server` for `currentUser` / `requireUser` to enforce authentication.

## Verification
- Run: `npm run typecheck` (TypeScript strict validation)
- Run: `npm run db:migrate:local` (applies D1 migrations locally)
- Run: `npm run dev` (starts Vite + Cloudflare Workers dev server for manual testing)