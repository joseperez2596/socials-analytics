import type { NextRequest } from "next/server";
import { getPublicUrl, type Platform } from "./store";
import { CALLBACK } from "./providers";

/** Address the browser used to reach the dashboard (works behind Docker port mapping). */
export function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Redirect URL registered with the platform. TikTok requires HTTPS, so it uses the saved public URL. */
export async function redirectUri(platform: Platform, req: NextRequest): Promise<string> {
  const base = platform === "tiktok" ? (await getPublicUrl()) || requestOrigin(req) : requestOrigin(req);
  return base.replace(/\/$/, "") + CALLBACK(platform);
}
