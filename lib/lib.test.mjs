// Run: npm test   (Node 22+, strips TS types from the import)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "./csv-parser.ts";

test("parses headers, quoted commas, escaped quotes and CRLF", () => {
  const { headers, rows } = parseCsv('title,views\r\n"Hello, world",10\r\n"She said ""hi""",5\r\n');
  assert.deepEqual(headers, ["title", "views"]);
  assert.deepEqual(rows, [
    { title: "Hello, world", views: "10" },
    { title: 'She said "hi"', views: "5" },
  ]);
});

test("empty input and blank rows", () => {
  assert.deepEqual(parseCsv(""), { headers: [], rows: [] });
  assert.equal(parseCsv("a,b\n\n1,2\n,\n").rows.length, 1);
  assert.deepEqual(parseCsv("a,b\n1").rows, [{ a: "1", b: "" }]);
});

import { classifyByKeywords, suggestKeywords } from "./pillars/classify.ts";

test("classify: first matching pillar wins, case-insensitive, else Other", () => {
  const map = { Pilates: ["pilates"], Routines: ["rutina"] };
  assert.equal(classifyByKeywords("Rutina de PILATES en casa", map), "Pilates");
  assert.equal(classifyByKeywords("Mi rutina de noche", map), "Routines");
  assert.equal(classifyByKeywords("Esta es mi nueva obsesión", map), "Other");
});

test("suggest: skips filler words, counts once per post, keeps accents", () => {
  const s = suggestKeywords(["Ejercicios de glúteo sin equipo", "EJERCICIOS para glúteo glúteo", "the day 2026"]);
  assert.deepEqual(s.slice(0, 2), [["ejercicios", 2], ["glúteo", 2]]);
  const all = s.map(([w]) => w);
  for (const w of ["de", "sin", "para", "the", "2026"]) assert.ok(!all.includes(w), w);
});

import crypto from "node:crypto";
import { encrypt, decrypt } from "./connections/crypto.ts";
import { isDue } from "./connections/schedule.ts";
import { youtubeWrites, metaWrites, tiktokWrites } from "./sync/transform.ts";

test("crypto: round-trips, uses a fresh IV, rejects tampering and wrong keys", () => {
  const k = crypto.randomBytes(32);
  const a = encrypt("secret-token", k), b = encrypt("secret-token", k);
  assert.notEqual(a, b);
  assert.equal(decrypt(a, k), "secret-token");
  const raw = Buffer.from(a.slice(3), "base64"); raw[raw.length - 1] ^= 1;
  assert.throws(() => decrypt("v1:" + raw.toString("base64"), k));
  assert.throws(() => decrypt(a, crypto.randomBytes(32)));
});

test("schedule: daily at 06:00 local, every 6h, manual", () => {
  const tz = "Europe/Lisbon"; // UTC+0 in November
  const at = (s) => new Date(s);
  assert.equal(isDue("daily", tz, null, at("2026-11-09T03:00:00Z")), true);
  assert.equal(isDue("daily", tz, at("2026-11-08T06:01:00Z"), at("2026-11-09T05:59:00Z")), false);
  assert.equal(isDue("daily", tz, at("2026-11-08T06:01:00Z"), at("2026-11-09T06:00:00Z")), true);
  assert.equal(isDue("daily", tz, at("2026-11-09T06:00:30Z"), at("2026-11-09T18:00:00Z")), false);
  assert.equal(isDue("daily", tz, at("2026-11-09T05:00:00Z"), at("2026-11-09T07:00:00Z")), true);
  assert.equal(isDue("6h", tz, at("2026-11-09T00:00:00Z"), at("2026-11-09T05:59:00Z")), false);
  assert.equal(isDue("6h", tz, at("2026-11-09T00:00:00Z"), at("2026-11-09T06:00:00Z")), true);
  assert.equal(isDue("manual", tz, null, at("2026-11-09T07:00:00Z")), false);
});

