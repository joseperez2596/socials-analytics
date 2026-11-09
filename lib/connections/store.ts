// Server-only access to connections, sync runs and settings.
import { query } from "@/lib/db";
import { decrypt, encrypt } from "./crypto";
import type { Schedule } from "./schedule";

export const PLATFORMS = ["youtube", "meta", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];
export const isPlatform = (p: unknown): p is Platform => PLATFORMS.includes(p as Platform);

export type Account = {
  id?: string;
  name?: string;
  detail?: string;
  // Meta only
  pages?: { id: string; name: string; ig_id?: string; ig_username?: string }[];
  page_id?: string;
  ig_user_id?: string;
  open_id?: string; // TikTok
};

type Row = {
  platform: Platform;
  client_id: string | null;
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
  refresh_expires_at: Date | null;
  account: Account;
  last_error: string | null;
  connected_at: Date | null;
};

/** Decrypted connection, server-side only. */
export type Connection = Omit<Row, "client_secret" | "access_token" | "refresh_token"> & {
  client_secret: string | null;
  access_token: string | null;
  refresh_token: string | null;
};

const dec = (v: string | null) => (v ? decrypt(v) : null);
const enc = (v: string | null | undefined) => (v ? encrypt(v) : null);

export async function getConnection(platform: Platform): Promise<Connection | null> {
  const [r] = await query<Row>("SELECT * FROM connections WHERE platform = $1", [platform]);
  if (!r) return null;
  return { ...r, client_secret: dec(r.client_secret), access_token: dec(r.access_token), refresh_token: dec(r.refresh_token) };
}

export async function saveKeys(platform: Platform, clientId: string, clientSecret: string | null) {
  await query(
    `INSERT INTO connections (platform, client_id, client_secret) VALUES ($1, $2, $3)
     ON CONFLICT (platform) DO UPDATE SET client_id = EXCLUDED.client_id,
       client_secret = COALESCE(EXCLUDED.client_secret, connections.client_secret), updated_at = NOW()`,
    [platform, clientId, enc(clientSecret)]
  );
}

export async function saveTokens(
  platform: Platform,
  t: { access_token?: string | null; refresh_token?: string | null; expires_in?: number; refresh_expires_in?: number },
  account?: Account
) {
  const at = (s?: number) => (s ? new Date(Date.now() + s * 1000) : null);
  await query(
    `UPDATE connections SET
       access_token = COALESCE($2, access_token),
       refresh_token = COALESCE($3, refresh_token),
       token_expires_at = CASE WHEN $2::text IS NULL THEN token_expires_at ELSE $4 END,
       refresh_expires_at = COALESCE($5, refresh_expires_at),
       account = COALESCE($6, account),
       connected_at = CASE WHEN $6::jsonb IS NULL THEN connected_at ELSE NOW() END,
       last_error = NULL, updated_at = NOW()
     WHERE platform = $1`,
    [platform, enc(t.access_token), enc(t.refresh_token), at(t.expires_in), at(t.refresh_expires_in), account ? JSON.stringify(account) : null]
  );
}

export async function setAccount(platform: Platform, account: Account, accessToken?: string) {
  await query(
    "UPDATE connections SET account = $2, access_token = COALESCE($3, access_token), updated_at = NOW() WHERE platform = $1",
    [platform, JSON.stringify(account), enc(accessToken)]
  );
}

export async function setError(platform: Platform, error: string | null) {
  await query("UPDATE connections SET last_error = $2, updated_at = NOW() WHERE platform = $1", [platform, error]);
}

/** Forget the login and keys. Data already synced stays. */
export async function disconnect(platform: Platform) {
  await query("DELETE FROM connections WHERE platform = $1", [platform]);
}

export type SyncRun = {
  id: number;
  platform: Platform;
  trigger: string;
  started_at: Date;
  finished_at: Date | null;
  status: "running" | "ok" | "error";
  rows: number | null;
  error: string | null;
};

export async function recentRuns(limit = 30): Promise<SyncRun[]> {
  return query<SyncRun>("SELECT * FROM sync_runs ORDER BY started_at DESC LIMIT $1", [limit]).catch(() => []);
}

export async function lastRunStart(platform: Platform): Promise<Date | null> {
  const [r] = await query<{ started_at: Date }>(
    "SELECT started_at FROM sync_runs WHERE platform = $1 ORDER BY started_at DESC LIMIT 1",
    [platform]
  );
  return r?.started_at ?? null;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [r] = await query<{ value: T }>("SELECT value FROM settings WHERE key = $1", [key]).catch(() => []);
  return r?.value ?? fallback;
}

export async function setSetting(key: string, value: unknown) {
  await query(
    "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [key, JSON.stringify(value)]
  );
}

export type ScheduleSetting = { schedule: Schedule; tz: string };
export const getSchedule = () => getSetting<ScheduleSetting>("sync_schedule", { schedule: "daily", tz: "UTC" });
export const getPublicUrl = () => getSetting<string>("public_url", "");
