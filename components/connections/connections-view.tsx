"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  choosePageAction,
  disconnectAction,
  saveKeysAction,
  setPublicUrlAction,
  setScheduleAction,
  syncNowAction,
} from "@/app/connections/actions";
import { SCHEDULES, type Schedule } from "@/lib/connections/schedule";
import type { Account, Platform } from "@/lib/connections/store";

export type PlatformView = {
  platform: Platform;
  clientId: string;
  secretHint: string;
  connected: boolean;
  account: Account;
  lastError: string | null;
  refreshExpiresAt: string | null;
  redirectUri: string;
};
type Run = {
  id: number;
  platform: Platform;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "ok" | "error";
  rows: number | null;
  error: string | null;
};
type Notice = { text: string; error?: boolean } | null;

const META: Record<
  Platform,
  { name: string; short: string; color: string; console: string; consoleLabel: string; idLabel: string; secretLabel: string; pulls: string; steps: ReactNode[] }
> = {
  youtube: {
    name: "YouTube",
    short: "YT",
    color: "#FF0000",
    console: "https://console.cloud.google.com/",
    consoleLabel: "Google Cloud Console",
    idLabel: "Client ID",
    secretLabel: "Client secret",
    pulls: "Channel stats, daily views and watch time (365 days), top 20 videos, traffic sources, countries",
    steps: [
      <>Create a project, then enable <b>YouTube Data API v3</b> and <b>YouTube Analytics API</b>.</>,
      <>Under <b>OAuth consent screen</b>, choose External and set Publishing status to <b>In production</b>. In Testing, Google signs you out every 7 days.</>,
      <>Under <b>Credentials</b>, create an OAuth client ID of type <b>Web application</b> and add this redirect URL:</>,
    ],
  },
  meta: {
    name: "Facebook + Instagram",
    short: "FB",
    color: "#1877F2",
    console: "https://developers.facebook.com/apps/",
    consoleLabel: "Meta for Developers",
    idLabel: "App ID",
    secretLabel: "App secret",
    pulls: "Page fans and daily engagement, recent posts, Instagram followers, daily reach and media (30 days)",
    steps: [
      <>Create an app and add the <b>Facebook Login</b> product. Your Instagram account must be a professional account linked to your Page.</>,
      <>Keep the app in <b>Development</b> mode. Your own Page and Instagram account work without Meta&apos;s review, as long as you&apos;re an admin of the app.</>,
      <>In Facebook Login settings, add this under <b>Valid OAuth Redirect URIs</b>:</>,
    ],
  },
  tiktok: {
    name: "TikTok",
    short: "TK",
    color: "#FF0050",
    console: "https://developers.tiktok.com/apps/",
    consoleLabel: "TikTok for Developers",
    idLabel: "Client key",
    secretLabel: "Client secret",
    pulls: "Followers, likes, video count, videos from the last 30 days with views and engagement",
    steps: [
      <>Create an app with <b>Login Kit</b> and the scopes <b>user.info.basic</b>, <b>user.info.stats</b> and <b>video.list</b>.</>,
      <>Until TikTok approves the app, only accounts added as <b>sandbox test users</b> can connect.</>,
      <>TikTok only accepts HTTPS redirect URLs. Set a public URL below (a tunnel to this dashboard works), then add this redirect URL:</>,
    ],
  },
};

type Status = "off" | "keys" | "choose" | "bad" | "warn" | "ok" | "running";
const PILL: Record<Status, [string, string]> = {
  off: ["Not set up", "bg-ink/5 text-ink/50"],
  keys: ["Ready to connect", "bg-ink/5 text-ink"],
  choose: ["Choose a Page", "bg-amber-500/15 text-amber-800"],
  bad: ["Needs reconnect", "bg-neg/10 text-neg"],
  warn: ["Expires soon", "bg-amber-500/15 text-amber-800"],
  ok: ["Connected", "bg-pos/10 text-pos"],
  running: ["Syncing…", "bg-ink/5 text-ink"],
};