const byTable = (ws) => Object.fromEntries(ws.map((w) => [w.table, w.rows]));

test("transform: YouTube reports become table rows", () => {
  const r = (headers, rows) => ({ columnHeaders: headers.map((name) => ({ name })), rows });
  const t = byTable(youtubeWrites({
    channel: { items: [{ statistics: { subscriberCount: "2371" } }] },
    daily: r(["day", "views", "estimatedMinutesWatched", "averageViewDuration", "subscribersGained"], [["2026-11-08", 100, 300, 61.6, 2], ["2026-11-09", 50, 150, 40, 1]]),
    top: r(["video", "views", "estimatedMinutesWatched", "subscribersGained"], [["a", 10, 20, 1], ["b", 90, 80, 3]]),
    titles: { items: [{ id: "b", snippet: { title: "Rutina de\npilates" } }] },
    traffic: r(["insightTrafficSourceType", "views", "estimatedMinutesWatched"], [["YT_SEARCH", 75, 1], ["SUGGESTED", 25, 1]]),
    geo: r(["country", "views", "estimatedMinutesWatched"], [["DO", 5, 9]]),
  }, "2026-11-09"));
  assert.deepEqual(t.yt_snapshots[0], { synced_date: "2026-11-09", subscriber_count: 2371, views_365d: 150, watch_minutes_365d: 450, subscribers_gained_365d: 3 });
  assert.equal(t.yt_daily[0].avg_view_duration, 62);
  assert.deepEqual(t.yt_videos.map((v) => [v.video_id, v.title]), [["b", "Rutina de pilates"], ["a", "(no title)"]]);
  assert.deepEqual(t.yt_traffic_sources.map((s) => s.share_pct), [75, 25]);
});

test("transform: Meta keeps IG media inside the window and skips IG when unlinked", () => {
  const base = { page: { fan_count: 3400 }, posts: { data: [{ id: "p1", created_time: "2026-11-01T10:00:00+0000", reactions: { summary: { total_count: 7 } }, message: "Hola" }] },
    insights: { data: [{ name: "page_post_engagements", values: [{ end_time: "2026-11-08T08:00:00+0000", value: 40 }] }] } };
  const noIg = byTable(metaWrites(base, "2026-11-09", "2026-10-10"));
  assert.equal(noIg.ig_media, undefined);
  assert.equal(noIg.fb_snapshots[0].post_engagements_30d, 40);
  assert.equal(noIg.fb_posts[0].reactions, 7);
  const t = byTable(metaWrites({ ...base, ig: { followers_count: 8600, username: "demo" },
    igMedia: { data: [{ id: "m1", timestamp: "2026-11-05T00:00:00+0000" }, { id: "old", timestamp: "2026-09-01T00:00:00+0000" }] } }, "2026-11-09", "2026-10-10"));
  assert.deepEqual(t.ig_media.map((m) => m.media_id), ["m1"]);
  assert.equal(t.ig_snapshots[0].follower_count, 8600);
});

test("transform: TikTok dedupes, filters by window and computes rates", () => {
  const start = Date.parse("2026-10-10T00:00:00Z") / 1000;
  const v = (id, day, views, likes, shares) => ({ id, create_time: Date.parse(day) / 1000, view_count: views, like_count: likes, comment_count: 0, share_count: shares });
  const t = byTable(tiktokWrites({ user: { follower_count: 13350 }, videos: [v("1", "2026-11-01", 1000, 90, 10), v("1", "2026-11-01", 1000, 90, 10), v("2", "2026-09-01", 5, 0, 0)] }, "2026-11-09", start));
  assert.equal(t.tiktok_videos.length, 1);
  assert.equal(t.tiktok_videos[0].engagement_rate, 10);
  assert.equal(t.tiktok_videos[0].virality_score, 1);
  assert.equal(t.tiktok_snapshots[0].follower_count, 13350);
});
