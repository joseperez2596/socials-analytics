"use server";

import { revalidatePath } from "next/cache";
import { PLATFORMS, resetPillars, savePillars, type Platform, type Scope } from "@/lib/pillars/store";
import type { Pillar } from "@/lib/pillars/classify";

// Server Functions are reachable by direct POST, so validate everything that comes in.
// ponytail: no auth here, same as /import; README says run on a trusted network.
function clean(list: unknown): Pillar[] {
  if (!Array.isArray(list) || list.length > 50) throw new Error("Expected up to 50 pillars");
  const seen = new Set<string>();
  return list.map((p) => {
    const name = String((p as Pillar)?.name ?? "").trim().slice(0, 60);
    if (!name || name.toLowerCase() === "other") throw new Error("Each pillar needs a name other than “Other”");
    if (seen.has(name.toLowerCase())) throw new Error(`Two pillars are called “${name}”`);
    seen.add(name.toLowerCase());
    const raw = Array.isArray((p as Pillar)?.keywords) ? (p as Pillar).keywords : [];
    const keywords = [...new Set(raw.map((k) => String(k).trim().toLowerCase().slice(0, 60)).filter(Boolean))].slice(0, 200);
    return { name, keywords };
  });
}

function scopeOf(s: unknown): Scope {
  if (!PLATFORMS.includes(s as Scope)) throw new Error("Unknown platform");
  return s as Scope;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveList(scope: string, list: Pillar[]): Promise<{ error?: string }> {
  try {
    await savePillars(scopeOf(scope), clean(list));
    refresh();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function resetList(platform: string): Promise<{ error?: string }> {
  try {
    const s = scopeOf(platform);
    if (s === "default") throw new Error("The All platforms list can't be reset");
    await resetPillars(s as Platform);
    refresh();
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}
