// Runs one platform sync: fresh token -> fetch -> transform -> upsert, recorded in sync_runs.
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { AuthError, api } from "@/lib/connections/http";
import { refresh } from "@/lib/connections/providers";
import { getConnection, saveTokens, setError, type Connection, type Platform } from "@/lib/connections/store";
import { metaWrites, tiktokWrites, youtubeWrites, type Write } from "./transform";

const GRAPH = "https://graph.facebook.com/v22.0";
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

async function fetchYoutube(c: Connection, today: string): Promise<Write[]> {
  const h = { headers: { Authorization: `Bearer ${c.access_token}` } };
  const channel = c.account.id!;
  const reports = (p: Record<string, string>) =>
    api(`https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ ids: `channel==${channel}`, startDate: iso(daysAgo(365)), endDate: today, ...p })}`, h);
  const [ch, daily, top, traffic, geo] = await Promise.all([
    api(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channel}`, h),
    reports({ metrics: "views,estimatedMinutesWatched,averageViewDuration,subscribersGained", dimensions: "day", sort: "day" }),
    reports({ metrics: "views,estimatedMinutesWatched,subscribersGained", dimensions: "video", sort: "-views", maxResults: "20" }),
    reports({ metrics: "views,estimatedMinutesWatched", dimensions: "insightTrafficSourceType", sort: "-views" }),
    reports({ metrics: "views,estimatedMinutesWatched", dimensions: "country", sort: "-views", maxResults: "20" }),
  ]);
  const ids = ((top.rows as unknown[][]) ?? []).map((r) => r[0]).join(",");
  const titles = ids ? await api(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${ids}`, h) : {};
  return youtubeWrites({ channel: ch, daily, top, titles, traffic, geo }, today);
}

async function fetchMeta(c: Connection, today: string): Promise<Write[]> {
  const { page_id, ig_user_id } = c.account;
  if (!page_id) throw new Error("Choose which Facebook Page to sync first.");
  const token = c.access_token!;
  const since = String(Math.floor(daysAgo(30).getTime() / 1000)), until = String(Math.floor(Date.now() / 1000));
  const g = (path: string, p: Record<string, string>) => api(`${GRAPH}/${path}?${new URLSearchParams({ ...p, access_token: token })}`);
  // Meta retires insight metrics now and then; a failing metric shouldn't sink the whole sync.
  const optional = (p: Promise<Record<string, unknown>>) => p.catch((e) => { if (e instanceof AuthError) throw e; return undefined; });
  const [page, insights, posts, ig, igReach, igMedia] = await Promise.all([
    g(page_id, { fields: "fan_count,followers_count" }),
    optional(g(`${page_id}/insights`, { metric: "page_post_engagements", period: "day", since, until })),
    g(`${page_id}/posts`, { fields: "id,message,created_time,reactions.summary(true),comments.summary(true),shares", limit: "50", since, until }),
    ig_user_id ? g(ig_user_id, { fields: "followers_count,media_count,username" }) : undefined,
    ig_user_id ? optional(g(`${ig_user_id}/insights`, { metric: "reach", period: "day", since, until })) : undefined,
    ig_user_id ? g(`${ig_user_id}/media`, { fields: "id,caption,media_type,timestamp,like_count,comments_count,permalink", limit: "50" }) : undefined,
  ]);
  return metaWrites({ page, insights, posts, ig, igReach, igMedia }, today, iso(daysAgo(30)));
}

async function fetchTiktok(c: Connection, today: string): Promise<Write[]> {
  const h = { Authorization: `Bearer ${c.access_token}`, "Content-Type": "application/json" };
  const startTs = Math.floor(daysAgo(30).getTime() / 1000);
  const user = await api<{ data?: { user?: Record<string, unknown> } }>(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count", { headers: h });
  const fields = "id,title,create_time,duration,view_count,like_count,comment_count,share_count,share_url";
  const videos: Record<string, unknown>[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 10; page++) { // ponytail: 10 pages x 20 = 200 videos, plenty for a 30-day window
    const r = await api<{ data?: { videos?: Record<string, unknown>[]; cursor?: number; has_more?: boolean } }>(
      `https://open.tiktokapis.com/v2/video/list/?fields=${fields}`,
      { method: "POST", headers: h, body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }) });
    const batch = r.data?.videos ?? [];
    videos.push(...batch);
    // Newest first: stop once we're past the window or out of pages.
    if (!r.data?.has_more || batch.some((v) => Number(v.create_time) < startTs)) break;
    cursor = r.data.cursor;
  }
  return tiktokWrites({ user: user.data?.user ?? {}, videos }, today, startTs);
}

