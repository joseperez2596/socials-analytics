import fs from "node:fs";
import path from "node:path";

type PillarMap = Record<string, string[]>;
type PillarConfig = { default: PillarMap } & Partial<Record<string, PillarMap>>;

// Server-only. Reads PILLARS_FILE, else config/pillars.json, else the committed example.
// ponytail: read per request (tiny file); cache if it ever shows in profiles.
function loadConfig(): PillarConfig {
  const candidates = [
    process.env.PILLARS_FILE,
    "config/pillars.json",
    "config/pillars.example.json",
  ].filter(Boolean) as string[];
  for (const file of candidates) {
    // turbopackIgnore: runtime path; without it the build traces the whole repo into .next/standalone.
    const full = path.join(/* turbopackIgnore: true */ process.cwd(), file);
    if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, "utf8"));
  }
  return { default: {} };
}

/** Keyword map for a platform; falls back to the "default" section. */
export function getPillars(platform: "tiktok" | "instagram" | "facebook" | "youtube"): PillarMap {
  const config = loadConfig();
  return config[platform] ?? config.default;
}

export function classifyByKeywords(
  text: string,
  keywords: Record<string, string[]>
): string {
  const lower = text.toLowerCase();
  for (const [pillar, terms] of Object.entries(keywords)) {
    if (terms.some((kw) => lower.includes(kw))) return pillar;
  }
  return "Other";
}
