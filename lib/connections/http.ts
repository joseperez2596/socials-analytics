// fetch wrapper that turns platform errors into readable messages and flags expired logins.
export class AuthError extends Error {}

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) });
  } catch (err) {
    throw new Error(`Couldn't reach ${new URL(url).host}: ${(err as Error).message}`);
  }
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error page */
  }
  // TikTok wraps errors in a 200 response: { error: { code: "access_token_invalid" } }
  const tiktokErr = body.error as { code?: string; message?: string } | undefined;
  const ok = res.ok && !(tiktokErr && typeof tiktokErr === "object" && tiktokErr.code && tiktokErr.code !== "ok");
  if (ok) return body as T;

  const e = body.error as Record<string, unknown> | string | undefined;
  const msg =
    (typeof e === "string" ? `${e}${body.error_description ? `: ${body.error_description}` : ""}` : undefined) ??
    (e && typeof e === "object" ? String(e.message ?? e.code ?? "") : "") ??
    "";
  const detail = msg || text.slice(0, 200) || res.statusText;
  const code = e && typeof e === "object" ? (e as Record<string, unknown>).code : undefined;
  const authFailed =
    res.status === 401 ||
    e === "invalid_grant" ||
    code === 190 || // Meta: token expired or revoked
    code === "access_token_invalid" ||
    code === "refresh_token_invalid";
  throw authFailed ? new AuthError(detail) : new Error(`${new URL(url).host} said: ${detail} (HTTP ${res.status})`);
}

export const form = (data: Record<string, string>): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(data),
});
