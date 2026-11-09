"use server";

import { revalidatePath } from "next/cache";
import { listPages, pageAccount } from "@/lib/connections/providers";
import { SCHEDULES, type Schedule } from "@/lib/connections/schedule";
import { disconnect, getConnection, isPlatform, saveKeys, setAccount, setSetting } from "@/lib/connections/store";
import { runSync } from "@/lib/sync/run";

// Server Functions are reachable by direct POST: check every input.
// ponytail: no auth, same as the rest of the dashboard; README says run it on a trusted network.
type Result = { error?: string; message?: string };
const done = (r: Result = {}): Result => (revalidatePath("/connections"), r);
const platformOf = (p: unknown) => {
  if (!isPlatform(p)) throw new Error("Unknown platform");
  return p;
};
async function safely(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn();
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function saveKeysAction(platform: string, clientId: string, clientSecret: string) {
  return safely(async () => {
    const p = platformOf(platform);
    const id = String(clientId ?? "").trim(), secret = String(clientSecret ?? "").trim();
    if (!id || id.length > 500) return { error: "Paste the app ID (up to 500 characters)." };
    if (secret.length > 500) return { error: "That secret is too long." };
    const existing = await getConnection(p);
    if (!secret && !existing?.client_secret) return { error: "Paste the app secret too." };
    await saveKeys(p, id, secret || null);
    return done({ message: "Keys saved." });
  });
}

export async function syncNowAction(platform: string) {
  return safely(async () => {
    const r = await runSync(platformOf(platform), "manual");
    return done(r.ok ? { message: `Synced ${r.rows} rows.` } : { error: r.skipped ? r.error : "Sync failed. The details are below." });
  });
}

export async function disconnectAction(platform: string) {
  return safely(async () => {
    await disconnect(platformOf(platform));
    return done({ message: "Disconnected. Data already synced stays in the dashboard." });
  });
}

export async function setScheduleAction(schedule: string, tz: string) {
  return safely(async () => {
    if (!(schedule in SCHEDULES)) return { error: "Unknown schedule" };
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
    } catch {
      tz = "UTC";
    }
    await setSetting("sync_schedule", { schedule: schedule as Schedule, tz });
    return done({ message: `Automatic sync: ${SCHEDULES[schedule as Schedule]}.` });
  });
}

export async function setPublicUrlAction(url: string) {
  return safely(async () => {
    const v = String(url ?? "").trim().replace(/\/$/, "");
    if (v) {
      let u: URL;
      try {
        u = new URL(v);
      } catch {
        return { error: "That isn't a valid URL." };
      }
      if (u.protocol !== "https:") return { error: "TikTok needs an https:// address." };
    }
    await setSetting("public_url", v);
    return done({ message: v ? "Public URL saved." : "Public URL cleared." });
  });
}

export async function choosePageAction(pageId: string) {
  return safely(async () => {
    const conn = await getConnection("meta");
    if (!conn?.refresh_token) return { error: "Connect Facebook first." };
    const page = (await listPages(conn.refresh_token)).find((p) => p.id === String(pageId));
    if (!page) return { error: "That Page isn't available to this login any more. Reconnect." };
    const { access_token, ...rest } = page;
    await setAccount("meta", { ...conn.account, ...pageAccount(rest) }, access_token);
    void runSync("meta", "connect");
    return done({ message: `Syncing ${page.name}…` });
  });
}
