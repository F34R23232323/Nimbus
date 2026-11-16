# Nimbus: repository guide for coding agents

This file is the working contract for AI agents changing Nimbus. Read it before editing code. It describes the current repository; when code and this file disagree, inspect the code, fix the task, and update this guide in the same change. Follow the user's current instructions over this file.

## What Nimbus is

Nimbus is a self-hosted image and file host. It offers public discovery pages, personal workspaces, file sharing, a GIF Studio, API and ShareX uploads, and an optional Discord bot. The web app is SvelteKit 2 with Svelte 5 and TypeScript. Server state is stored in SQLite using `better-sqlite3`; originals and thumbnails live on disk. Image processing uses `sharp`; GIF encoding uses `gifenc`; the bot uses `discord.js` 14. The production build uses `@sveltejs/adapter-node` and Node.js 22.6+.

The application is one instance with a local data directory. Do not casually make assumptions about multi-replica deployment, object storage, email delivery, or an external database. There is no email password reset flow and no video-to-GIF converter in the current code.

## Agent rules

1. **Understand the owning path first.** Trace a user-visible change from Svelte page through its `+page.server.ts` or `+server.ts`, into `$lib/server`, database fields, and any public URL that exposes it.
2. **Keep authorization at the server boundary.** Hiding a control in Svelte is not access control. Use `requireUser`, `requireAdmin`, `assertCanUpload`, `canView`, `canManage`, and ownership checks where appropriate. Preserve `public`, `unlisted`, and `private` semantics.
3. **Protect real data and secrets.** Do not print or commit `.env`, `data/`, API keys, tokens, bot secrets, password hashes, session IDs, user uploads, or real database rows. Use a disposable `DATA_DIR` for demos, tests, and screenshots. Never run `npm run seed` on a real instance without an explicit request.
4. **Preserve files and database together.** A file row points to an original and perhaps a thumbnail. Update cleanup, migrations, and backup guidance when changing that relationship. SQLite schema changes are currently inline in `src/lib/server/db.ts` with additive compatibility checks.
5. **Keep the UI coherent.** Reuse components and tokens from `src/lib/components` and `src/app.css`. Check desktop and narrow layouts, keyboard behavior, labels, empty states, pending states, errors, and the dark/light themes.
6. **Update docs with behavior.** When routes, env vars, settings, API payloads, bot commands, or visible features change, update `README.md` and this file. Refresh affected screenshots if the changed screen is shown in the README.
7. **Validate the changed surface.** Run `npm run check` for Svelte/TypeScript changes and `npm run build` for deployable changes. Use a focused manual check or meaningful test for security-sensitive or complex paths. This repo has no dedicated test script at present.
8. **Commit every completed change to Git with a proper description.** See the Git workflow below. This applies to documentation, code, assets, and fixes. Stage only task files; inspect the staged diff; use an imperative subject that says what changed and a body explaining why and verification when useful. Do not silently leave finished edits uncommitted. A newer explicit user instruction can override this rule.
9. **Do not deploy or publish as a side effect of editing.** Complete and verify local work. Follow the user's deployment instructions when provided.

## Quick commands

| Task | Command | Notes |
| --- | --- | --- |
| Install | `npm install` | Native modules include `better-sqlite3` and `sharp`. |
| Develop | `npm run dev` | Vite, normally `http://localhost:5173`. |
| Type and Svelte check | `npm run check` | Runs `svelte-kit sync` then `svelte-check`. |
| Production build | `npm run build` | Creates `build/` for adapter-node. |
| Start web and bot | `npm run start` | `scripts/start.mjs` starts web, waits for health, then starts/restarts bot. |
| Start web only | `npm run start:web` | Production build required. |
| Start bot only | `npm run start:bot` | Run one bot process per token. |
| Register bot commands | `npm run bot:register` | Needs Discord configuration. |
| Seed demo data | `npm run seed` | Demo-only; requires schema initialized by the web app. |
| Reset password | `npm run reset-password -- <email-or-username> <new-password>` | Operates on the configured data directory. |

