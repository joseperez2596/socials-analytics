// Server-only: pillar lists from Postgres, falling back to the JSON config.
import fs from "node:fs";
import path from "node:path";
import { pool, query } from "@/lib/db";
import { toMap, type Pillar, type PillarMap } from "./classify";

export const PLATFORMS = ["default", "youtube", "instagram", "facebook", "tiktok"] as const;
export type Scope = (typeof PLATFORMS)[number];
export type Platform = Exclude<Scope, "default">;

type FileConfig = { default: PillarMap } & Partial<Record<Platform, PillarMap>>;

function loadFile(): FileConfig {
  const candidates = [process.env.PILLARS_FILE, "config/pillars.json", "config/pillars.example.json"].filter(
    Boolean
  ) as string[];
  for (const file of candidates) {
    // turbopackIgnore: runtime path; without it the build traces the whole repo into .next/standalone.
    const full = path.resolve(/* turbopackIgnore: true */ process.cwd(), file); // absolute paths stay absolute
    if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, "utf8"));
  }
  return { default: {} };
}

const fromMap = (m: PillarMap): Pillar[] => Object.entries(m).map(([name, keywords]) => ({ name, keywords }));

/** Lists stored per scope. A scope missing here has no list of its own. */
export async function getAllLists(): Promise<Partial<Record<Scope, Pillar[]>>> {
  const rows = await query<{ platform: Scope; pillar: string; keywords: string[] }>(
    "SELECT platform, pillar, keywords FROM pillar_keywords ORDER BY platform, position"
  ).catch(() => []);
  if (rows.length === 0) {
    const file = loadFile();
    return Object.fromEntries(Object.entries(file).map(([k, m]) => [k, fromMap(m ?? {})]));
  }
  const out: Partial<Record<Scope, Pillar[]>> = {};
  for (const r of rows) (out[r.platform] ??= []).push({ name: r.pillar, keywords: r.keywords });
  return out;
}

/** Effective keyword map for a platform: its own list, else the All-platforms list. */
export async function getPillars(platform: Platform): Promise<PillarMap> {
  const lists = await getAllLists();
  return toMap(lists[platform] ?? lists.default ?? []);
}

/** Replace a scope's list. On first save, copies every file-based list in so nothing is lost. */
export async function savePillars(scope: Scope, list: Pillar[]): Promise<void> {
  const before = await getAllLists();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("SELECT 1 FROM pillar_keywords LIMIT 1");
    const lists = rows.length === 0 ? { ...before } : {};
    (lists as Record<string, Pillar[]>)[scope] = list;
    for (const [s, l] of Object.entries(lists)) {
      await client.query("DELETE FROM pillar_keywords WHERE platform = $1", [s]);
      for (const [i, p] of (l ?? []).entries()) {
        await client.query(
          "INSERT INTO pillar_keywords (platform, pillar, position, keywords) VALUES ($1, $2, $3, $4)",
          [s, p.name, i, p.keywords]
        );
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Drop a platform's own list so it uses the All-platforms list again. */
export async function resetPillars(platform: Platform): Promise<void> {
  const lists = await getAllLists();
  await savePillars("default", lists.default ?? []); // first save copies the file-based lists into the table
  await query("DELETE FROM pillar_keywords WHERE platform = $1", [platform]);
}

/** Recent post texts for a scope ("default" = every platform). */
export async function getPostTexts(scope: Scope, limit = 500): Promise<{ text: string; platform: Platform }[]> {
  const sources: Record<Platform, string> = {
    youtube: "SELECT title AS text, 'youtube' AS platform FROM yt_videos ORDER BY synced_at DESC NULLS LAST",
    instagram: "SELECT caption AS text, 'instagram' AS platform FROM ig_media ORDER BY post_date DESC NULLS LAST",
    facebook: "SELECT message AS text, 'facebook' AS platform FROM fb_posts ORDER BY created_time DESC NULLS LAST",
    tiktok: "SELECT title AS text, 'tiktok' AS platform FROM tiktok_videos ORDER BY create_date DESC NULLS LAST",
  };
  const picked = scope === "default" ? (Object.keys(sources) as Platform[]) : [scope];
  const results = await Promise.all(
    picked.map((p) =>
      query<{ text: string | null; platform: Platform }>(`${sources[p]} LIMIT $1`, [limit]).catch(() => [])
    )
  );
  return results.flat().filter((r): r is { text: string; platform: Platform } => !!r.text?.trim());
}
