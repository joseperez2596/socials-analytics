# Social Analytics Dashboard

A self-hosted dashboard for creators who post on **TikTok, Instagram, Facebook and YouTube**. It keeps your numbers in your own Postgres and shows, per platform:

- **Overview**: followers, reach and views over time
- **Matrix**: each post plotted by reach × engagement, so you can see what to repeat and what to drop
- **Pillars**: performance grouped by content category, using keyword rules you define
- **Audience / Funnel / Monetization**: platform-specific views (YouTube traffic sources, geography, revenue)
- **Strategy**: recommendation cards, read from the `strategy_content` table

Built with Next.js, Tailwind, Recharts and Postgres.

| YouTube pillars | Instagram matrix | TikTok overview |
|---|---|---|
| ![](docs/screenshots/youtube-pillars.png) | ![](docs/screenshots/instagram-matrix.png) | ![](docs/screenshots/tiktok-overview.png) |

<sub>Screenshots use the bundled demo data.</sub>

![Architecture](analytics-architecture.drawio.png)

> The diagram also shows the optional n8n sync and AI strategy generator. They are not part of this repo yet (see [Roadmap](#roadmap)).

## Quickstart (Docker)

```bash
cp .env.example .env              # change POSTGRES_PASSWORD
docker compose up -d --build      # migrations run on container start
docker compose exec analytics-dashboard node migrate.js seed   # optional demo data
```

Open http://localhost:3030 (or your `APP_PORT`).

## Local development

```bash
npm ci
cp .env.example .env              # DATABASE_URL must point at a running Postgres
docker compose up -d analytics-db # or use your own Postgres
npm run migrate && npm run seed
npm run dev                       # http://localhost:3000
```

`npm run lint`, `npm run build` and `npm test` are what CI runs.

## Getting your data in

### Connect your accounts (automatic sync)

Open **Connections** in the sidebar. Each platform has setup steps on the page:

1. Create your own developer app: [Google Cloud](https://console.cloud.google.com/) for YouTube, [Meta for Developers](https://developers.facebook.com/apps/) for Facebook + Instagram, [TikTok for Developers](https://developers.tiktok.com/apps/) for TikTok.
2. Add the redirect URL shown on the page to that app.
3. Paste the app's ID and secret, then click **Connect** and sign in.

The first sync starts right away. After that the dashboard syncs on its own (daily at 06:00 by default; change it at the top of the page), and every run shows up in the platform's sync history.

| Platform | What gets synced | Things to know |
|---|---|---|
| YouTube | Channel stats, 365 days of daily views and watch time, top 20 videos, traffic sources, countries | Set the Google app's publishing status to **In production**. In Testing, Google signs you out every 7 days. |
| Facebook + Instagram | Page fans and engagement, posts, Instagram followers, reach and media (30 days) | Development mode is enough for your own Page. Instagram must be a professional account linked to the Page. |
| TikTok | Followers, likes, videos from the last 30 days | TikTok only accepts HTTPS redirects, so set a public URL (e.g. `cloudflared tunnel --url http://localhost:3030`) while connecting. |

App secrets and tokens are encrypted (AES-256-GCM) with a key the app creates on first start in the `analytics_app_data` volume (or set `APP_SECRET`). Back up that volume with your database: without the key, saved logins can't be read and you'd reconnect each platform.

### Import CSV files

Go to **Import** in the sidebar and upload CSV exports. The file type is detected from its headers (see `lib/csv-mappings.ts`):

| Type | Must contain columns | Table(s) |
|---|---|---|
| TikTok Videos | `video_id`, `engagement_rate` | `tiktok_videos` |
| TikTok Snapshot | `metric`, `value` | `tiktok_snapshots` |
| YouTube Daily | `day`, `estimatedMinutesWatched` | `yt_daily` |
| YouTube Top Videos | `video`, `averageViewPercentage` | `yt_videos` |
| Instagram Media | `media_id`, `permalink` | `ig_media` |
| Instagram Daily | see `lib/csv-mappings.ts` | `ig_daily` |
| Meta Snapshot | `key`, `value` | `ig_snapshots`, `fb_snapshots` |
| Facebook Posts | `post_id`, `reactions` | `fb_posts` |

Imports are upserts, so re-importing the same file is safe. You can also write to the tables directly from any scheduler (cron, n8n, Airflow). The schema is in `migrations/`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_PASSWORD` | `changeme` | DB password (both containers) |
| `DB_PORT` / `APP_PORT` | `5433` / `3030` | Host ports |
| `DATABASE_URL` | none | Used by `npm run dev/migrate/seed` outside Docker |
| `DASHBOARD_TITLE` | `Social Analytics` | Browser tab title (read at runtime) |
| `APP_SECRET` | key file in `/app/data` | Encryption key for platform logins (optional) |
| `PILLARS_FILE` | `config/pillars.json` | Starting pillar keywords, used until the first save on the Pillars page |

### Content pillars

Posts are grouped into categories ("pillars") by keywords in their title or caption. The first match wins, and anything unmatched counts as `Other`.

Edit them on the **Pillars** page (sidebar, or **Edit keywords** on any platform's Pillars tab):

- Rename pillars, add or remove keywords, and see how many posts each one catches, all updating live.
- **Suggested keywords** lists the most common words in uncategorised posts (filler words in English, Spanish and Portuguese are skipped). Click one to add it to a pillar.
- **All platforms** is the shared list. Use **Customise for YouTube** (etc.) to give a platform its own list, and **Use All platforms list** to go back.

Keywords are stored in the `pillar_keywords` table. Until the first save, the starting lists come from `config/pillars.json` (gitignored), or from `config/pillars.example.json` if that file doesn't exist (override the path with `PILLARS_FILE`).

> There is no login. Anyone who can open the dashboard can edit keywords, import data and use the connected platform logins, so run it on a trusted network or behind your own auth proxy.

## Roadmap

- Ship the AI strategy generator that fills `strategy_content`
- Instagram/Facebook demographics

## License

[MIT](LICENSE)