Copy `.env.example` to `.env` for local operation. The example is a template, not a production secret. `.env` and `data/` are ignored by Git. `npm run start` requires a successful build first. `compose.yaml` publishes the container on host loopback at `${NIMBUS_PORT:-3000}` and mounts the `nimbus-data` volume at `/app/data`. The container process runs as `node`.

## Repository map

```text
src/
  app.html, app.css          HTML shell, tokens, global styles
  app.d.ts                  SvelteKit Locals typing
  hooks.server.ts           storage setup, auth context, form-origin check, headers
  lib/
    components/             reusable UI (Header, Footer, FileCard, dialogs, inputs)
    actions/                portal and submit confirmation actions
    stores/                 toast, theme, accent, confirm state
    server/                 database, auth, uploads, media, shares, collections, tags
    types.ts                shared server/client models
    visibility.ts           public/unlisted/private mapping
    utils/format.ts         date, number, byte, text helpers
  routes/                   file-based pages and HTTP endpoints
bot/index.ts               Discord command registration and bot runtime
scripts/start.mjs          web and bot supervisor
scripts/seed.mjs           disposable demo content
scripts/reset-password.mjs offline password utility
static/                    logos, favicon, robots
docs/screenshots/          README screenshots from disposable demo data
Dockerfile, compose.yaml   container deployment
```

### Shared UI

`src/routes/+layout.svelte` wraps public and private screens with the header, footer, toast, and confirm hosts. `src/routes/dashboard/+layout.svelte` adds the workspace header and navigation groups. Common building blocks include `Avatar`, `FileCard`, `FilePicker`, `CollectionPicker`, `Select`, `Modal`, `SlideOver`, `Pagination`, `EmptyState`, `StatCard`, and `CopyButton`. Use `Icon.svelte` and existing CSS utility classes instead of introducing a second icon or styling system for a small change.

`src/app.css` owns theme variables and shared component styles. `src/lib/stores/ui.ts` holds theme, accent, reduced-motion, and toast state. A page title belongs in `<svelte:head>`. Forms generally use SvelteKit actions and `enhance`; client-side upload and GIF jobs call HTTP APIs.

## Route inventory

### Public and account pages

| Route | Owner | Purpose |
| --- | --- | --- |
| `/` | `src/routes/+page.*` | Landing page, public stats, recent images, tags, collections. |
| `/explore` | `src/routes/explore/+page.*` | Search and filter the public feed. |
| `/login` | `src/routes/login/+page.*` | Sign in, create session, safe `next` redirect. |
| `/register` | `src/routes/register/+page.*` | Register when enabled; may require approval. |
| `/logout` | `src/routes/logout/+server.ts` | Destroy session and clear cookie. |
| `/p/[id]` | `src/routes/p/[id]/+page.*` | Public file page, likes, bookmarks, comments, reports. |
| `/c/[slug]` | `src/routes/c/[slug]/+page.*` | Public collection and child navigation. |
| `/u/[username]` | `src/routes/u/[username]/+page.*` | Public profile and uploads. |
| `/s/[slug]` | `src/routes/s/[slug]/+page.*` | Share page, password/expiry/view-limit access. |
| `/s/[slug]/raw` | `src/routes/s/[slug]/raw/+server.ts` | Authorized original file behind share. |
| `/short/[code]` | `src/routes/short/[code]/+server.ts` | Tracked redirect. |
| `/i/[id]` | `src/routes/i/[id]/+server.ts` | Original bytes, with permission checks. |
| `/t/[id]` | `src/routes/t/[id]/+server.ts` | Thumbnail bytes, with permission checks. |

The original route may include a file extension when the `directFileLinks` setting is enabled. Do not infer public access from possession of an `/i` or `/t` URL. Share URLs use `/s/[slug]` and `/s/[slug]/raw`; expired and password-protected shares must continue to enforce their own gates.

### Workspace pages

The dashboard layout redirects anonymous visitors to `/login?next=…`. Individual server actions still need their own access checks.

