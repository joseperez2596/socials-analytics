import { query } from "@/lib/db";

export interface FbSnapshot {
  synced_date: string;
  fan_count: number;
  post_engagements_30d: number;
}

export interface FbDaily {
  date: string;
  post_engagements: number;
}

export interface FbPost {
  post_id: string;
  created_time: string;
  reactions: number;
  comments: number;
  shares: number;
  message: string;
  thumbnail_url: string | null;
  synced_at: string;
}

export async function getFbSnapshot(): Promise<FbSnapshot | null> {
  const rows = await query<FbSnapshot>(
    "SELECT * FROM fb_snapshots ORDER BY synced_date DESC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function getFbDaily(days = 30): Promise<FbDaily[]> {
  return query<FbDaily>(
    "SELECT * FROM fb_daily ORDER BY date DESC LIMIT $1",
    [days]
  );
}

export async function getFbPosts(limit = 10): Promise<FbPost[]> {
  return query<FbPost>(
    "SELECT * FROM fb_posts ORDER BY created_time DESC LIMIT $1",
    [limit]
  );
}
