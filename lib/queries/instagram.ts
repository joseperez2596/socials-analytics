import { query } from "@/lib/db";

export interface IgSnapshot {
  synced_date: string;
  follower_count: number;
  username: string;
  reach_30d: number;
  profile_views_30d: number;
}

export interface IgDaily {
  date: string;
  reach: number;
}

export interface IgMedia {
  media_id: string;
  media_type: string;
  post_date: string;
  like_count: number;
  comments_count: number;
  caption: string;
  permalink: string;
  thumbnail_url: string | null;
  synced_at: string;
}

export async function getIgSnapshot(): Promise<IgSnapshot | null> {
  const rows = await query<IgSnapshot>(
    "SELECT * FROM ig_snapshots ORDER BY synced_date DESC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function getIgDaily(days = 30): Promise<IgDaily[]> {
  return query<IgDaily>(
    "SELECT * FROM ig_daily ORDER BY date DESC LIMIT $1",
    [days]
  );
}

export async function getIgMedia(limit = 12): Promise<IgMedia[]> {
  return query<IgMedia>(
    "SELECT * FROM ig_media ORDER BY post_date DESC LIMIT $1",
    [limit]
  );
}
