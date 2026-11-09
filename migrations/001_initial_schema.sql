-- TikTok
CREATE TABLE IF NOT EXISTS tiktok_snapshots (
  synced_date      DATE PRIMARY KEY,
  follower_count   INTEGER NOT NULL DEFAULT 0,
  following_count  INTEGER NOT NULL DEFAULT 0,
  likes_count      INTEGER NOT NULL DEFAULT 0,
  video_count      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tiktok_videos (
  video_id         TEXT PRIMARY KEY,
  create_date      DATE,
  title            TEXT,
  duration_s       INTEGER NOT NULL DEFAULT 0,
  view_count       BIGINT NOT NULL DEFAULT 0,
  like_count       INTEGER NOT NULL DEFAULT 0,
  comment_count    INTEGER NOT NULL DEFAULT 0,
  share_count      INTEGER NOT NULL DEFAULT 0,
  engagement_rate  NUMERIC(6,2) NOT NULL DEFAULT 0,
  virality_score   NUMERIC(8,4) NOT NULL DEFAULT 0,
  share_url        TEXT,
  synced_at        DATE
);

-- Facebook
CREATE TABLE IF NOT EXISTS fb_snapshots (
  synced_date           DATE PRIMARY KEY,
  fan_count             INTEGER NOT NULL DEFAULT 0,
  post_engagements_30d  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fb_daily (
  date                DATE PRIMARY KEY,
  post_engagements    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fb_posts (
  post_id       TEXT PRIMARY KEY,
  created_time  DATE,
  reactions     INTEGER NOT NULL DEFAULT 0,
  comments      INTEGER NOT NULL DEFAULT 0,
  shares        INTEGER NOT NULL DEFAULT 0,
  message       TEXT,
  synced_at     DATE
);

-- Instagram
CREATE TABLE IF NOT EXISTS ig_snapshots (
  synced_date        DATE PRIMARY KEY,
  follower_count     INTEGER NOT NULL DEFAULT 0,
  username           TEXT,
  reach_30d          BIGINT NOT NULL DEFAULT 0,
  profile_views_30d  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ig_daily (
  date   DATE PRIMARY KEY,
  reach  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ig_media (
  media_id        TEXT PRIMARY KEY,
  media_type      TEXT,
  post_date       DATE,
  like_count      INTEGER NOT NULL DEFAULT 0,
  comments_count  INTEGER NOT NULL DEFAULT 0,
  caption         TEXT,
  permalink       TEXT,
  synced_at       DATE
);

-- YouTube
CREATE TABLE IF NOT EXISTS yt_snapshots (
  synced_date              DATE PRIMARY KEY,
  subscriber_count         INTEGER NOT NULL DEFAULT 0,
  impressions              BIGINT,
  impression_ctr           NUMERIC(6,4),
  estimated_revenue        NUMERIC(10,2),
  views_365d               BIGINT NOT NULL DEFAULT 0,
  watch_minutes_365d       BIGINT NOT NULL DEFAULT 0,
  subscribers_gained_365d  INTEGER NOT NULL DEFAULT 0,
  gross_revenue            NUMERIC(10,2),
  rpm                      NUMERIC(8,4),
  cpm                      NUMERIC(8,4)
);

CREATE TABLE IF NOT EXISTS yt_daily (
  date                       DATE PRIMARY KEY,
  views                      BIGINT NOT NULL DEFAULT 0,
  estimated_minutes_watched  BIGINT NOT NULL DEFAULT 0,
  avg_view_duration          INTEGER NOT NULL DEFAULT 0,
  subscribers_gained         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS yt_videos (
  video_id             TEXT PRIMARY KEY,
  title                TEXT,
  views                BIGINT NOT NULL DEFAULT 0,
  watch_minutes        BIGINT NOT NULL DEFAULT 0,
  subscribers_gained   INTEGER NOT NULL DEFAULT 0,
  synced_at            DATE
);

CREATE TABLE IF NOT EXISTS yt_traffic_sources (
  synced_date    DATE NOT NULL,
  source         TEXT NOT NULL,
  views          BIGINT NOT NULL DEFAULT 0,
  watch_minutes  BIGINT NOT NULL DEFAULT 0,
  share_pct      NUMERIC(6,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (synced_date, source)
);

CREATE TABLE IF NOT EXISTS yt_geography (
  synced_date    DATE NOT NULL,
  country        TEXT NOT NULL,
  views          BIGINT NOT NULL DEFAULT 0,
  watch_minutes  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (synced_date, country)
);