| Route | Purpose / main actions |
| --- | --- |
| `/dashboard` | Overview, activity, usage, recent content. |
| `/dashboard/images` | Private library; search, filter, sort, grid/list, bulk actions. |
| `/dashboard/images/[id]` | File metadata, tags, collection assignment, shares, deletion. |
| `/dashboard/collections` | Collection list and creation. |
| `/dashboard/collections/[id]` | Collection metadata, children, membership, deletion. |
| `/dashboard/tags` | Nested tag creation, edit, colors, deletion. |
| `/dashboard/bookmarks` | Saved files and removal. |
| `/dashboard/links` | Tracked short-link creation and deletion. |
| `/dashboard/upload` | Multi-file uploads, progress, retry, visibility and organization. |
| `/dashboard/gif-studio` | Animated single-image effects and slideshow creation. |
| `/dashboard/notifications` | Read and remove notifications. |
| `/dashboard/settings` | Profile, security, sessions, API keys, ShareX, appearance. |
| `/dashboard/admin` | Admin-only users, instance settings, moderation, integrations, audit. |

`/dashboard/settings` uses client tabs (`profile`, `security`, `api`, `appearance`). `/dashboard/admin` uses `?tab=users|settings|moderation|integrations`. If a new workspace page is added, update both the navigation and README screenshot inventory.

### HTTP API

| Method and path | Handler | Notes |
| --- | --- | --- |
| `POST /api/upload` | `routes/api/upload/+server.ts` | Multipart `file` or `files`, signed-in/API-key/bot auth; returns link formats. |
| `GET /api/upload` | same | Authenticated usage hint. |
| `POST /api/gif` | `routes/api/gif/+server.ts` | Multipart images, effect/slideshow options, stores GIF as upload. |
| `POST /api/shares` | `routes/api/shares/+server.ts` | Create protected/expiring/limited share. |
| `POST /api/short` | `routes/api/short/+server.ts` | Create tracked short URL. |
| `GET/PATCH/DELETE /api/files/[id]` | `routes/api/files/[id]/+server.ts` | Read/update/delete with access checks. |
| `GET /api/public` | `routes/api/public/+server.ts` | Public file feed, capped `limit`. |
| `GET /api/stats` | `routes/api/stats/+server.ts` | Public aggregate stats and tags. |
| `GET /api/health` | `routes/api/health/+server.ts` | SQLite-backed health response. |

API keys are supplied as `Authorization: Bearer nmb_…`. The bot uses `x-bot-secret`. Session cookies also authenticate web-origin requests. Upload fields include `visibility`, legacy `isPublic`, `compress`, `tags`, `collectionId` or `collection`, and optional share fields. GIF jobs accept up to 24 source images and fields such as `effect`, `transition`, `delay`, `width`, `height`, `frames`, `hold`, `colors`, `loop`, `fit`, and `background`. Check the handlers before editing examples or accepting new fields.

## Data model and storage

`src/lib/server/db.ts` opens `DATA_DIR/nimbus.db`, enables WAL, foreign keys and a busy timeout, and creates the schema on import. The current schema includes:

| Table | Role |
| --- | --- |
| `users`, `sessions`, `api_keys` | Identity, session and API authentication. |
| `files` | Original metadata, owner, visibility flags, views, downloads, deletion marker. |
| `shares` | Slugs, optional password hashes, expiry and view ceilings. |
| `collections`, `collection_files` | Nested collections and ordered membership. |
| `tags`, `file_tags` | Per-user hierarchical tags and file associations. |
| `comments`, `likes`, `bookmarks` | Social interactions. |
| `notifications` | User event inbox. |
| `short_links` | Custom slugs, targets, click counts. |
| `reports` | File reports and moderation state. |
| `settings` | JSON-encoded instance settings and generated secrets. |
| `audit_log` | Administrative and account activity. |

