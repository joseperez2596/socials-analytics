import { query } from "@/lib/db";

export interface YtSnapshot {
  synced_date: string;
  subscriber_count: number;
  impressions: number;
  impression_ctr: number;
  estimated_revenue: number;
  views_365d: number;
  watch_minutes_365d: number;
  subscribers_gained_365d: number;
  gross_revenue: number;
  rpm: number;
  cpm: number;
}

export interface YtDaily {
  date: string;
  views: number;
  estimated_minutes_watched: number;
  avg_view_duration: number;
  subscribers_gained: number;
}

export interface YtVideo {
  video_id: string;
  title: string;
  views: number;
  watch_minutes: number;
  subscribers_gained: number;
  synced_at: string;
}

export interface YtTrafficSource {
  synced_date: string;
  source: string;
  views: number;
  watch_minutes: number;
  share_pct: number;
}

export interface YtGeography {
  synced_date: string;
  country: string;
  views: number;
  watch_minutes: number;
}

export async function getYtSnapshot(): Promise<YtSnapshot | null> {
  const rows = await query<YtSnapshot>(
    "SELECT * FROM yt_snapshots ORDER BY synced_date DESC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function getYtSnapshots(days = 30): Promise<YtSnapshot[]> {
  return query<YtSnapshot>(
    "SELECT * FROM yt_snapshots ORDER BY synced_date DESC LIMIT $1",
    [days]
  );
}

export async function getYtDaily(days = 30): Promise<YtDaily[]> {
  return query<YtDaily>(
    "SELECT * FROM yt_daily ORDER BY date DESC LIMIT $1",
    [days]
  );
}

export async function getYtVideos(): Promise<YtVideo[]> {
  return query<YtVideo>(
    "SELECT * FROM yt_videos ORDER BY views DESC LIMIT 20"
  );
}

export async function getYtTrafficSources(): Promise<YtTrafficSource[]> {
  return query<YtTrafficSource>(
    `SELECT * FROM yt_traffic_sources
     WHERE synced_date = (SELECT MAX(synced_date) FROM yt_traffic_sources)
     ORDER BY views DESC`
  );
}

