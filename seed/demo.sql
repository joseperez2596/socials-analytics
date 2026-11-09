-- Demo data for a fictional creator. Dates are relative to today; safe to re-run.
-- Load with: npm run seed  (or: docker compose exec analytics-dashboard node migrate.js seed)

-- Titles/captions shared by all platforms; keywords match config/pillars.example.json
CREATE TEMP TABLE demo_titles AS
SELECT i, (ARRAY[
  'How to start a morning routine that sticks',
  'Behind the scenes of our studio setup',
  'A day in my life as a full-time creator',
  'Q&A: you asked, I answered',
  'Beginner tutorial: lighting on a budget',
  'Week vlog: launching something new',
  'The making of our latest video',
  '5 tips to edit faster',
  'Thank you for 10K, giveaway inside',
  'Step by step guide to batching content'
])[1 + (i % 10)] AS title
FROM generate_series(0, 19) AS i;

-- TikTok
INSERT INTO tiktok_snapshots (synced_date, follower_count, following_count, likes_count, video_count)
SELECT CURRENT_DATE - d, 12000 + (30 - d) * 45, 180, 240000 + (30 - d) * 900, 140 + (30 - d) / 3
FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO tiktok_videos (video_id, create_date, title, duration_s, view_count, like_count, comment_count, share_count, engagement_rate, virality_score, share_url, synced_at)
SELECT 'demo-tt-' || i, CURRENT_DATE - i * 3, title, 20 + (i * 7) % 60,
       3000 + (i * 7919) % 90000, 200 + (i * 613) % 6000, 10 + (i * 37) % 400, 5 + (i * 53) % 900,
       round((4 + (i * 13) % 9)::numeric, 2), round(((i * 17) % 100 / 1000.0)::numeric, 4), NULL, CURRENT_DATE
FROM demo_titles ON CONFLICT DO NOTHING;

-- Facebook
INSERT INTO fb_snapshots (synced_date, fan_count, post_engagements_30d)
SELECT CURRENT_DATE - d, 3400 + (30 - d) * 6, 2100 + (d * 37) % 500
FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO fb_daily (date, post_engagements)
SELECT CURRENT_DATE - d, 40 + (d * 29) % 120 FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO fb_posts (post_id, created_time, reactions, comments, shares, message, synced_at)
SELECT 'demo-fb-' || i, CURRENT_DATE - i * 2, 20 + (i * 97) % 400, 2 + (i * 11) % 60, (i * 7) % 40, title, CURRENT_DATE
FROM demo_titles ON CONFLICT DO NOTHING;

-- Instagram
INSERT INTO ig_snapshots (synced_date, follower_count, username, reach_30d, profile_views_30d)
SELECT CURRENT_DATE - d, 8600 + (30 - d) * 22, 'demo.creator', 54000 + (d * 311) % 9000, 1900 + (d * 41) % 400
FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO ig_daily (date, reach)
SELECT CURRENT_DATE - d, 1200 + (d * 211) % 2400 FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO ig_media (media_id, media_type, post_date, like_count, comments_count, caption, permalink, synced_at)
SELECT 'demo-ig-' || i, (ARRAY['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'])[1 + i % 3], CURRENT_DATE - i * 2,
       150 + (i * 431) % 2500, 5 + (i * 23) % 150, title, NULL, CURRENT_DATE
FROM demo_titles ON CONFLICT DO NOTHING;

-- YouTube
INSERT INTO yt_snapshots (synced_date, subscriber_count, impressions, impression_ctr, estimated_revenue, views_365d, watch_minutes_365d, subscribers_gained_365d, gross_revenue, rpm, cpm)
SELECT CURRENT_DATE - d, 2100 + (30 - d) * 9, 48000 + (d * 997) % 12000, 0.045, NULL,
       310000 + (30 - d) * 1100, 1450000 + (30 - d) * 5200, 1800 + (30 - d) * 9, NULL, NULL, NULL
FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO yt_daily (date, views, estimated_minutes_watched, avg_view_duration, subscribers_gained)
SELECT CURRENT_DATE - d, 700 + (d * 173) % 900, 3200 + (d * 701) % 4000, 180 + (d * 13) % 120, 3 + (d * 7) % 15
FROM generate_series(0, 29) AS d ON CONFLICT DO NOTHING;

INSERT INTO yt_videos (video_id, title, views, watch_minutes, subscribers_gained, synced_at)
SELECT 'demo-yt-' || i, title, 800 + (i * 3571) % 40000, 3000 + (i * 9001) % 150000, 2 + (i * 19) % 300, CURRENT_DATE
FROM demo_titles ON CONFLICT DO NOTHING;

INSERT INTO yt_traffic_sources (synced_date, source, views, watch_minutes, share_pct)
SELECT CURRENT_DATE, s, v, v * 4, round(v * 100.0 / 30000, 2)
FROM (VALUES ('YT_SEARCH', 11000), ('SUGGESTED', 9000), ('BROWSE', 6000), ('EXTERNAL', 2500), ('PLAYLIST', 1500)) AS t(s, v)
ON CONFLICT DO NOTHING;

INSERT INTO yt_geography (synced_date, country, views, watch_minutes)
SELECT CURRENT_DATE, c, v, v * 4
FROM (VALUES ('US', 9000), ('GB', 4200), ('CA', 3100), ('DE', 2400), ('AU', 1900), ('IN', 1500)) AS t(c, v)
ON CONFLICT DO NOTHING;