`src/lib/server/storage.ts` resolves `DATA_DIR/files/` and `DATA_DIR/thumbs/`, saves bytes, reads them and removes them. `src/lib/server/files.ts` is the main upload and file-query layer. It validates size and allowed extensions, detects type, normalizes images where needed, uses a SHA-256 hash to deduplicate within a user account, writes originals/thumbnails, records tags, and exposes file queries and social operations. `src/lib/server/media.ts` owns MIME/kind detection, probing, thumbnail creation, browser normalization, compression and metadata stripping. `src/lib/server/gif.ts` owns frame loading/effects/composition/encoding. `src/lib/server/serve.ts` sets MIME, disposition, ranges, ETags, caching, and SVG sandbox headers.

### Visibility rules

`src/lib/visibility.ts` is the canonical conversion:

| User-facing state | `is_public` | `listed` | Expected behavior |
| --- | ---: | ---: | --- |
| `public` | 1 | 1 | Link access and public discovery. |
| `unlisted` | 1 | 0 | Link access without ordinary public listing. |
| `private` | 0 | 1 | Owner/admin authorization or explicit share access. |

Do not collapse `unlisted` into `private`, or assume `is_public = 1` means a file belongs in Explore. When adding public queries, review `listFiles`, public collection/profile pages, feeds and thumbnails together.

### Important boundaries

- `src/hooks.server.ts` initializes storage, authenticates each request, rejects cross-site form submissions with a foreign `Origin` unless programmatic credentials are present, and attaches response security headers.
- `src/lib/server/auth.ts` handles session cookies, API keys, bot secret identity and role checks. Sessions are HTTP-only and SameSite Lax. API keys are hashed and shown once. Passwords use scrypt via `crypto.ts`.
- `src/lib/server/shares.ts` creates and checks shares and signed share-access cookies. View counts, expiry, max views and passwords are enforced in the share route.
- `src/lib/server/settings.ts` defines defaults, persistence, safe public projection and URL selection. Secrets in settings must not be copied into public load data or documentation screenshots.
- `src/lib/server/ratelimit.ts` uses an in-process bucket map. It is not a distributed rate limiter. Upload and GIF APIs add per-user limits; login has an IP-based limit.
- `src/lib/server/audit.ts` records selected actions. Preserve useful audit context without logging credentials or file content.

## Instance settings and environment

