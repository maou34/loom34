# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Vite dev server on :8080 (proxies /upload to the upload server on :8081)
npm run build             # Production build
npm run build:dev         # Development-mode build
npm run lint               # ESLint
npm run preview            # Serve the production build on :4173

npm run server:upload      # Runs the separate Express image-upload server (server/upload.js), :8081

npm run db:start           # Local Supabase in Docker (API :54321, Studio :54323, test mailbox :54324)
npm run db:reset           # Rebuild the local DB from supabase/migrations + supabase/seed.sql
npm run db:stop            # Stop the local Supabase containers (data kept)
npm run dev:localdb        # Vite dev server against the LOCAL Supabase (.env.localdb)
npm run server:upload:localdb  # Upload server checking admin tokens against the local Supabase

npm run migrate:gallery    # One-off script: migrates images from Supabase Storage to public/gallery
npm run compress:gallery   # Re-compresses images already in public/gallery (resize + re-encode); dry-run by default, `-- --write` to apply
npm run pull:gallery        # Downloads every image from the upload server (prod by default) into public/gallery/ locally
npm run seo:generate        # Regenerates public/sitemap.xml (scripts/generate-seo.js)
npm run seo:validate        # Validates SEO output (scripts/validate-seo.js)
```

There is no test suite configured in this repo.

## Architecture

React 18 + TypeScript SPA built with Vite, Tailwind + shadcn/ui (Radix), React Router v6, and TanStack Query. Supabase (Postgres + Auth) is the backend; there is no custom API server for app data.

### Data layer: three different Supabase surfaces exist

- **`@/db/client`** (`db`) — the client actually used almost everywhere, typed against `src/db/types.ts` (hand-maintained `Database` type, kept in sync manually — see below).
- **`@/lib/supabaseClient`** (`supabase`) — a second, untyped client instance, used only by `pages/auth/ResetPasswordRequest.tsx` and `pages/auth/UpdatePassword.tsx`.
- **`@/integrations/supabase/types.ts`** — a separate, likely stale copy of the `Database` type (no client of its own), used only for type annotations in the gallery admin components and `EditUserForm.tsx`.

When adding a table/column, update `src/db/types.ts` — the one `@/db/client` actually uses — and check whether `src/integrations/supabase/types.ts` needs the same change if the file you're touching imports types from there.

### Schema changes: migrations + local Supabase (Docker)

Since 20/11/2026 (branch `feature/supabase-docker`, plan in `documents/docker/PLAN.md`) the schema lives in **`supabase/migrations/`**. `20261120074827_remote_schema.sql` is the baseline pulled from prod with `supabase db pull` (minus Supabase-internal realtime/storage triggers and the legacy storage policies, removed by hand — see the note at its end); it is recorded as applied in prod's migration history. The `src/db/*.sql` files are **historical** (what was pasted by hand before) — never edit them for new changes. New schema change: `supabase migration new <name>` → test locally with `npm run db:reset` → Florent's go-ahead → `supabase db push --remote` to prod (replaces pasting into the SQL Editor; `supabase migration list --remote` shows what prod already has). Since CLI 3 (installed 20/11/2026, binary in `/usr/local/bin`) every `db`/`migration` command targets the **local** stack unless `--remote` is passed. Still update `src/db/types.ts` by hand.

Local stack: `npm run db:start` (Docker; Studio on :54323, test mailbox on :54324 — every local e-mail lands there), `npm run db:reset` (rebuilds from migrations + `supabase/seed.sql`: fictional content only, admin `admin@loom.local` / `loom-local-admin`, local Vault secrets), `npm run dev:localdb` (front on the local DB, `.env.localdb` — public local CLI values, committed) and `npm run server:upload:localdb` (upload server checking tokens against the local DB). Local Edge Functions read the git-ignored `supabase/functions/.env` (HelloAsso **sandbox** credentials + the shared secrets from `seed.sql`); the local cron calls them too. In `config.toml`, `[auth.email] enabled` turns e-mail login on/off (CLI 2 called it `enable_signup`, which looked like the sign-up switch); sign-ups are closed by `[auth] enable_signup = false`. The local mailbox section is `[local_smtp]` (was `[inbucket]`). Storage/Realtime/Analytics are disabled locally (unused). Edge Function URLs are no longer hard-coded: triggers and the cron call `public.edge_function_url(name)`, which reads the Vault secret **`project_url`** (prod: `https://abqhawhalbrqgtepaclc.supabase.co`, local/self-hosted: `http://kong:8000`) — that secret must exist in prod before migration `20261120090000` is pushed. New tables need RLS policies written explicitly (see `site_settings.sql` for the pattern: public `SELECT`, `INSERT`/`UPDATE`/`DELETE` gated on `profiles.is_admin`) — RLS is enabled by default and silently blocks writes (`42501` errors) if no policy is added. Separately, tables created in the SQL Editor don't automatically get SQL privileges for the API roles on this project: even `service_role` (which bypasses RLS) gets `permission denied for table …` until an explicit `GRANT … TO service_role` (and to `anon`/`authenticated` if the front needs it) is added — see `helloasso_ticketing.sql`.

### Auth & admin gating

`AuthContext` wraps Supabase Auth and exposes `isAuthenticated`/`isAdmin` (derived from `profiles.is_admin`) plus separate `isLoading` (session bootstrap) and `isProfileLoading` (profile fetch) flags. Routes are gated by nesting `<RequireAuth>` / `<RequireAdmin>` in `App.tsx` (see the `/admin/*` routes). `RequireAdmin` only blocks on `isProfileLoading` when there's no `profile` yet (`isProfileLoading && !profile`) — Supabase revalidates the session in the background whenever the tab regains focus, and gating on `isProfileLoading` unconditionally would remount the whole admin page (closing any open dialog) on every tab switch.

Admin user creation goes through the `admin-create-user` Supabase Edge Function (`supabase/functions/admin-create-user`), not client-side signup, since it needs the service role key to set `is_admin` and bypass email confirmation.

### Image/gallery storage is not Supabase Storage

Images are static files served from `public/gallery/` by a standalone Express server (`server/upload.js`, run via `npm run server:upload`), not Supabase Storage. The DB (`gallery_images`, `gallery_albums`, plus `image`/`logo` columns elsewhere) only stores relative paths (e.g. `/gallery/<albumId>/file.jpg`); `src/config.ts` resolves `UPLOAD_URL` based on hostname (prod: `upload.lgbt-loom.fr`, dev: `localhost:8081`) and `getImageUrl()`/`ImageUpload.tsx` build the full URL. In dev, Vite proxies `/upload` to the upload server (see `vite.config.ts`). Uploaded files must be committed to `public/gallery/` to exist in production — there's no runtime persistence otherwise. `server/upload_SAV copy.js` is a stray backup file, not wired into any script.

**Upload server auth:** the write routes (`POST /upload[/]`, `POST /upload/albums`, `DELETE /upload/albums/:id`, `DELETE /upload/images`) go through `requireAdmin` (`server/auth.js`): the admin front sends its Supabase session token (`Authorization: Bearer …`, built by `uploadAuthHeaders()` in `src/lib/uploadAuth.ts` — use it for any new write call), the server checks it against `/auth/v1/user` and requires `profiles.is_admin` (results cached 1 min per token). GET routes stay public (the Photos pages use them). The server needs `SUPABASE_URL` + `SUPABASE_ANON_KEY` (or the `VITE_` ones; it loads `.env.local` / `.env` from its working directory on Node ≥ 20.12) — without them every write returns 503 rather than staying open. Before Nov 2026 these routes had no auth at all (CORS only, which doesn't stop curl). `components/admin/gallery/{AdminGallery,AlbumManager,DragDropGallery}.tsx` are not imported anywhere (legacy) and don't send the token.

Uploads are compressed server-side before being written to disk: `server/imageCompression.js` (resize to 2400px max on the longest side, `withoutEnlargement`, JPEG/WebP re-encoded at quality 82, PNG at max compression, EXIF orientation baked in via `.rotate()` then stripped) is shared by `server/upload.js` (new uploads) and `scripts/compress-gallery.js` (one-off retroactive pass over everything already in `public/gallery`, dry-run by default — `-- --write` to apply). `scripts/pull-gallery.js` is the counterpart for going the other way: it downloads every image from a running upload server (prod by default, override with `PULL_UPLOAD_URL`) into local `public/gallery/`, incrementally by default (skips files already present locally; `--force` re-downloads everything).

`.gitignore` only tracks `public/gallery/images/` (`public/gallery/*` is otherwise ignored) — that folder holds the site's own static assets (hero fallback, etc.) referenced by hardcoded paths, while per-album upload folders are meant to live only on the upload server's disk, not in the repo. That ignore rule was added late (Nov 2025) and doesn't retroactively untrack files committed before it existed — `public/gallery/unclassified/` had ~84 such files still in the git index despite being ignored, discovered when a bulk edit made them show up as modified. If a bulk script touches `public/gallery/` and unexpected album files show up in `git status`, check `git ls-files public/gallery` for stragglers like this and `git rm --cached` them rather than assuming the ignore rule is broken.

### HelloAsso ticketing (in progress, branch `feature/billetterie-helloasso`)

Paid events sell tickets through HelloAsso; decisions already made, don't revisit them without asking:

- **`events` is still the table the site reads, but HelloAsso is the source of truth for ticketed events.** An event has ticketing only if its optional `helloasso_form_slug` is set; events without one (apéros, etc.) behave exactly as before. `sync-events` **auto-imports** every upcoming HelloAsso Event form not yet linked (site slug = form slug, `-2`… on collision; fallback image `/loom_logo_square.jpg`), and on every sync **overwrites** title/date/time/location/description (HTML → Markdown via `htmlToMarkdown`)/image from HelloAsso — admin edits to those fields on a linked event are lost (the admin form warns about it). Publication follows `HELLOASSO_PUBLISH_MODE`: `draft` (default, **and LOOM's choice for prod too**) = imported unpublished, publication left to the site admin; `follow` = published iff the form is `Public` on HelloAsso. LOOM keeps its HelloAsso forms **Private** so people buy through the site (iframe/mobile bar use the direct link, which works for private forms — verified with a real sandbox payment), and the API reports both a private form and a draft as `state: "Private"`, so `follow` can't tell « private and ready » from « unfinished draft » — don't switch to it while forms are kept private. (Server-side `curl` on helloasso-sandbox.com pages returns 403 — that's HelloAsso's bot protection, not the private state.) **Sale period** (form `saleStartDate`/`saleEndDate`, only present when set on the HelloAsso form — `saleEndDate` verified in sandbox): synced into `helloasso_sale_start_date`/`helloasso_sale_end_date`. In `draft` mode, reaching `saleStartDate` publishes the event **once** (`helloasso_auto_published_at` records it, so an admin can unpublish afterwards; a changed `saleStartDate` re-arms it; no start date = stays draft until published by hand). Past `saleEndDate`, `getTicketAvailability()` returns `closed`: the event stays listed but shows « Inscriptions closes » and hides the button/iframe/mobile bar like `sold_out` — use `isBookable()`/`closedLabel()` rather than testing `sold_out`. All this lives in `supabase/functions/_shared/sync.ts`; the webhook also triggers an import when notified about an unknown form. Schema: `src/db/helloasso_ticketing.sql` (pasted manually, like every other `.sql` here — no `supabase/migrations/`).
- **Backend = Supabase Edge Functions, no PHP/extra server.** `sync-events` (run by a Supabase cron, `verify_jwt = false`, authenticated by an `x-sync-secret` header matching `SYNC_EVENTS_SECRET`; optional body `{"slug": ...}` to sync one event) pulls tier prices into `ticket_prices` and counts sold tickets into `tickets_sold` for every upcoming event with a slug, + `helloasso_synced_at`. HelloAsso API helpers (token cache, paginated GET, `countSoldTickets`) live in `supabase/functions/_shared/helloasso.ts`, shared with the webhook. Every HelloAsso call sends its own `User-Agent` (`USER_AGENT` in `_shared/helloasso.ts`): the **production** API's Cloudflare answers an HTML 403 page to the Edge Functions' default UA (it contains `SupabaseEdgeRuntime`) — the sandbox doesn't, so this only shows up in prod; a `HTTP 403 [cloudflare]` in sync errors means that. Don't add `/// <reference deno.ns="true" />` to new functions: `deno check` rejects it (`admin-create-user` still has it). `helloasso-webhook` receives HelloAsso notifications (Order/Payment/Form), authenticated by a `?secret=<HELLOASSO_WEBHOOK_SECRET>` query param (HelloAsso can't send custom headers, and doesn't sign payloads); it only reads the form slug from the payload — never stores or logs it, it contains payer data — and re-runs the same per-event sync as the cron (`syncEvent` in `supabase/functions/_shared/sync.ts`). Returns 500 on sync failure so HelloAsso retries. HelloAsso notifies ~3 s after an order, before the new item shows up in `/items` (observed in sandbox), so the webhook also re-syncs in the background at +10 s and +30 s via `EdgeRuntime.waitUntil`; the 15-min cron (`src/db/helloasso_cron.sql`, pg_cron + pg_net, secret in Supabase Vault) is the safety net. Both functions have `verify_jwt = false` in `supabase/config.toml`, like `admin-create-user`. To run one locally: `docker run --env-file <subset of .env.local + SUPABASE_URL> -v $PWD/supabase/functions:/f denoland/deno:2.1.4 deno run --allow-net --allow-env /f/<name>/index.ts` (needs the real `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — not the publishable key).
- **The OAuth token is cached in `helloasso_token`** (singleton row `id = 1`): RLS enabled with no policies, so only the service role used by Edge Functions can read it, not even admins.
- **Capacity:** the HelloAsso API never exposes the form-level « Limiter le nombre total de participants » cap (checked on a published sandbox form, Nov 2026, and absent from the official OpenAPI spec), but `GET …/forms/{type}/{slug}/stats` gives each tier's `maxEntries`. `sync-events` writes the sum of the Registration tiers' limits into `helloasso_capacity` (NULL if any tier is unlimited). `ticket_capacity` is an optional admin override (for multi-tier events or a global-only cap); effective capacity = `COALESCE(ticket_capacity, helloasso_capacity)` — use `getCapacity()` from `src/lib/ticketing.ts` in the front, never `ticket_capacity` alone. `tickets_remaining` is a Postgres generated column built on that COALESCE — never write it, and it's absent from the `Insert`/`Update` types. LOOM's convention is **one single tier per event with its limit set on the tier** (that limit is both HelloAsso's real cap and the site's gauge) plus a promo code for the member discount; LOOM staff check after the fact, in the HelloAsso back-office export, that promo-code users were entitled to it.
- **Promo codes:** the API can't tell whether a promo code exists on a form (no field; `/discount-codes` is 403 for the org's API key), only that a sold item used one (`item.discount = { code, amount }`). So `ticket_member_discount` is an admin checkbox that shows a « tarif réduit adhérent avec code promo » line under the price, and `sync-events` counts promo-code sales into `tickets_sold_discounted` (counter only), shown in the admin event list as « N/capacity inscrits · dont M au tarif réduit ».
- **Counters only, no personal data:** never store participants' names, emails or order details in Supabase. `tickets_sold`/`tickets_sold_discounted`/`ticket_prices`/`helloasso_synced_at` are written only by the Edge Functions; the admin form (`pages/admin/Events.tsx`) edits `helloasso_form_slug` (accepts a pasted HelloAsso URL, normalized to the slug), `ticket_capacity` and `ticket_member_discount`, and nulls the synced columns when the slug changes, since they belonged to the previous form.
- **Front code:** all ticketing logic (form/widget URLs, availability thresholds, price/seat labels) lives in `src/lib/ticketing.ts`; `EventCard` takes a `ticketing` prop (callers pass the whole event row), `EventDetail` renders the sidebar prices/seat gauge, the desktop `#billetterie` iframe section and the mobile fixed bar. Mockups are in `documents/maquette/`. The public HelloAsso URLs are built from `VITE_HELLOASSO_BASE_URL` (default `https://www.helloasso.com`, set it to `https://www.helloasso-sandbox.com` locally) and `VITE_HELLOASSO_ORG_SLUG` (default: the prod org slug), see `src/config.ts`.
- **UI:** paid event cards show a single « S'inscrire » button; `EventDetail` embeds the HelloAsso iframe on desktop, and on mobile shows a fixed bottom bar that opens HelloAsso full screen. Availability states: disponible / presque complet / complet.
- **Verified against the sandbox:** form tiers come as `tiers[].{label, price (cents), tierType}`; a paid ticket is an item with `type: Registration, state: Processed` (free tickets, `Registered`, not yet observed). Public form URL `/associations/<org>/evenements/<slug>`, iframe `…/widget`.
- **Credentials:** sandbox only during development (`helloasso-sandbox.com`, org `loom-test`), in the untracked `.env.local` and in `supabase secrets`: `HELLOASSO_API_URL`, `HELLOASSO_CLIENT_ID`, `HELLOASSO_CLIENT_SECRET`, `HELLOASSO_ORG_SLUG`, `SYNC_EVENTS_SECRET`, `HELLOASSO_WEBHOOK_SECRET`, `HELLOASSO_PUBLISH_MODE`, `HELLOASSO_IMPORT_CREATED_AFTER` (optional ISO date: only forms created on HelloAsso after it are auto-imported — set it to the go-live date in prod so pre-existing forms are ignored; unset = no filter; an unparsable value makes the import fail rather than import everything) — never with a `VITE_` prefix, which would ship them to the browser. Manual steps outside the code: registering the webhook URL in the HelloAsso back-office, enabling the cron in the Supabase dashboard, switching to production credentials later.

### Admin CMS pattern

Every admin resource page (`pages/admin/Articles.tsx`, `Events.tsx`, `Partners.tsx`, ...) follows the same shape: a table with search, a shadcn `Dialog` reused for both create and edit (toggled via an `isCreating` flag), and a separate delete-confirmation `Dialog`. Long-form content (article body, event description) is edited with `@uiw/react-md-editor` (`MDEditor`) and stored as raw Markdown. `src/components/ui/dialog.tsx`'s `Dialog` wrapper has a workaround effect that force-releases Radix's scroll lock shortly after `open` becomes `false` — heavy children like `MDEditor` can otherwise leave `document.body` permanently `overflow: hidden` after the dialog closes.

`src/pages/admin/HomeSettings.tsx` edits a singleton `site_settings` row (`id = 1`, enforced by a `CHECK` constraint) that drives the homepage hero image/link and the navbar's external links (Boutique/Adhésion) — consumed via `useQuery(['siteSettings'], ...)` in `Navbar.tsx`, `Index.tsx`, and `SettingsRedirect.tsx` (used for the `/shop` and `/membership` redirect routes). `hero_image_width`/`hero_image_height` are captured automatically by `ImageUpload.tsx` (reads `naturalWidth`/`naturalHeight` off the uploaded file) whenever the hero image is set in `HomeSettings.tsx`; `Index.tsx` uses them to reserve the hero image's aspect ratio via inline `style={{ aspectRatio }}` before it loads, avoiding layout shift (CLS) — rows saved before this field existed just render without a reserved ratio until re-saved from the admin.

### Markdown rendering

Content authored via `MDEditor` is rendered on public detail pages (`ArticleDetail.tsx`, `EventDetail.tsx`) with `react-markdown` + `remark-gfm` inside a Tailwind Typography `prose` wrapper — the `@tailwindcss/typography` plugin must stay registered in `tailwind.config.ts`'s `plugins` array, or `prose` classes silently do nothing (Tailwind's base reset strips all default heading/list/quote styling otherwise). Card/preview components (`EventCard.tsx`) must not render the raw Markdown string directly — use `stripMarkdown()` from `src/lib/markdown.ts` to get plain text for excerpts, SEO meta descriptions, and structured data.

### SEO

`useSEO` (`src/hooks/useSEO.ts`) plus `SEOPage.tsx`/`InternalLinks.tsx`/`SEOStructuredData.tsx` components handle per-page meta tags, Open Graph/Twitter cards, and JSON-LD. `scripts/generate-seo.js` produces `public/sitemap.xml` (run via `npm run seo:generate` or as part of `npm run build:seo`).

### Path alias

`@/*` maps to `src/*` (configured in `vite.config.ts` and `tsconfig.json`).

## Environment variables

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_UPLOAD_URL           # optional; defaults based on hostname (see src/config.ts)
VITE_HELLOASSO_BASE_URL   # optional; HelloAsso site for ticketing links/iframe (sandbox locally)
VITE_HELLOASSO_ORG_SLUG   # optional; HelloAsso organization slug (defaults to the prod org)
SUPABASE_SERVICE_ROLE_KEY  # only needed for scripts/migrate-gallery.js
```

## Deployment

The upload server (`server/upload.js`) runs separately from the main frontend (`upload.lgbt-loom.fr` in prod) — it must be deployed/restarted independently when changed. When a change touches both (e.g. the upload auth), deploy the front first, then the server: an old front talking to a new server loses uploads, the reverse is harmless.
