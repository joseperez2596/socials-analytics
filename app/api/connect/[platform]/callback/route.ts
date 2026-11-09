import { NextResponse, type NextRequest } from "next/server";
import { exchange } from "@/lib/connections/providers";
import { getConnection, isPlatform, saveTokens } from "@/lib/connections/store";
import { runSync } from "@/lib/sync/run";

// The platform sends the browser back here with ?code&state after sign-in.
export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 404 });

  let saved: { state?: string; uri?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(`oauth_${platform}`)?.value ?? "{}");
  } catch {}
  // Send the user back to the address they started from (the redirect URI's origin).
  const back = new URL(`/connections?p=${platform}`, saved.uri ?? req.url);
  const fail = (msg: string) => {
    back.searchParams.set("error", msg);
    const res = NextResponse.redirect(back);
    res.cookies.delete({ name: `oauth_${platform}`, path: "/api/connect" });
    return res;
  };

  const q = req.nextUrl.searchParams;
  if (q.get("error")) return fail(`Sign-in was cancelled or refused: ${q.get("error_description") ?? q.get("error")}`);
  if (!saved.state || saved.state !== q.get("state") || !saved.uri) return fail("Sign-in expired or came from another tab. Try Connect again.");
  const code = q.get("code");
  if (!code) return fail("The platform didn't send back a sign-in code.");

  const conn = await getConnection(platform);
  if (!conn?.client_id || !conn.client_secret) return fail("The app's keys are missing. Save them and connect again.");
  try {
    const { tokens, account } = await exchange(conn, code, saved.uri);
    await saveTokens(platform, tokens, account);
    // First sync in the background so the page loads straight away (Meta waits for a Page choice).
    if (platform !== "meta" || account.page_id) void runSync(platform, "connect");
  } catch (err) {
    return fail((err as Error).message);
  }
  back.searchParams.set("connected", "1");
  const res = NextResponse.redirect(back);
  res.cookies.delete({ name: `oauth_${platform}`, path: "/api/connect" });
  return res;
}
