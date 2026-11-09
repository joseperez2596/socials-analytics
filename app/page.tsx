export const dynamic = 'force-dynamic';

import { KpiCard } from "@/components/reports/kpi-card";
import { getYtSnapshot } from "@/lib/queries/youtube";
import { getIgSnapshot } from "@/lib/queries/instagram";
import { getFbSnapshot } from "@/lib/queries/facebook";
import { getTiktokSnapshot } from "@/lib/queries/tiktok";
import Link from "next/link";

export default async function DashboardPage() {
  const [yt, ig, fb, tt] = await Promise.all([
    getYtSnapshot().catch(() => null),
    getIgSnapshot().catch(() => null),
    getFbSnapshot().catch(() => null),
    getTiktokSnapshot().catch(() => null),
  ]);

  const synced = yt?.synced_date ?? ig?.synced_date ?? fb?.synced_date ?? tt?.synced_date;

  const platforms = [
    {
      label: "YouTube",
      href: "/youtube/funnel",
      color: "#FF0000",
      primary: yt ? `${(yt.subscriber_count / 1000).toFixed(1)}K` : "—",
      sub: "subscribers",
      secondary: yt ? `${(yt.views_365d / 1000).toFixed(0)}K views / 365d` : undefined,
    },
    {
      label: "Instagram",
      href: "/instagram/overview",
      color: "#E1306C",
      primary: ig ? `${(ig.follower_count / 1000).toFixed(1)}K` : "—",
      sub: "followers",
      secondary: ig ? `${ig.reach_30d.toLocaleString()} reach / 30d` : undefined,
    },
    {
      label: "Facebook",
      href: "/facebook/overview",
      color: "#1877F2",
      primary: fb ? fb.fan_count.toLocaleString() : "—",
      sub: "fans",
      secondary: fb ? `${fb.post_engagements_30d.toLocaleString()} engagements / 30d` : undefined,
    },
    {
      label: "TikTok",
      href: "/tiktok/overview",
      color: "#FF0050",
      primary: tt ? `${(tt.follower_count / 1000).toFixed(1)}K` : "—",
      sub: "followers",
      secondary: tt ? `${tt.video_count} videos · ${tt.likes_count.toLocaleString()} likes` : undefined,
    },
  ];

  return (
    <div className="px-6 py-10">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        {synced && (
          <span className="font-mono text-xs text-ink/40">
            synced {synced}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {platforms.map((p) => (
          <Link key={p.label} href={p.href} className="group">
            <div className="transition-transform group-hover:scale-[1.02]">
              <KpiCard
                title={p.label}
                value={p.primary}
                subtitle={p.secondary}
                accentColor={p.color}
              />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        {yt && (
          <div className="rounded-xl border border-ink/10 bg-card p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3">
              YouTube 365d
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0000" }}>
                  {yt.impressions ? `${(yt.impressions / 1000).toFixed(0)}K` : "—"}
                </p>
                <p className="text-xs text-ink/40">impressions</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0000" }}>
                  {yt.impression_ctr != null ? `${Number(yt.impression_ctr).toFixed(2)}%` : "—"}
                </p>
                <p className="text-xs text-ink/40">CTR</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0000" }}>
                  {yt.rpm != null ? `€${Number(yt.rpm).toFixed(2)}` : "—"}
                </p>
                <p className="text-xs text-ink/40">RPM</p>
              </div>
            </div>
          </div>
        )}
        {tt && (
          <div className="rounded-xl border border-ink/10 bg-card p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-ink/40 mb-3">
              TikTok account
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0050" }}>
                  {tt.video_count}
                </p>
                <p className="text-xs text-ink/40">videos</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0050" }}>
                  {(tt.likes_count / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-ink/40">total likes</p>
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#FF0050" }}>
                  {tt.follower_count > 0
                    ? (tt.likes_count / tt.follower_count).toFixed(1) + "×"
                    : "—"}
                </p>
                <p className="text-xs text-ink/40">FYP penetration</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
