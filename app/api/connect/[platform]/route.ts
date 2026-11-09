import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl } from "@/lib/connections/providers";
import { redirectUri, requestOrigin } from "@/lib/connections/origin";
import { getConnection, isPlatform } from "@/lib/connections/store";

// Starts the platform's sign-in. A random state in a short-lived cookie guards the callback.
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  const conn = await getConnection(platform);
  const back = new URL(`/connections?p=${platform}`, requestOrigin(req));
  if (!conn?.client_id || !conn.client_secret) {
    back.searchParams.set("error", "Save the app's keys before connecting.");
    return NextResponse.redirect(back);
  }
  const state = crypto.randomBytes(24).toString("hex");
  const uri = await redirectUri(platform, req);
  const res = NextResponse.redirect(authorizeUrl(platform, conn.client_id, uri, state));
  res.cookies.set(`oauth_${platform}`, JSON.stringify({ state, uri }), {
    httpOnly: true,
    sameSite: "lax",
    secure: uri.startsWith("https://"),
    path: "/api/connect",
    maxAge: 600,
  });
  return res;
}
