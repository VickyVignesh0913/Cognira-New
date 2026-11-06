# MonstarX Integration Modules

## Overview
MonstarX-provided integrations for the Cognira app. These modules run on the owner's connected services (Cloudflare, Firebase, Stripe, etc.) and are available in both MonstarX previews and published apps without additional configuration. Server-only modules must only be imported inside server function handlers or server routes.

## Interface
- **calendar.ts** — `browserTimeZone()`, `calendarDateKey(instant, timeZone)`: Timezone resolution (client-only) and IANA timezone-aware Gregorian date key extraction for SSR-safe date handling.
- **checkout.ts** — `checkoutLink()`, `handoffCheckout()`, `useCheckout()`: Stripe Checkout link validation, frame-aware redirect fallback, and React hook for hosted checkout with reconciliation, deadline handling, and focus/visibility recovery.
- **clipboard.ts** — `copyText(text)`: Browser clipboard copy with async API primary and `execCommand` fallback for preview iframes that deny Clipboard API access.
- **cloudflare.ts** — `cloudflare.kv`, `cloudflare.r2`, `cloudflare.queue`, `cloudflare.vectorize`, `cloudflare.ai`, `cloudflare.browser`, `cloudflare.images`, `cloudflare.analytics`, `cloudflare.api()`: Server-only Cloudflare services (KV, R2, Queues, Vectorize, Workers AI, Browser Rendering, Images, Analytics Engine) via Worker bindings in production or REST API in previews; requires connected Cloudflare account.
- **countries.ts** — `COUNTRIES: readonly Country[]`, `Country` interface (code, code3, name, region, subregion, lat, lon): Generated world country list from Natural Earth 1:50m (public domain), sorted by name, used by `<WorldMap>`.
- **country-data.ts** — `countryData.call(country, tool, args)`, `countryData.tools(country)`: Server-only live public data for Singapore, Japan, Malaysia, India, Indonesia, UAE, Philippines (weather, transport, places, registries, prices, holidays); tools differ per country; requires MonstarX Country Data connector.
- **firebase.ts** — `firebaseClient(config)`, `parseServiceAccount()`, `toFirestoreValue()`, `fromFirestoreValue()`, `firebaseAuth`, `firebaseFirestore`, `firebaseStorage`, `firebaseMessaging`, `firebaseRealtime`: Server-only Firebase REST API client (Firestore, Auth, Storage, Messaging, Realtime Database) using service account JWTs via WebCrypto; no Firebase SDKs or firebase-admin needed; works on Cloudflare Workers.
- **map.tsx** — `<Map>`: Interactive MapLibre GL map (pan, zoom, markers, click handlers) with keyless OpenFreeMap styles (streets, light, dark, terrain) and optional Mapbox styles (including satellite) when Mapbox connector is connected; no API key required for base maps.
- **seo.ts** — `SeoConfig`, `SeoPageConfig`, `SeoQuestion`, `DEFAULT_SEO`: SEO/GEO configuration from workspace tab (site URL, titles, descriptions, Open Graph, Twitter cards, robots.txt, sitemap.xml, llms.txt, JSON-LD Organization, FAQPage, verification tokens); falls back to noindex when unset.
- **stripe.server.ts** — `stripeRequest()`, `retrieveCheckoutSession()`, `reconcileCheckoutSession()`, `createCheckoutSession()`, `StripeRequestError`, `StripeRequestOutcome`, `StripeRequestOptions`, `CheckoutSessionState`, `CheckoutSessionOptions`: Server-only Stripe API via fetch (no SDK); bounded I/O (15s default, 60s max), idempotency keys required for mutations, no automatic retries, explicit timeout/deadline handling, safe error classification (`configuration`, `invalid_request`, `timeout`, `network`, `provider`, `invalid_response`) with recovery guidance.
- **validation.ts** — `validateInput()`, `inputIssues()`, `invalidInput()`, `InputResult`, `InputError`, `InputIssue`: Shared Zod-safe validation types used by `actions.ts` and server functions; serializable, never includes submitted values.
- **world.tsx** — `<WorldMap>`: Clickable world map (country selection, choropleth values, markers) rendered from bundled Natural Earth outlines (public domain); no map provider, no API key, no WebGL; works in SSR, screenshots, offline; projections: `natural`, `equirectangular`, `mercator`.
- **world-shapes.ts** — `CountryRings` type, generated country outline polygons (GeoJSON rings by ISO alpha-2): 170KB generated data from Natural Earth 1:50m, used by `<WorldMap>`.

## Invariants
- Server-only modules (`cloudflare.ts`, `country-data.ts`, `firebase.ts`, `stripe.server.ts`) must only be imported inside server function handlers (`createServerFn`) or server routes; never from client components or route loaders directly.
- `cloudflare` services require `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (set by MonstarX when Cloudflare is connected in Backend → Cloud).
- `countryData` requires `MONSTARX_COUNTRY_DATA_URL` and `MONSTARX_DATA_TOKEN` (set by MonstarX when Country Data is enabled for specific countries).
- `firebaseClient` requires `FIREBASE_SERVICE_ACCOUNT` (pasted key file JSON); `FIREBASE_API_KEY`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_DATABASE_URL` optional.
- `stripeRequest` requires `STRIPE_SECRET_KEY` (set by MonstarX when Stripe is connected).
- `useCheckout` and `stripeRequest` enforce idempotency keys for all mutations; callers must persist the key and exact parameters before calling, and reuse them on recovery.
- `<Map>` falls back to OpenFreeMap `terrain` style when `satellite` is requested but Mapbox is not connected.
- `<WorldMap>` uses pre-bundled outlines; no network requests for map rendering.
- `calendarDateKey` throws on invalid/non-IANA timezones and on non-absolute ISO timestamps (date-only strings rejected).
- Validation functions (`validateInput`, `inputIssues`) are pure and serializable; safe for both client and server.

## Side Effects
- **Network**: `cloudflare.ts` calls Cloudflare REST API (`api.cloudflare.com`) in previews, Worker bindings in production; `country-data.ts` calls MonstarX Country Data endpoint; `firebase.ts` calls Google OAuth token endpoint, Firestore REST, Firebase Auth REST, GCS, FCM, Realtime Database; `stripe.server.ts` calls `api.stripe.com`; `map.tsx` loads map tiles from OpenFreeMap or Mapbox CDN.
- **Crypto**: `firebase.ts` uses WebCrypto (`crypto.subtle`) for RS256 JWT signing.
- **Timers**: `checkout.ts` `useCheckout` uses `setTimeout` for action deadlines (default 30s, max 120s) and focus/visibility listeners for reconciliation.
- **LocalStorage/SessionStorage**: None directly (consumer components may persist checkout state).

## Verification
- Run: `npm run typecheck`
- Run: `npm run build`