function statusOf(p: PlatformView, running: boolean): Status {
  if (running) return "running";
  if (!p.clientId) return "off";
  if (!p.connected) return "keys";
  if (p.lastError) return "bad";
  if (p.platform === "meta" && !p.account.page_id) return "choose";
  if (p.refreshExpiresAt && new Date(p.refreshExpiresAt).getTime() < Date.now() + 14 * 86_400_000) return "warn";
  return "ok";
}

function when(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso), now = new Date();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Yesterday ${time}`;
  return `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${time}`;
}

const btn = "rounded-lg border border-ink/10 bg-card px-3.5 py-1.5 text-sm whitespace-nowrap disabled:opacity-40";
const primary = "rounded-lg bg-ink text-paper px-3.5 py-1.5 text-sm font-medium whitespace-nowrap disabled:opacity-40";

export function ConnectionsView({
  selected,
  platforms,
  runs,
  schedule,
  publicUrl,
  notice: initialNotice,
}: {
  selected: Platform;
  platforms: PlatformView[];
  runs: Run[];
  schedule: Schedule;
  publicUrl: string;
  notice: Notice;
}) {
  const router = useRouter();
  const [sel, setSel] = useState<Platform>(selected);
  const [notice, setNotice] = useState<Notice>(initialNotice);
  const [pending, start] = useTransition();
  const isRunning = (p: Platform) =>
    runs.some((r) => r.platform === p && r.status === "running" && Date.now() - new Date(r.started_at).getTime() < 15 * 60_000);
  const anyRunning = platforms.some((p) => isRunning(p.platform));

  // While a sync runs (e.g. the first one after connecting), refresh until it finishes.
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [anyRunning, router]);

  function act(fn: () => Promise<{ error?: string; message?: string }>) {
    start(async () => {
      const r = await fn();
      setNotice(r.error ? { text: r.error, error: true } : r.message ? { text: r.message } : null);
      router.refresh();
    });
  }

  const p = platforms.find((x) => x.platform === sel)!;
  const m = META[sel];
  const status = statusOf(p, isRunning(sel));

  return (
    <div className="flex flex-col gap-5 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Connections</h1>
          <p className="text-sm text-ink/60 max-w-[64ch] mt-1">
            Connect each platform once and the dashboard pulls your numbers on its own. You use your own developer app
            for each platform, and its keys are stored encrypted in your database.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink/60">
          Automatic sync
          <select
            defaultValue={schedule}
            disabled={pending}
            onChange={(e) => act(() => setScheduleAction(e.target.value, Intl.DateTimeFormat().resolvedOptions().timeZone))}
            className="rounded-lg border border-ink/10 bg-card px-2 py-1.5 text-ink"
          >
            {Object.entries(SCHEDULES).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <div role="status" className={`rounded-xl px-4 py-2.5 text-sm ${notice.error ? "bg-neg/10 text-neg" : "bg-pos/10 text-pos"}`}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] items-start">
        <nav className="rounded-2xl border border-ink/10 bg-card overflow-hidden" aria-label="Platforms">
          {platforms.map((x) => {
            const [label, cls] = PILL[statusOf(x, isRunning(x.platform))];
            return (
              <button
                key={x.platform}
                aria-current={x.platform === sel}
                onClick={() => {
                  setSel(x.platform);
                  setNotice(null);
                  history.replaceState(null, "", `/connections?p=${x.platform}`);
                }}
                className={`flex w-full items-center gap-3 border-t border-ink/10 first:border-t-0 px-4 py-3 text-left ${x.platform === sel ? "bg-ink/5" : "hover:bg-ink/[.03]"}`}
              >
                <Logo p={x.platform} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate">{META[x.platform].name}</span>
                  <Pill label={label} cls={cls} />
                </span>
              </button>
            );
          })}
        </nav>

        <section className="rounded-2xl border border-ink/10 bg-card p-5 flex flex-col gap-5 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Logo p={sel} big />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{m.name}</h2>
              <p className="text-sm text-ink/45">{m.pulls}</p>
            </div>
            {p.connected && (
              <div className="flex gap-2">
                <button className={primary} disabled={pending || status === "running" || status === "bad" || status === "choose"} onClick={() => act(() => syncNowAction(sel))}>
                  {status === "running" || pending ? "Syncing…" : "Sync now"}
                </button>
                <DisconnectButton disabled={pending} onConfirm={() => act(() => disconnectAction(sel))} />
              </div>
            )}
          </div>

          {status === "bad" && (
            <Alert tone="bad" action={<a href={`/api/connect/${sel}`} className={btn}>Reconnect</a>}>{p.lastError}</Alert>
          )}
          {status === "warn" && (
            <Alert tone="warn" action={<a href={`/api/connect/${sel}`} className={btn}>Reconnect</a>}>
              The saved login expires {when(p.refreshExpiresAt)}. Reconnect before then to keep syncing.
            </Alert>
          )}

          {status === "choose" && (
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">Which Page should be synced?</span>
              <div className="flex flex-wrap gap-2">
                {(p.account.pages ?? []).map((pg) => (
                  <button key={pg.id} className={btn} disabled={pending} onClick={() => act(() => choosePageAction(pg.id))}>
                    {pg.name}
                    <span className="ml-2 text-ink/40">{pg.ig_username ? `@${pg.ig_username}` : "no Instagram"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {p.connected && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink/40">Account</dt>
              <dd className="min-w-0 break-words">{[p.account.name, p.account.detail].filter(Boolean).join(" · ") || "Connected"}</dd>
              <dt className="text-ink/40">Last sync</dt>
              <dd className="tabular-nums">{lastSync(runs, sel)}</dd>
              <dt className="text-ink/40">Next sync</dt>
              <dd>{status === "bad" ? "Paused until you reconnect" : status === "choose" ? "After you choose a Page" : SCHEDULES[schedule]}</dd>
            </dl>
          )}

          {p.connected ? (
            <details className="rounded-xl border border-ink/10 px-4 py-3">
              <summary className="cursor-pointer text-sm text-ink/60">App keys and setup</summary>
              <div className="pt-4"><Setup p={p} publicUrl={publicUrl} pending={pending} act={act} /></div>
            </details>
          ) : (
            <Setup p={p} publicUrl={publicUrl} pending={pending} act={act} />
          )}

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink/40">Sync history</span>
            <History runs={runs.filter((r) => r.platform === sel).slice(0, 15)} />
          </div>
        </section>
      </div>
    </div>
  );
}

function Setup({ p, publicUrl, pending, act }: { p: PlatformView; publicUrl: string; pending: boolean; act: (fn: () => Promise<{ error?: string; message?: string }>) => void }) {
  const m = META[p.platform];
  const [id, setId] = useState(p.clientId);
  const [secret, setSecret] = useState("");
  const [url, setUrl] = useState(publicUrl);
  const keysSaved = !!p.clientId && !!p.secretHint;
  const n = p.platform === "tiktok" ? 1 : 0; // TikTok has an extra public-URL step

  return (
    <ol className="flex flex-col gap-4">
      <Step n={1} done={keysSaved}>
        Open{" "}
        <a href={m.console} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {m.consoleLabel}
        </a>
        . {m.steps[0]}
      </Step>
      <Step n={2} done={keysSaved}>{m.steps[1]}</Step>
      {p.platform === "tiktok" && (
        <Step n={3} done={!!publicUrl}>
          <span>Public HTTPS address of this dashboard, for example from <code className="font-mono text-xs">cloudflared tunnel --url http://localhost:3030</code>.</span>
          <div className="flex flex-wrap gap-2">
            <input
              id="public-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-tunnel.trycloudflare.com"
              aria-label="Public URL"
              className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-paper px-3 py-1.5 font-mono text-xs"
            />
            <button className={btn} disabled={pending || url === publicUrl} onClick={() => act(() => setPublicUrlAction(url))}>Save URL</button>
          </div>
        </Step>
      )}
      <Step n={3 + n} done={keysSaved}>
        <span>{m.steps[2]}</span>
        <CopyField text={p.redirectUri} />
      </Step>
      <Step n={4 + n} done={keysSaved}>
        <span>Paste the app&apos;s keys and save them.</span>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {m.idLabel}
            <input id={`client-id-${p.platform}`} value={id} onChange={(e) => setId(e.target.value)} autoComplete="off"
              className="rounded-lg border border-ink/10 bg-paper px-3 py-1.5 font-mono text-xs min-w-0" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {m.secretLabel}
            <input id={`client-secret-${p.platform}`} type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="new-password"
              placeholder={p.secretHint ? `Saved · ends in …${p.secretHint}` : ""}
              className="rounded-lg border border-ink/10 bg-paper px-3 py-1.5 font-mono text-xs min-w-0" />
          </label>
        </div>
        <div>
          <button className={btn} disabled={pending || !id.trim() || (id === p.clientId && !secret)} onClick={() => act(async () => {
            const r = await saveKeysAction(p.platform, id, secret);
            if (!r.error) setSecret("");
            return r;
          })}>
            {keysSaved ? "Replace keys" : "Save keys"}
          </button>
        </div>
      </Step>
      <Step n={5 + n} done={p.connected}>
        <span>Sign in with the account you want to track. You&apos;ll come back here, and the first sync starts straight away.</span>
        <div>
          {keysSaved && !(p.platform === "tiktok" && !publicUrl) ? (
            <a href={`/api/connect/${p.platform}`} className={`inline-block ${primary}`}>{p.connected ? "Reconnect" : `Connect ${m.name}`}</a>
          ) : (
            <button className={primary} disabled>Connect {m.name}</button>
          )}
        </div>
      </Step>
    </ol>
  );
}

function Step({ n, done, children }: { n: number; done?: boolean; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 text-sm">
      <span className={`grid size-[22px] place-items-center rounded-full border font-mono text-[11px] ${done ? "border-pos bg-pos text-paper" : "border-ink/30 text-ink/60"}`}>
        {done ? "✓" : n}
      </span>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </li>
  );
}

function CopyField({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-ink/5 py-1.5 pl-3 pr-1.5 font-mono text-xs">
      <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap select-all">{text}</span>
      <button
        className="rounded-md bg-card px-2 py-1"
        onClick={() => navigator.clipboard?.writeText(text).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)), () => {})}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function DisconnectButton({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button className={btn} disabled={disabled} onClick={() => setAsking(true)}>Disconnect</button>;
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-ink/60">Remove login and keys?</span>
      <button className={`${btn} text-neg`} onClick={() => (setAsking(false), onConfirm())}>Disconnect</button>
      <button className={btn} onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
}

function Alert({ tone, action, children }: { tone: "bad" | "warn"; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-xl px-4 py-3 text-sm ${tone === "bad" ? "bg-neg/10 text-neg" : "bg-amber-500/15 text-amber-900"}`}>
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

