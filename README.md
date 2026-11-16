<a id="nimbus"></a>

<div align="center">

<img src="static/nimbus-readme-banner.svg" alt="Nimbus — your media, your space" width="100%" />

<br />

**A private, beautiful home for every image and file you share.**

[![Node.js 22.6+](https://img.shields.io/badge/Node.js-22.6%2B-1f2428?style=for-the-badge&logo=node.js&logoColor=c8a878)](https://nodejs.org/en/download)
![SvelteKit](https://img.shields.io/badge/SvelteKit-2-1f2428?style=for-the-badge&logo=svelte&logoColor=c8a878)
![SQLite](https://img.shields.io/badge/SQLite-local%20storage-1f2428?style=for-the-badge&logo=sqlite&logoColor=c8a878)
![Self hosted](https://img.shields.io/badge/100%25-self%20hosted-c8a878?style=for-the-badge)

[Visual tour](#-visual-tour) · [Explore features](#-everything-in-one-place) · [Quick start](#-quick-start) · [Self-hosting](#-self-hosting) · [API](#-api--integrations) · [AI guide](AGENTS.md)

</div>

---

> [!NOTE]
> Nimbus stores originals and thumbnails on your disk and metadata in SQLite. It does not require object storage, an external database, or a hosted image service.

## 🖼️ Visual tour

These are actual desktop captures of Nimbus at 1440 pixels wide, made with a disposable local database and the included demo seed. Public screens are anonymous, workspace screens use the demo account, and administration uses a disposable admin account. Every page has its own screenshot; select an image to open it at full size.

<details open>
<summary><strong>Public entry: home, Explore, sign in and registration</strong></summary>

| Home `/` | Explore `/explore` |
| --- | --- |
| [![Nimbus home page](docs/screenshots/home.png)](docs/screenshots/home.png) | [![Explore gallery](docs/screenshots/explore.png)](docs/screenshots/explore.png) |

| Sign in `/login` | Create account `/register` |
| --- | --- |
| [![Sign in page](docs/screenshots/login.png)](docs/screenshots/login.png) | [![Registration page](docs/screenshots/register.png)](docs/screenshots/register.png) |

</details>

<details>
<summary><strong>Public content: file, collection, profile and share</strong></summary>

| Public file `/p/:id` | Public collection `/c/:slug` |
| --- | --- |
| [![Public file page](docs/screenshots/public-file.png)](docs/screenshots/public-file.png) | [![Public collection page](docs/screenshots/public-collection.png)](docs/screenshots/public-collection.png) |

| Public profile `/u/:username` | Share `/s/:slug` |
| --- | --- |
| [![Public user profile](docs/screenshots/public-profile.png)](docs/screenshots/public-profile.png) | [![Share page with QR code](docs/screenshots/shared-file.png)](docs/screenshots/shared-file.png) |

</details>

<details open>
<summary><strong>Workspace: overview, image library and file details</strong></summary>

| Overview `/dashboard` | Library `/dashboard/images` |
| --- | --- |
| [![Workspace overview](docs/screenshots/dashboard.png)](docs/screenshots/dashboard.png) | [![Personal image library](docs/screenshots/library.png)](docs/screenshots/library.png) |

| File details `/dashboard/images/:id` |
| --- |
| [![File details and share management](docs/screenshots/file-detail.png)](docs/screenshots/file-detail.png) |

</details>

<details>
<summary><strong>Organize: collections, collection details, tags and bookmarks</strong></summary>

| Collections `/dashboard/collections` | Collection details `/dashboard/collections/:id` |
| --- | --- |
| [![Collection library](docs/screenshots/collections.png)](docs/screenshots/collections.png) | [![Collection details](docs/screenshots/collection-detail.png)](docs/screenshots/collection-detail.png) |

| Tags `/dashboard/tags` | Bookmarks `/dashboard/bookmarks` |
| --- | --- |
| [![Tag management](docs/screenshots/tags.png)](docs/screenshots/tags.png) | [![Bookmarks](docs/screenshots/bookmarks.png)](docs/screenshots/bookmarks.png) |

</details>

<details>
<summary><strong>Create and follow activity: short links, upload, GIF Studio and notifications</strong></summary>

| Short links `/dashboard/links` | Upload `/dashboard/upload` |
| --- | --- |
| [![Tracked short links](docs/screenshots/short-links.png)](docs/screenshots/short-links.png) | [![Multi-file upload page](docs/screenshots/upload.png)](docs/screenshots/upload.png) |

| GIF Studio `/dashboard/gif-studio` | Notifications `/dashboard/notifications` |
| --- | --- |
| [![GIF Studio](docs/screenshots/gif-studio.png)](docs/screenshots/gif-studio.png) | [![Notification inbox](docs/screenshots/notifications.png)](docs/screenshots/notifications.png) |

</details>

<details>
<summary><strong>Settings: profile, security, API keys and appearance</strong></summary>

| Profile | Security |
| --- | --- |
| [![Profile settings](docs/screenshots/settings-profile.png)](docs/screenshots/settings-profile.png) | [![Security and session settings](docs/screenshots/settings-security.png)](docs/screenshots/settings-security.png) |

| API keys and ShareX | Appearance |
| --- | --- |
| [![API key and ShareX settings](docs/screenshots/settings-api.png)](docs/screenshots/settings-api.png) | [![Appearance settings](docs/screenshots/settings-appearance.png)](docs/screenshots/settings-appearance.png) |

</details>

<details>
<summary><strong>Administration: users, instance, moderation and integrations</strong></summary>

| Users | Instance |
| --- | --- |
| [![User administration](docs/screenshots/admin-users.png)](docs/screenshots/admin-users.png) | [![Instance settings](docs/screenshots/admin-instance.png)](docs/screenshots/admin-instance.png) |

| Moderation | Integrations |
| --- | --- |
| [![Moderation reports](docs/screenshots/admin-moderation.png)](docs/screenshots/admin-moderation.png) | [![Discord integrations](docs/screenshots/admin-integrations.png)](docs/screenshots/admin-integrations.png) |

</details>

> [!TIP]
> Direct originals (`/i/:id`), thumbnails (`/t/:id`), share downloads (`/s/:slug/raw`) and short redirects (`/short/:code`) are HTTP endpoints rather than UI pages. Their surrounding pages are pictured above.

### Pages and controls at a glance

| Area | What you can do |
| --- | --- |
| Public pages | Browse recent files, search and filter Explore, visit public profiles and collections, open file pages, use share links. |
| Library | Search, sort, filter, switch grid/list, bulk-change visibility or delete, edit file details. |
| Organization | Build nested collections and tags, bookmark files, create tracked short links. |
| Creation | Upload several files with progress and retry; create animated effects and GIF slideshows. |
| Account | Edit profile, review sessions, create API keys and ShareX configuration, change appearance. |
| Administration | Manage users and quotas, instance settings, reports, audit history and Discord integration. |

## ✦ Everything in one place

Nimbus is an image and file host built with **SvelteKit, TypeScript, SQLite, sharp, and gifenc**. It combines a polished public gallery with a private workspace, precise sharing controls, creative GIF tools, and a Discord bot. The interface defaults to a midnight black theme with a warm gold accent.

### 📸 Upload and media

- Drag and drop multiple files, upload in parallel, see per-file progress, and retry failures.
- Copy direct, absolute, Markdown, HTML, and BBCode links from upload results.
- Host images, GIFs, video, audio, PDFs, archives, and other allowed file types.
- Generate WebP thumbnails and detect animated image frames.
- Optionally compress images and strip EXIF metadata.
- Deduplicate uploads by SHA-256 **per user**.
- Choose extension-style direct links or short extensionless links.
- Set upload size, file extension, and per-user storage limits.
- Send API and ShareX uploads directly into a named collection.

### 🔐 Share with control

- Set each file to **public**, **unlisted**, or **private**.
- Create share pages with passwords, expiry dates, and maximum view counts.
- Generate QR codes for share links.
- Give public files dedicated pages and original-file URLs.
- Create short URLs with custom slugs and click tracking.
- Share public profiles and curated public collections.
- Keep newly uploaded files private by default, or change the instance default.
- Moderate reported files and control registration and account approval.

### 🗂️ Organize your library

- Build collections with covers, descriptions, and visibility controls.
- Use nested tags with colors and filtered browsing.
- Switch between image grid and list views.
- Search, sort, filter, and bulk-change visibility or delete files.
- Save bookmarks, react with likes, and join comment threads.
- Track views, uploads, storage use, and recent share activity.
- Receive notifications for likes and comments.

### 🎞️ Create and automate

- Animate a still image with zoom, pan, pulse, shake, bounce, wobble, or fade.
- Combine up to 24 images into a GIF slideshow with crossfades.
- Tune frame delay, width, colors, fit mode, background, and looping.
- Save generated GIFs directly to your library.
- Upload and create share links through the Discord bot.
- Use API keys for scripts, ShareX, and other integrations.
- Manage users, quotas, moderation, audit history, and bot settings as an admin.

<details>
<summary><strong>Full Discord command list</strong></summary>

| Command | What it does |
| --- | --- |
| `/upload` | Upload an attachment and return a direct URL and Markdown. |
| `/gif` | Convert a single attachment to a static GIF file. |
| `/share` | Create a protected or expiring share link. |
| `/shorten` | Create a tracked short URL. |
| `/recent` | Show recent uploads. |
| `/stats` | Show usage statistics. |
| `/delete` | Delete an upload; requires **Manage Server**. |
| `/help` | Show available commands. |

The bot supports server installation and optional user installation for DMs, group DMs, and other servers.

</details>

## ⚡ Quick start

**Requirements:** [Node.js 22.6 or newer](https://nodejs.org/en/download) and npm. Native packages (`better-sqlite3` and `sharp`) need compatible binaries or a local build toolchain.

```bash
git clone https://github.com/F34R23232323/Nimbus.git
cd Nimbus
npm install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Before the first start, edit `.env` and set a unique `ADMIN_PASSWORD` and your preferred `ORIGIN` / `PUBLIC_URL`.

| Mode | Command | Address |
| --- | --- | --- |
| Development | `npm run dev` | `http://localhost:5173` |
| Production | `npm run build` then `npm run start` | Value of `HOST` and `PORT` in `.env` |
| Separate web process | `npm run start:web` | Value of `HOST` and `PORT` |
| Separate bot process | `npm run start:bot` | No HTTP listener |

`npm run start` manages the **web server and Discord bot together**. The bot starts when the web health endpoint responds and restarts with backoff if it crashes. Run **one** bot process per token.

> [!IMPORTANT]
> The first boot creates an administrator account. The example credentials are only for local development: `admin@nimbus.local` / `nimbus1234`. Set `ADMIN_EMAIL`, `ADMIN_USERNAME`, and especially `ADMIN_PASSWORD` **before the first boot** of a public instance. Changing those variables later does not reset an existing account; use `npm run reset-password`.

## 🖥️ Self-hosting

All deployment methods need:

1. One writable, persistent `DATA_DIR` for `nimbus.db`, `files/`, and `thumbs/`.
2. A public HTTPS URL in both `ORIGIN` and `PUBLIC_URL`, with no trailing slash.
3. A `BODY_SIZE_LIMIT` above your largest permitted upload or GIF request.
4. A single running Discord bot, if you enable it.

| Platform | Best route | Persistent storage |
| --- | --- | --- |
| Linux VPS / bare metal | Node + systemd + Caddy | Local directory |
| Docker / Compose | Included `Dockerfile` and `compose.yaml` | Named Docker volume |
| Raspberry Pi 64-bit | Native Node or Compose | Local disk or SSD |
| Windows | Node + PowerShell / Task Scheduler | Local directory |
| NAS / home server | Compose in the NAS container UI | Persistent volume |
| Container PaaS | Included Dockerfile + one persistent disk | Mount at `/app/data` |

<details open>
<summary><strong>🐳 Docker Compose — quickest production path</strong></summary>

The repository includes a multi-stage [Dockerfile](Dockerfile) and [Compose file](compose.yaml). [Docker Compose](https://docs.docker.com/compose/intro/compose-application-model/) builds the app and starts the web server plus optional bot in one container.

```bash
git clone https://github.com/F34R23232323/Nimbus.git
cd Nimbus
cp .env.example .env
```

Edit `.env` before starting:

```dotenv
ORIGIN=https://images.example.com
PUBLIC_URL=https://images.example.com
ADMIN_EMAIL=you@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=choose-a-long-unique-password
BODY_SIZE_LIMIT=256M
```

Then run:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f nimbus
```

Compose binds the app to `127.0.0.1:3000` on the host and keeps data in the `nimbus-data` volume. Set `NIMBUS_PORT` in the host's Compose environment to use another host port. Put a reverse proxy in front for HTTPS:

```caddyfile
images.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Replace the domain and point its DNS record at your server. See the [Caddy reverse proxy guide](https://caddyserver.com/docs/quick-starts/reverse-proxy). To expose the container directly on your LAN, change the Compose port binding deliberately; the supplied binding only listens on localhost.

</details>

<details>
<summary><strong>🐧 Linux VPS or bare metal — Node + systemd</strong></summary>

Install a supported Node.js release and Caddy using their official instructions. Clone Nimbus into a stable directory, build it, and make a separate data directory:

```bash
sudo git clone https://github.com/F34R23232323/Nimbus.git /opt/nimbus
sudo useradd --system --home /opt/nimbus --shell /usr/sbin/nologin nimbus
sudo chown -R nimbus:nimbus /opt/nimbus
sudo install -d -o nimbus -g nimbus /var/lib/nimbus
cd /opt/nimbus
sudo -u nimbus npm install
sudo -u nimbus cp .env.example .env
sudo -u nimbus npm run build
```

Edit `/opt/nimbus/.env` before starting. Set `DATA_DIR=/var/lib/nimbus`, `HOST=127.0.0.1`, `PORT=3000`, your HTTPS `ORIGIN` and `PUBLIC_URL`, and unique admin credentials. Keep the file readable only by the service account.

Create `/etc/systemd/system/nimbus.service`:

```ini
[Unit]
Description=Nimbus image host
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=nimbus
Group=nimbus
WorkingDirectory=/opt/nimbus
Environment=NODE_ENV=production
ExecStart=/usr/bin/node --env-file-if-exists=.env scripts/start.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Adjust `ExecStart` if Node is installed elsewhere, then enable the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nimbus
sudo systemctl status nimbus
sudo journalctl -u nimbus -f
```

Proxy `images.example.com` to `127.0.0.1:3000` with the Caddyfile above. The `WorkingDirectory` matters because Nimbus resolves relative data paths and the bot from the project root. See the official [systemd service](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html) and [execution environment](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html) references.

</details>

<details>
<summary><strong>🪟 Windows — PowerShell</strong></summary>

Install Node.js 22.6+ and Git. In PowerShell:

```powershell
git clone https://github.com/F34R23232323/Nimbus.git C:\Nimbus
Set-Location C:\Nimbus
npm install
Copy-Item .env.example .env
notepad .env
npm run build
npm run start
```

Set `ADMIN_PASSWORD` before first launch. For a public deployment, set `ORIGIN` and `PUBLIC_URL` to your HTTPS domain, `HOST=127.0.0.1` and `PORT=3000`, then proxy the domain to that port. Keep the project directory writable by the account running Nimbus. For automatic start, configure Windows Task Scheduler to run `node.exe` with arguments `--env-file-if-exists=.env scripts/start.mjs` and **Start in** set to `C:\Nimbus`. The working directory must be correct for the database and bot paths.

</details>

<details>
<summary><strong>🍓 Raspberry Pi and ARM64 mini PCs</strong></summary>

Use a **64-bit OS** and Node.js 22.6+. The Linux instructions above work on ARM64; a small SSD is preferable for sustained uploads and SQLite writes. If native packages do not have a compatible prebuilt binary, install the local build prerequisites (Python, make, and a C++ compiler) and reinstall dependencies. You can also use the included Compose setup on an ARM64 Docker host.

For a LAN-only instance, use a LAN `ORIGIN` / `PUBLIC_URL` and bind the port deliberately. For internet access, place Nimbus behind an HTTPS reverse proxy and use the public domain in both URL settings.

</details>

<details>
<summary><strong>🗄️ NAS or container PaaS</strong></summary>

On a NAS with Compose support, use the included `compose.yaml`, keep the `nimbus-data` volume persistent, and route your NAS reverse proxy to the host port. On a container platform, build from the included Dockerfile, mount **one persistent disk at `/app/data`**, set `DATA_DIR=/app/data`, and configure `ORIGIN`, `PUBLIC_URL`, `PORT`, and admin credentials in the platform environment.

Run one instance unless you intentionally move storage and the bot to an architecture built for multiple replicas. Nimbus uses a local SQLite database and local files; an ephemeral filesystem will lose uploads and metadata.

</details>

### Configuration reference

| Variable | Purpose | Example |
| --- | --- | --- |
| `ORIGIN` | Public origin used for cookies and requests | `https://images.example.com` |
| `PUBLIC_URL` | Public URL for generated links | `https://images.example.com` |
| `HOST` / `PORT` | Production server bind address and port | `127.0.0.1` / `3000` |
| `BODY_SIZE_LIMIT` | Maximum accepted request body | `256M` |
| `DATA_DIR` | SQLite, originals, and thumbnails | `/var/lib/nimbus` |
| `ADMIN_EMAIL` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` | First-run admin | Set before first boot |
| `AUTH_SECRET` | Optional session/share signing override | Long random secret |
| `DISCORD_TOKEN` / `DISCORD_CLIENT_ID` | Bot credentials | From Discord Developer Portal |
| `DISCORD_GUILD_ID` / `DISCORD_CHANNEL_ID` | Optional bot targets | Discord IDs |
| `BOT_SECRET` | Optional bot API secret override | Long random secret |

Most other settings are editable in **Workspace → Administration → Instance**, including registration, default visibility, upload limits, allowed extensions, maintenance mode, and Discord options. [`.env.example`](.env.example) contains the complete environment template.

### Updating and backing up

```bash
# Native installation
git pull
npm install
npm run build
sudo systemctl restart nimbus

# Docker Compose
git pull
docker compose up -d --build
```

Back up the **entire data directory or Docker volume**: the SQLite database, its WAL files, originals, and thumbnails belong together. Stop the app for a simple consistent file copy. Keep a copy of your `.env` separately. Do not commit `.env`, API keys, or the data directory.

## 🤖 Discord bot

1. Create a bot application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add its token and application ID in **Administration → Instance → Discord bot**, or set `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` in `.env`.
3. Choose server and/or user installation, optionally set an announcement channel and upload collection, and save.
4. Register slash commands with `npm run bot:register`.
5. Start with `npm run start`, or run `npm run start:web` and `npm run start:bot` as separate processes.

Guild command registration is usually useful while testing; global commands may take time to appear. The bot reads settings from SQLite and reports a heartbeat to the admin dashboard. Do not run a second bot process using the same token.

## 🔌 API & integrations

Create an API key in **Settings → API keys**. Send it in `Authorization: Bearer nmb_…`. The upload API also supports authenticated sessions and the bot secret.

<details>
<summary><strong>Upload a file with curl</strong></summary>

```bash
curl -F "file=@screenshot.png" \
  -F "visibility=private" \
  -F "collection=Screenshots" \
  -F "tags=work,reference" \
  -H "Authorization: Bearer nmb_your_key" \
  https://images.example.com/api/upload
```

`visibility` accepts `public`, `unlisted`, or `private`. The response includes direct and absolute URLs plus Markdown, HTML, and BBCode snippets.

</details>

<details>
<summary><strong>Generate a GIF</strong></summary>

```bash
curl -F "frames=@one.png" -F "frames=@two.png" \
  -F "transition=fade" -F "delay=90" -F "width=480" \
  -H "Authorization: Bearer nmb_your_key" \
  https://images.example.com/api/gif
```

</details>

<details>
<summary><strong>Create a share link</strong></summary>

```bash
curl -X POST https://images.example.com/api/shares \
  -H "Authorization: Bearer nmb_your_key" \
  -H "content-type: application/json" \
  -d '{"fileId":"abc123","password":"secret","expiresInHours":24,"maxViews":50}'
```

</details>

**ShareX:** In **Settings → API keys → ShareX config**, paste an API key, choose a collection and visibility, download the generated `.sxcu`, and import it into ShareX.

| Method | Endpoint | Use |
| --- | --- | --- |
| `POST` | `/api/upload` | Upload and optionally organize a file |
| `POST` | `/api/gif` | Generate a GIF |
| `POST` | `/api/shares` | Create a share |
| `POST` | `/api/short` | Create a tracked short URL |
| `PATCH` / `DELETE` | `/api/files/:id` | Update or remove a file |
| `GET` | `/api/public` / `/api/stats` | Public feed and stats |
| `GET` | `/api/health` | Database-backed health check |
| `GET` | `/i/:id` / `/t/:id` | Original / thumbnail |
| `GET` | `/s/:slug` / `/short/:code` | Share page / short redirect |

## 🧱 Architecture

```mermaid
flowchart LR
    Browser[Browser / ShareX] --> Web[SvelteKit web app]
    Discord[Discord] --> Bot[discord.js bot]
    Bot --> Web
    Web --> DB[(SQLite)]
    Web --> Disk[(Originals and thumbnails)]
    Bot --> DB
```

| Layer | Implementation |
| --- | --- |
| Frontend and routes | SvelteKit 2, Svelte 5, TypeScript |
| UI | Tailwind CSS, CSS variables, responsive layouts |
| Data | SQLite via `better-sqlite3` in WAL mode |
| Media | `sharp` and `gifenc` |
| Authentication | scrypt passwords, HTTP-only sessions, hashed API keys |
| Bot | `discord.js` v14 |
| Runtime | Node.js 22.6+ |

> [!TIP]
> Working on Nimbus with an AI agent? [AGENTS.md](AGENTS.md) maps every route, storage and security boundary, and the expected Git workflow. Completed changes should be committed with a clear, descriptive message.

<details>
<summary><strong>Project map</strong></summary>

```text
src/
  app.css              Theme tokens and component styles
  lib/components/       Cards, navigation, dialogs, toasts
  lib/server/           Auth, SQLite, media, storage, shares, tags
  routes/
    dashboard/          Library, collections, GIF Studio, admin
    api/                Upload, GIF, files, shares, stats
    p/ c/ u/ s/         Public pages and shares
bot/index.ts            Discord bot
scripts/                Start, seed, reset-password
static/                 Brand assets
docs/screenshots/        Real UI captures from disposable demo data
AGENTS.md               Repository guide and instructions for AI agents
Dockerfile              Production container build
compose.yaml            Single-instance deployment
```

</details>

## 🛡️ Security and limits

- Uploading requires a signed-in account or an authenticated API/bot request.
- Private files and thumbnails are authorization-checked on requests.
- Sessions use HTTP-only, SameSite cookies; passwords use scrypt with per-user salts.
- API keys are stored as hashes and shown once.
- Share cookies are signed and share passwords are hashed.
- Run the public app behind HTTPS, set `ORIGIN`, keep Node dependencies current, and back up the data volume.
- Video-to-GIF conversion is **not** included; GIF Studio uses still and animated images.
- HEIC and TIFF support depends on the installed `sharp` / libvips build.
- Email-based self-service password reset is not configured; admins can issue a temporary password.

---

<div align="center">

**Your media. Your space. Your rules.**

[Back to top](#nimbus)

</div>
