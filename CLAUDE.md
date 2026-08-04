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

npm run migrate:gallery    # One-off script: migrates images from Supabase Storage to public/gallery
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

### Schema changes have no migration tooling

There's a `supabase/` directory (CLI config, edge functions) but no `supabase/migrations/`. Tables are created by hand in the Supabase SQL Editor. Each table has a matching `.sql` file in `src/db/` (e.g. `contact_tickets.sql`, `site_settings.sql`) that documents its schema — these are **not** auto-applied; changes must be pasted into the Supabase dashboard's SQL Editor manually, and `src/db/types.ts` updated to match by hand. New tables need RLS policies written explicitly (see `site_settings.sql` for the pattern: public `SELECT`, `INSERT`/`UPDATE`/`DELETE` gated on `profiles.is_admin`) — RLS is enabled by default and silently blocks writes (`42501` errors) if no policy is added.

### Auth & admin gating

`AuthContext` wraps Supabase Auth and exposes `isAuthenticated`/`isAdmin` (derived from `profiles.is_admin`) plus separate `isLoading` (session bootstrap) and `isProfileLoading` (profile fetch) flags. Routes are gated by nesting `<RequireAuth>` / `<RequireAdmin>` in `App.tsx` (see the `/admin/*` routes). `RequireAdmin` only blocks on `isProfileLoading` when there's no `profile` yet (`isProfileLoading && !profile`) — Supabase revalidates the session in the background whenever the tab regains focus, and gating on `isProfileLoading` unconditionally would remount the whole admin page (closing any open dialog) on every tab switch.

Admin user creation goes through the `admin-create-user` Supabase Edge Function (`supabase/functions/admin-create-user`), not client-side signup, since it needs the service role key to set `is_admin` and bypass email confirmation.

### Image/gallery storage is not Supabase Storage

Images are static files served from `public/gallery/` by a standalone Express server (`server/upload.js`, run via `npm run server:upload`), not Supabase Storage. The DB (`gallery_images`, `gallery_albums`, plus `image`/`logo` columns elsewhere) only stores relative paths (e.g. `/gallery/<albumId>/file.jpg`); `src/config.ts` resolves `UPLOAD_URL` based on hostname (prod: `upload.lgbt-loom.fr`, dev: `localhost:8081`) and `getImageUrl()`/`ImageUpload.tsx` build the full URL. In dev, Vite proxies `/upload` to the upload server (see `vite.config.ts`). Uploaded files must be committed to `public/gallery/` to exist in production — there's no runtime persistence otherwise. `server/upload_SAV copy.js` is a stray backup file, not wired into any script.

### Admin CMS pattern

Every admin resource page (`pages/admin/Articles.tsx`, `Events.tsx`, `Partners.tsx`, ...) follows the same shape: a table with search, a shadcn `Dialog` reused for both create and edit (toggled via an `isCreating` flag), and a separate delete-confirmation `Dialog`. Long-form content (article body, event description) is edited with `@uiw/react-md-editor` (`MDEditor`) and stored as raw Markdown. `src/components/ui/dialog.tsx`'s `Dialog` wrapper has a workaround effect that force-releases Radix's scroll lock shortly after `open` becomes `false` — heavy children like `MDEditor` can otherwise leave `document.body` permanently `overflow: hidden` after the dialog closes.

`src/pages/admin/HomeSettings.tsx` edits a singleton `site_settings` row (`id = 1`, enforced by a `CHECK` constraint) that drives the homepage hero image/link and the navbar's external links (Boutique/Adhésion) — consumed via `useQuery(['siteSettings'], ...)` in `Navbar.tsx`, `Index.tsx`, and `SettingsRedirect.tsx` (used for the `/shop` and `/membership` redirect routes).

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
SUPABASE_SERVICE_ROLE_KEY  # only needed for scripts/migrate-gallery.js
```

## Deployment

The upload server (`server/upload.js`) runs separately from the main frontend (`upload.lgbt-loom.fr` in prod) — it must be deployed/restarted independently when changed.
