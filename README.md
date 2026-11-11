# Nimbus

A self-hosted image & file host built with **SvelteKit + TypeScript**, inspired by [Slink](https://github.com/andrii-kryvoviaz/slink). Nimbus pairs a polished gallery and dashboard with private sharing, collections, nested tags, a built-in **GIF Studio**, URL shortening and a first-class **Discord bot**.

Everything runs on your hardware: uploads live on disk, metadata in SQLite, and images/GIFs are processed locally with `sharp` + `gifenc`.

---

## Feature tour

### Uploads & media
- Multi-file uploads with parallel workers, per-file progress, drag & drop, retries and copy-ready URLs.
- Images: PNG, JPG, WEBP, GIF, AVIF, BMP, ICO, SVG, TIFF, HEIC. Plus video, audio, PDF, ZIP and more (configurable).
- Automatic thumbnails (WebP), animated-frame detection, optional compression and EXIF stripping.
- Optional extension-style direct links (`/i/<id>.png`) instead of extensionless short links — applies to uploads, the API and the Discord bot. Both styles always resolve.
- API/ShareX `collection` parameter to drop uploads into a named collection; the bot uses its own configurable upload collection.
- SHA-256 deduplication per user.
- Uploads require a signed-in account; new uploads are **private by default** (admins can change the default).
- API keys and the Discord bot authenticate as a user; per-user storage quotas and total storage tracking.

### Sharing & privacy
- Three visibility modes per file: **Public** (listed in Explore), **Unlisted** (direct links work but hidden from Explore/Fresh), and **Private** (owner only). New uploads default to private, configurable by admins.
- Password-protected, expiring and view-limited share links with QR codes.
- Dedicated share landing pages that work without an account.
- URL shortener with click tracking and custom slugs.
- Public user profiles (`/u/username`), public collections (`/c/slug`) and per-file pages (`/p/id`).
- Likes, bookmarks, comments and moderation reports.

### Organisation
- Collections (albums) with covers, descriptions and public/private visibility.
- Nested tags with colours, search and per-tag filtering.
- Image grid/list views, search, sort and bulk visibility/delete actions.
- Notifications for likes and comments.
- Personal dashboard with activity chart, storage quota and recent shares.

### GIF Studio
- Turn a single image into an animated loop: zoom, pan, pulse, shake, bounce, wobble or fade.
- Stitch up to 24 images into a slideshow with crossfades.
- Tune width, frame delay, colour count, fit mode, background and looping.
- Generated GIFs are saved to your library with links, Markdown and share buttons.

### Discord bot
- `/upload` — attach a file, get a direct URL + Markdown (private by default; optional `visibility`).
- `/gif` — convert a single attachment into a static `.gif` file (no animation).
- `/share` — create password/expiry-protected links.
- `/recent`, `/stats`, `/shorten`, `/help`.
- `/delete` — restricted to members with **Manage Server**.
- Server install and optional **user install** (DMs, group DMs, other servers). When user install is enabled every command reply is ephemeral.
- Optional upload announcements in a channel and live online status in the admin dashboard.

### Administration
- First-run administrator, user approval workflow, ban/role controls and per-user quotas.
- Instance settings: site name/description, accent colour, registration, upload limits, extensions, default visibility (public/unlisted/private), compression, extension-style links, maintenance mode.
- Discord bot settings include install modes, announcement channel, and the collection/folder that bot uploads are added to.
- Moderation queue for reports, audit log, temp password resets and user deletion.
- API keys for scripts, ShareX and other integrations.
- Dark/light themes, accent picker, reduced-motion support and responsive layouts.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| App | SvelteKit 2 + Svelte 5 (runes) + TypeScript |
| Styling | Tailwind CSS + CSS variables |
| Database | SQLite via `better-sqlite3`, WAL mode |
| Media | `sharp` for decoding/thumbnails/compression, `gifenc` for GIF encoding |
| Auth | scrypt password hashing, HTTP-only session cookies, hashed API keys |
| Bot | `discord.js` v14 |
| Extras | `qrcode`, `file-type` |

No external services, no cloud storage, no telemetry.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy the example environment file
cp .env.example .env        # Windows: copy .env.example .env

# 3. Start the dev server (creates the SQLite schema + first admin)
npm run dev

# 4. Optional: seed demo images, tags and collections
npm run seed
```

Open <http://localhost:5173>. Uploading requires signing in; the first administrator is created on boot:

- **Email:** `admin@nimbus.local`
- **Password:** `nimbus1234` (change it in **Settings → Security**)

Override with `ADMIN_EMAIL`, `ADMIN_USERNAME` and `ADMIN_PASSWORD` before the first boot.

### Production

```bash
npm run build
npm run start
```

`npm run start` launches **both the web server and the Discord bot**. The bot starts after the web server reports healthy and is automatically restarted if it crashes (with backoff). To run them separately, use `npm run start:web` and `npm run start:bot`.

Do not keep a second bot process running (for example an old PM2 entry) while using `npm run start` — two gateway connections with the same token will cause duplicate interaction errors.

The Node adapter reads `PORT` and `HOST`. Put it behind a reverse proxy (Caddy/nginx) with HTTPS, and set `ORIGIN` / `PUBLIC_URL` to your public URL so links and cookies are correct.

---

## Configuration

Environment variables (`.env`):

| Variable | Description |
| --- | --- |
| `ORIGIN` / `PUBLIC_URL` | Public URL used in generated links (no trailing slash). |
| `PORT`, `HOST` | Server bind settings for the production build. |
| `BODY_SIZE_LIMIT` | Max request body accepted by adapter-node. Defaults to `512K`; set it above your upload/GIF limits (e.g. `256M`). |
| `DATA_DIR` | Storage root, defaults to `./data` (`nimbus.db`, `files/`, `thumbs/`). |
| `AUTH_SECRET` | Optional secret for share cookies/HMACs. Generated automatically if unset. |
| `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` | First-run administrator. |
| `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_CHANNEL_ID` | Bot overrides (also configurable in the dashboard). |
| `BOT_SECRET` | Optional override for the bot API secret. |

Most runtime settings live in the database and can be edited from **Dashboard → Administration → Instance**.

---

## Discord bot setup

1. Create an application at <https://discord.com/developers/applications> and add a **Bot**.
2. For DM support, open **Installation** in the developer portal and enable **User Install** (keep **Guild Install** enabled for server use).
3. Copy the bot token and the application ID into **Administration → Instance → Discord bot**, choose **Server install** and/or **User install (DMs)**, optionally set an **Uploads collection** (created automatically for the bot owner), and save.
4. Copy the **Bot API secret** from **Administration → Integrations**.
5. Register commands:

   ```bash
   npm run bot:register
   ```

   Run without a guild ID to register globally (may take up to an hour to appear), or set a guild ID for instant registration.

6. Start the app (web + bot together):

   ```bash
   npm run start
   ```

   For a separate bot process use `npm run start:bot` (or `npm run bot` during development with `npm run dev`). Do not run a separate bot while `npm run start` is already managing one. The bot reads the database on startup and every minute sends a heartbeat, so the admin dashboard shows whether it is online. If the token changes, restart the app/bot.

Use the **Server install link** or **User install link (DMs)** shown in **Integrations**. Install mode changes are synced automatically when the bot starts (global commands may take up to an hour to appear). When user install is enabled, command replies are ephemeral everywhere.

---

## API

Authenticate with `Authorization: Bearer nmb_…` (create keys in **Settings → API keys**) or, for the bot, the `x-bot-secret` header.

### Upload

```bash
curl -F "file=@screenshot.png" \
  -F "visibility=public" \
  -F "collection=ShareX" \
  -F "tags=art,wallpaper" \
  -H "Authorization: Bearer nmb_…" \
  https://your-host/api/upload
```

`visibility` accepts `public`, `unlisted` or `private` (defaults to the instance setting). `collection` accepts a collection name and is created automatically if it does not exist. Response includes `url`, `absoluteUrl`, `absoluteThumbUrl`, `markdown`, `html`, `bbcode` and the file record.

### ShareX

Download a ready-made `.sxcu` from **Settings → API keys → ShareX config**: paste an API key, choose the collection/folder and visibility, then import the file into ShareX. The uploader sends `collection` and `visibility`, so every screenshot lands in the chosen collection.

Manual equivalent:

```json
{
  "Version": "17.0.0",
  "Name": "Nimbus — ShareX",
  "DestinationType": "ImageUploader, FileUploader",
  "RequestMethod": "POST",
  "RequestURL": "https://i.f34rless.dev/api/upload",
  "Headers": { "Authorization": "Bearer nmb_your_key" },
  "Body": "MultipartFormData",
  "FileFormName": "file",
  "Arguments": { "visibility": "private", "collection": "ShareX" },
  "ResponseType": "JSON",
  "URL": "{json:absoluteUrl}",
  "ThumbnailURL": "{json:absoluteThumbUrl}",
  "ErrorMessage": "{json:error}"
}
```

### GIF

```bash
curl -F "frames=@one.png" -F "frames=@two.png" \
  -F "transition=fade" -F "delay=90" -F "width=480" \
  -H "Authorization: Bearer nmb_…" \
  https://your-host/api/gif
```

### Shares

```bash
curl -X POST https://your-host/api/shares \
  -H "Authorization: Bearer nmb_…" \
  -H "content-type: application/json" \
  -d '{"fileId":"abc123","password":"secret","expiresInHours":24,"maxViews":50}'
```

### Other endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/public?limit=8` | Recent public uploads |
| GET | `/api/stats` | Instance statistics and popular tags |
| PATCH | `/api/files/:id` | Rename, change visibility, tags or add to a collection |
| DELETE | `/api/files/:id` | Soft-delete a file and revoke its shares |
| POST | `/api/short` | Create a short link (`{"target":"https://…","slug":"optional"}`) |
| GET | `/i/:id` | Serve the original file (`?download=1` to download) |
| GET | `/t/:id` | Serve the WebP thumbnail |
| GET | `/s/:slug` | Share landing page (password gate when needed) |
| GET | `/short/:code` | Short-link redirect |

---

## Project structure

```
src/
  app.css                 Design tokens + component classes
  hooks.server.ts         Auth, theme, security headers
  lib/
    components/           Header, cards, modals, icons, toasts…
    server/
      auth.ts             Sessions, API keys, guards
      collections.ts      Albums
      crypto.ts           IDs, hashing, HMAC, API keys
      db.ts               Schema, WAL, first-run admin
      files.ts            Upload pipeline, listing, comments, likes
      gif.ts              sharp frame preparation + gifenc encoding
      media.ts            Type detection, thumbnails, compression
      settings.ts         Instance settings
      shares.ts           Share links, passwords, cookies
      storage.ts          Disk layout + safe paths
      tags.ts             Nested tags
    stores/ui.ts          Theme, accent, toasts
    types.ts              Shared TypeScript types
  routes/
    api/                  Upload, GIF, files, shares, short links, public data
    dashboard/            Overview, images, collections, tags, bookmarks,
                          links, notifications, GIF studio, settings, admin
    s/[slug]/             Public share page + raw endpoint
    i/[id], t/[id]        Original + thumbnail serving
    p/[id], u/[username], c/[slug]
                          Public file page, profiles, collections
bot/index.ts              discord.js bot (reads SQLite + HTTP API)
scripts/seed.mjs          Demo content generator
```

Files are stored under `data/files/<shard>/<id>.<ext>` and thumbnails under `data/thumbs/<id>.webp`. Back up the whole `data/` directory.

---

## Security notes

- Sessions are HTTP-only, SameSite=Lax cookies; passwords use scrypt with per-user salts.
- API keys are stored only as SHA-256 hashes and shown once.
- Share access uses HMAC-signed cookies; passwords are hashed.
- Private files and thumbnails are authorization-checked on every request.
- SVGs are served with a sandboxing CSP; all responses set `nosniff`.
- Cross-site form submissions are rejected via an Origin check; API-key and bot-secret requests are exempt so scripts and ShareX work without a browser Origin header. Run behind HTTPS in production and set `ORIGIN`.
- Uploaded content is untrusted: deploy behind a reverse proxy, keep dependencies updated, and use the moderation tools.

---

## Notes & limitations

- Video-to-GIF conversion is not included (no FFmpeg dependency); GIF Studio works with images and animated images.
- HEIC/TIFF support depends on the `sharp`/libvips build installed on your machine.
- Email delivery is not configured — there is no self-service password reset. Admins can generate a temporary password from **Administration → Users**.
- The Discord bot uses Node's experimental TypeScript stripping (`node --experimental-strip-types`), supported by Node 22.6+.

PRs and feature ideas are welcome. Built to be forked and made your own.