function Logo({ p, big }: { p: Platform; big?: boolean }) {
  return (
    <span className={`grid flex-none place-items-center rounded-lg font-mono text-white ${big ? "size-10 text-xs" : "size-8 text-[11px]"}`} style={{ background: META[p].color }}>
      {META[p].short}
    </span>
  );
}

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] ${cls}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function lastSync(runs: Run[], p: Platform): string {
  const r = runs.find((x) => x.platform === p && x.status !== "running");
  if (!r) return "Never";
  return `${when(r.started_at)} · ${r.status === "ok" ? `${r.rows ?? 0} rows` : "failed"}`;
}

function History({ runs }: { runs: Run[] }) {
  if (runs.length === 0) return <p className="text-sm text-ink/40">No syncs yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-[11px] uppercase tracking-wider text-ink/40">
            <th className="py-2 pr-4 font-medium">When</th>
            <th className="py-2 pr-4 font-medium">How</th>
            <th className="py-2 pr-4 font-medium">Result</th>
            <th className="py-2 font-medium">Took</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-ink/10 align-top">
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{when(r.started_at)}</td>
              <td className="py-2 pr-4 text-ink/50">{r.trigger === "schedule" ? "Automatic" : r.trigger === "connect" ? "First sync" : "Sync now"}</td>
              <td className="py-2 pr-4">
                {r.status === "ok" ? <Pill label={`${r.rows ?? 0} rows`} cls={PILL.ok[1]} /> : r.status === "running" ? <Pill label="Running" cls={PILL.running[1]} /> : (
                  <span className="text-neg">{r.error}</span>
                )}
              </td>
              <td className="py-2 whitespace-nowrap text-ink/40 tabular-nums">
                {r.finished_at ? `${Math.max(1, Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000))}s` : "…"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
