# Routes

## Overview
File-based routing layer using TanStack React Router. Defines all application page routes and API endpoints. Each route file exports a `Route` object created via `createFileRoute` with loaders, components, and server handlers.

## Interface
- **Page Routes** (client + server components):
  - `/` — `index.tsx` — Landing/onboarding flow with demo personas
  - `/login` — `login.tsx` — Email/password + Google OAuth sign-in
  - `/onboarding` — `onboarding.tsx` — Profile setup (persona, subjects/skills, goals)
  - `/home` — `home.tsx` — Dashboard with streak, focus, tasks, coach tip, weekly chart
  - `/routine` — `routine.tsx` — Daily/weekly/monthly task scheduler with repeat rules
  - `/focus` — `focus.tsx` — Pomodoro/Deep Work timer with ambient sound, subject tagging
  - `/habits` — `habits.tsx` — Habit tracker with streak analytics (daily/weekdays/weekends)
  - `/mastery` — `mastery.tsx` — Subject/skill mastery log with confidence (1–5) and focus minutes
  - `/library` — `library.tsx` — Resource library (PDF upload, links, categorization)
  - `/coach` — `coach.tsx` — AI chat coach with local context (tasks, habits, sessions)
  - `/settings` — `settings.tsx` — Theme, motion, ambient, widgets, sounds, data reset
- **API Routes** (server-only handlers under `./api/`):
  - `/api/auth/*` — `api/auth.$.ts` — Better Auth endpoints (sign-up, sign-in, session, sign-out)
  - `/api/files/*` — `api/files.$.ts` — Secure file serving (public redirect, private user-scoped)
- **SEO/Static Routes** (server handlers):
  - `/llms.txt` — `llms[.]txt.ts` — LLM answer-engine markdown (llmstxt.org)
  - `/robots.txt` — `robots[.]txt.ts` — Crawl rules from SEO config
  - `/sitemap.xml` — `sitemap[.]xml.ts` — Indexable page list from SEO config
- **Root Shell** — `__root.tsx` — HTML shell, SEO head, global styles, not-found fallback

## Invariants
- **File-based routing convention**: Route path derives from file path under `src/routes/` (e.g., `coach.tsx` → `/coach`).
- **TanStack Router API**: Every route exports `Route = createFileRoute('<path>')({ loader?, component?, server? })`.
- **Loader data typing**: `Route.useLoaderData()` returns the loader's return type; components consume it.
- **Server handlers**: `server.handlers.{GET,POST,...}` run on the edge (Cloudflare Workers) with typed `request` and `params`.
- **Authentication gating**: Pages check `getSessionUser()` in loaders; API routes use `currentUser()` from `session.server`.
- **Local-first persistence**: Most UI state (tasks, habits, sessions, mastery, resources) reads/writes `localStorage` via `@/lib/cognira`; server sync is best-effort (`catch(() => null)`).
- **Demo mode**: Unauthenticated users see seeded demo data (`demoTasks`, `demoHabits`, `demoSessions`) from `@/lib/cognira`.
- **Event bus**: `window.dispatchEvent(new Event('cognira-data'))` notifies all tabs/components of localStorage changes.
- **Profile-driven UI**: Persona (`student` | `professional`) controls labels (Subjects/Skills), default categories, and coach context.

## Side Effects
- **localStorage reads/writes**: `cognira-tasks`, `cognira-habits`, `cognira-sessions`, `cognira-mastery`, `cognira-resources`, `cognira-profile`, `cognira-prefs`, `cognira-coach`.
- **Server mutations** (via `@/server/cognira`): `saveFocusSession`, `logMastery`, `setMasteryConfidence`, `deleteMastery`, `coachReply`, `uploadResourceFile`, `saveFocusSession`.
- **Auth side effects**: `authClient.signIn/Up.email`, `authClient.signIn.social` (Better Auth) — sets HTTP-only session cookie.
- **File storage**: `storage.get/put` (R2 via `@/lib/storage`) for uploaded PDFs/images; public keys redirect, private keys enforce ownership.
- **Cross-tab sync**: `storage` event listener reloads data when another tab modifies localStorage.

## Verification
- Run: `npm run typecheck` (TypeScript strict mode)
- Run: `npm run build` (Vite + TanStack Start production build)