const FETCH: Record<Platform, (c: Connection, today: string) => Promise<Write[]>> = { youtube: fetchYoutube, meta: fetchMeta, tiktok: fetchTiktok };

async function upsert(client: PoolClient, w: Write): Promise<number> {
  if (w.rows.length === 0) return 0;
  const cols = Object.keys(w.rows[0]);
  const update = cols.filter((c) => !w.key.includes(c));
  for (let i = 0; i < w.rows.length; i += 500) {
    const chunk = w.rows.slice(i, i + 500);
    const values = chunk.map((_, r) => `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(",")})`).join(",");
    await client.query(
      `INSERT INTO ${w.table} (${cols.join(",")}) VALUES ${values}
       ON CONFLICT (${w.key.join(",")}) DO ${update.length ? `UPDATE SET ${update.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}` : "NOTHING"}`,
      chunk.flatMap((row) => cols.map((c) => row[c]))
    );
  }
  return w.rows.length;
}

function friendly(platform: Platform, err: unknown): string {
  const msg = (err as Error).message;
  if (!(err instanceof AuthError)) return msg;
  const short = msg.split(/(?<=\.)\s/)[0].slice(0, 140); // platforms append long help text
  if (platform === "youtube")
    return `Google signed this app out (${short}). If your Google app is in Testing mode this happens every 7 days. Set it to In production, then reconnect.`;
  return `The saved login stopped working (${short}). Reconnect to fix it.`;
}

export type SyncResult = { ok: true; rows: number } | { ok: false; error: string; skipped?: boolean };

/** Sync one platform. Never throws; the outcome is also stored in sync_runs. */
export async function runSync(platform: Platform, trigger: "manual" | "schedule" | "connect"): Promise<SyncResult> {
  const client = await pool.connect();
  try {
    const { rows: [lock] } = await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS got", [`sync:${platform}`]);
    if (!lock.got) return { ok: false, error: "A sync for this platform is already running.", skipped: true };
    const { rows: [run] } = await client.query("INSERT INTO sync_runs (platform, trigger) VALUES ($1, $2) RETURNING id", [platform, trigger]);
    try {
      let conn = await getConnection(platform);
      if (!conn?.access_token && !conn?.refresh_token) throw new Error("Not connected.");
      const fresh = await refresh(conn);
      if (fresh) {
        await saveTokens(platform, fresh);
        conn = { ...conn, access_token: fresh.access_token ?? conn.access_token };
      }
      const writes = await FETCH[platform](conn, iso(new Date()));
      await client.query("BEGIN");
      let rows = 0;
      for (const w of writes) rows += await upsert(client, w);
      await client.query("COMMIT");
      await client.query("UPDATE sync_runs SET status = 'ok', rows = $2, finished_at = NOW() WHERE id = $1", [run.id, rows]);
      await setError(platform, null);
      return { ok: true, rows };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      const error = friendly(platform, err);
      await client.query("UPDATE sync_runs SET status = 'error', error = $2, finished_at = NOW() WHERE id = $1", [run.id, error.slice(0, 1000)]);
      if (err instanceof AuthError) await setError(platform, error);
      return { ok: false, error };
    } finally {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [`sync:${platform}`]).catch(() => {});
    }
  } finally {
    client.release();
  }
}