`.env.example` is the source for environment names. `ORIGIN` and `PUBLIC_URL` govern public URLs; set both to the HTTPS origin for deployment. `HOST` and `PORT` govern binding. `BODY_SIZE_LIMIT` must exceed upload and GIF request bodies. `DATA_DIR` owns the database and files. `AUTH_SECRET` can override the persisted generated secret. `ADMIN_EMAIL`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` initialize the first admin only when the database is empty. Changing them later does not reset that account. Discord settings can come from environment or the admin UI.

`DEFAULT_SETTINGS` in `src/lib/server/settings.ts` defines site name/description/accent, registration and approval switches, comments, upload size and allowed extensions, default visibility, compression, EXIF stripping, direct-link style, quotas, maintenance mode, and Discord configuration. `publicSettings` deliberately omits admin-only and secret fields. When adding a setting, update its type, default, form, validation, persistence, and safe public projection intentionally.

## Discord bot

`bot/index.ts` defines slash commands `/upload`, `/gif`, `/share`, `/recent`, `/stats`, `/shorten`, `/delete`, and `/help`. It can register guild or global commands depending on configuration and can support server or user installation. The bot reads configuration from SQLite/environment, authenticates to the web API using a bot secret, and reports a heartbeat. `scripts/start.mjs` starts the web process, waits for `/api/health`, then starts the bot and restarts it with backoff after nonzero exits. Do not create a second live process for the same token while testing. Verify command registration separately from command implementation.

## Change recipes

### Adding or changing a page

1. Find its `+page.svelte` and `+page.server.ts` (or create both in the matching route directory).
2. Put database reads and permission checks in the server load/action. Keep secret fields out of serialized page data.
3. Use the existing layout, UI components and styles. Provide the page title, meaningful empty/error states and responsive behavior.
4. Add or adjust navigation if users need to reach it. Update this route inventory and README screenshots.
5. Run `npm run check`; run `npm run build` for server/route work; inspect the screen if practical.

### Changing upload or file access

1. Inspect `routes/api/upload`, `lib/server/files`, `media`, `storage`, `visibility`, `urls`, `/i`, `/t`, `/p`, and share routes.
2. Ensure ownership, allowed extensions, actual detected type, limits, quota, deduplication and filesystem cleanup still agree.
3. Preserve safe `Content-Type`, `Content-Disposition`, range responses, caching and SVG restrictions in `serve.ts`.
4. Test public/unlisted/private as owner, another user and anonymous visitor. Test a share independently of ordinary visibility.

### Changing the database

1. Read the whole relevant table and all queries that touch it.
2. Add schema changes in `db.ts` in a way that existing databases can upgrade. Avoid destructive resets.
3. Keep foreign keys, deletion behavior and files on disk synchronized.
4. Exercise both a fresh disposable DB and an existing disposable DB if the migration path matters.
5. Update backup and configuration docs when operators need to act.

### Changing an API or bot command

1. Trace authentication and caller expectations before changing payloads or response fields.
2. Keep actionable JSON errors and suitable HTTP status codes.
3. Update README examples, endpoint tables and command lists.
4. For bot changes, confirm registration definitions and runtime branches stay aligned. Use a test guild for live validation when configured.

## Screenshot and README maintenance

The README uses checked-in PNGs under `docs/screenshots/`. They are actual 1440-pixel desktop captures of a disposable seeded Nimbus instance. Capture public routes anonymously and workspace routes with demo sessions. Never screenshot an operator's real database, credentials, tokens or private uploads. Use `scripts/seed.mjs` only with a separate `DATA_DIR`, and verify any generated example links and share pages resolve before committing. For screenshots of tabs, ensure the intended tab content is visibly active; do not label repeated default-tab images as different features. Keep screenshots current when material UI changes affect them. The README uses standard GitHub Markdown: tables, task lists, code fences, details blocks, callouts and images.

## Git and completion workflow

The user requested that AI changes be committed every time with proper descriptions.

1. Before editing, run `git status --short` and inspect the relevant files. Treat pre-existing changes as the user's work; do not discard them.
2. Make a scoped change. Avoid formatting or regenerating unrelated files. Never stage `.env`, `data/`, `build/`, `node_modules/`, logs, or secrets.
3. Run the validation appropriate to the change and inspect the result. For documentation, verify relative links and image paths. For code, usually run `npm run check` and `npm run build`.
4. Review with `git diff --check`, `git diff`, then stage only the task files using explicit paths. Review `git diff --cached --stat` and `git diff --cached --check`.
5. Commit the completed change. Suggested subject style: `docs: document routes and add UI screenshots`, `fix: enforce share expiry for raw downloads`, or `feat: add collection sorting`. Keep the first line concise and imperative. Use a body for the reason, notable behavior and checks when the change is substantial. Do not write a vague message such as `updates`, `fix stuff`, or `AI changes`.
6. Report the commit hash, what changed, checks run and any remaining limitations. If a commit is prevented by Git permissions or a required user action, report the exact blocker; do not claim a commit happened.

Do not amend an existing commit or rewrite history unless specifically requested. Do not push automatically just because a local commit was requested. If the user asks for several independent changes, use sensible separate commits where that makes review easier.

## Known limitations and assumptions to verify

- A local SQLite database and local storage are designed for a single running instance with persistent disk.
- The in-memory rate limiter does not synchronize across processes.
- `sharp` support for HEIC/TIFF depends on the installed libvips build.
- GIF Studio handles still and animated images; it does not transcode video.
- No email delivery or self-service password reset is implemented.
- The README describes the current source; live deployments may run a different build or configuration. Verify before making claims about a deployed instance.
- There is no repository test suite script in `package.json`; add meaningful focused tests when a change needs them rather than assuming `npm run check` covers runtime behavior.
