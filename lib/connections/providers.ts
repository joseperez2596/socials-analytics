// Per-platform sign-in: authorise URL, code exchange, token refresh, account lookup.
import { api, form } from "./http";
import type { Account, Connection, Platform } from "./store";

type Tokens = { access_token?: string; refresh_token?: string; expires_in?: number; refresh_expires_in?: number };
type Linked = { tokens: Tokens; account: Account };

const GRAPH = "https://graph.facebook.com/v22.0";

export const CALLBACK = (platform: Platform) => `/api/connect/${platform}/callback`;

export function authorizeUrl(platform: Platform, clientId: string, redirectUri: string, state: string): string {
  const q = (base: string, p: Record<string, string>) => `${base}?${new URLSearchParams(p)}`;
  if (platform === "youtube")
    return q("https://accounts.google.com/o/oauth2/v2/auth", {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
      access_type: "offline",
      prompt: "consent", // always return a refresh token
      include_granted_scopes: "true",
      state,
    });
  if (platform === "meta")
    return q("https://www.facebook.com/v22.0/dialog/oauth", {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "pages_show_list,pages_read_engagement,read_insights,instagram_basic,instagram_manage_insights,business_management",
      state,
    });
  return q("https://www.tiktok.com/v2/auth/authorize/", {
    client_key: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "user.info.basic,user.info.stats,video.list",
    state,
  });
}

/** Swap the callback code for tokens and find out which account was connected. */
export async function exchange(conn: Connection, code: string, redirectUri: string): Promise<Linked> {
  const id = conn.client_id!, secret = conn.client_secret!;
  if (conn.platform === "youtube") {
    const t = await api<Tokens>("https://oauth2.googleapis.com/token",
      form({ grant_type: "authorization_code", code, client_id: id, client_secret: secret, redirect_uri: redirectUri }));
    const ch = await api<{ items?: { id: string; snippet?: { title?: string }; statistics?: { subscriberCount?: string } }[] }>(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      { headers: { Authorization: `Bearer ${t.access_token}` } });
    const c = ch.items?.[0];
    if (!c) throw new Error("That Google account has no YouTube channel. Sign in with the account that owns the channel.");
    const subs = Number(c.statistics?.subscriberCount ?? 0);
    return { tokens: t, account: { id: c.id, name: c.snippet?.title, detail: `${subs.toLocaleString("en-US")} subscribers` } };
  }
  if (conn.platform === "meta") {
    const short = await api<Tokens>(`${GRAPH}/oauth/access_token?${new URLSearchParams({ client_id: id, client_secret: secret, redirect_uri: redirectUri, code })}`);
    // Long-lived user token (~60 days); Page tokens fetched with it don't expire.
    const long = await api<Tokens>(`${GRAPH}/oauth/access_token?${new URLSearchParams({ grant_type: "fb_exchange_token", client_id: id, client_secret: secret, fb_exchange_token: short.access_token! })}`);
    const pages = await listPages(long.access_token!);
    if (pages.length === 0) throw new Error("No Facebook Pages found. Sign in with an account that manages your Page, and tick the Page when Meta asks.");
    const account: Account = { pages: pages.map((p) => ({ id: p.id, name: p.name, ig_id: p.ig_id, ig_username: p.ig_username })) };
    let accessToken: string | undefined;
    if (pages.length === 1) {
      Object.assign(account, pageAccount(pages[0]));
      accessToken = pages[0].access_token;
    }
    // refresh_token slot holds the long-lived user token, used later to pick a Page.
    return { tokens: { access_token: accessToken, refresh_token: long.access_token, refresh_expires_in: long.expires_in }, account };
  }
  const t = await api<Tokens & { open_id?: string }>("https://open.tiktokapis.com/v2/oauth/token/",
    form({ client_key: id, client_secret: secret, code, grant_type: "authorization_code", redirect_uri: redirectUri }));
  const u = await api<{ data?: { user?: { display_name?: string; follower_count?: number } } }>(
    "https://open.tiktokapis.com/v2/user/info/?fields=display_name,follower_count",
    { headers: { Authorization: `Bearer ${t.access_token}` } });
  const user = u.data?.user ?? {};
  return { tokens: t, account: { open_id: t.open_id, name: user.display_name, detail: `${(user.follower_count ?? 0).toLocaleString("en-US")} followers` } };
}

/** Fresh access token for a sync. Returns new tokens to store, or null if the current one is fine. */
export async function refresh(conn: Connection): Promise<Tokens | null> {
  const soon = !conn.token_expires_at || conn.token_expires_at.getTime() < Date.now() + 5 * 60_000;
  if (conn.platform === "meta" || !soon) return null; // Meta Page tokens don't expire
  if (!conn.refresh_token) return null;
  if (conn.platform === "youtube")
    return api<Tokens>("https://oauth2.googleapis.com/token",
      form({ grant_type: "refresh_token", refresh_token: conn.refresh_token, client_id: conn.client_id!, client_secret: conn.client_secret! }));
  return api<Tokens>("https://open.tiktokapis.com/v2/oauth/token/",
    form({ client_key: conn.client_id!, client_secret: conn.client_secret!, grant_type: "refresh_token", refresh_token: conn.refresh_token }));
}

type Page = { id: string; name: string; access_token: string; ig_id?: string; ig_username?: string };

export async function listPages(userToken: string): Promise<Page[]> {
  const r = await api<{ data?: { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }[] }>(
    `${GRAPH}/me/accounts?${new URLSearchParams({ fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: userToken })}`);
  return (r.data ?? []).map((p) => ({ id: p.id, name: p.name, access_token: p.access_token, ig_id: p.instagram_business_account?.id, ig_username: p.instagram_business_account?.username }));
}

export function pageAccount(p: Omit<Page, "access_token">): Account {
  return {
    page_id: p.id,
    ig_user_id: p.ig_id,
    name: p.name,
    detail: p.ig_username ? `@${p.ig_username} on Instagram` : "No Instagram account linked to this Page",
  };
}
