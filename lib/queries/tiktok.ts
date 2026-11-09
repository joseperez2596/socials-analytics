import { query } from "@/lib/db";

export interface TiktokSnapshot {
  synced_date: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export interface TiktokVideo {
  video_id: string;
  create_date: string;
  title: string;
  duration_s: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  engagement_rate: number;
  virality_score: number;
  share_url: string;
  thumbnail_url: string | null;
  synced_at: string;
}

export async function getTiktokSnapshot(): Promise<TiktokSnapshot | null> {
  const rows = await query<TiktokSnapshot>(
    "SELECT * FROM tiktok_snapshots ORDER BY synced_date DESC LIMIT 1"
  );
  return rows[0] ?? null;
}

export async function getTiktokVideos(limit = 20): Promise<TiktokVideo[]> {
  return query<TiktokVideo>(
    "SELECT * FROM tiktok_videos ORDER BY view_count DESC LIMIT $1",
    [limit]
  );
}
