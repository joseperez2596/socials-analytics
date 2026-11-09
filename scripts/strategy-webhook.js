// Host-side webhook server: POST /generate-strategy/:platform
// Runs after each n8n sync to regenerate AI strategy cards.
// Start: node scripts/strategy-webhook.js
// Requires: analytics-db exposed on localhost:5433

"use strict";

const http = require("http");
const { execSync } = require("child_process");
const { Pool } = require("pg");

const PORT = 3031;
const DB_URL = "postgresql://analytics:analyticspass@localhost:5433/analytics";
const CLAUDE_TIMEOUT_MS = 120_000;

const pool = new Pool({ connectionString: DB_URL });

// ── Platform queries ─────────────────────────────────────────────────────────

async function fetchYouTubeData(client) {
  const [snap, videos, traffic] = await Promise.all([
    client.query("SELECT * FROM yt_snapshots ORDER BY synced_date DESC LIMIT 1"),
    client.query(
      "SELECT title, views, watch_minutes, subscribers_gained FROM yt_videos ORDER BY views DESC LIMIT 10"
    ),
    client.query(
      `SELECT source, views, watch_minutes, share_pct
       FROM yt_traffic_sources
       WHERE synced_date = (SELECT MAX(synced_date) FROM yt_traffic_sources)
       ORDER BY views DESC`
    ),
  ]);
  return {
    snapshot: snap.rows[0] ?? null,
    top_videos: videos.rows,
    traffic_sources: traffic.rows,
  };
}

async function fetchInstagramData(client) {
  const [snap, media] = await Promise.all([
    client.query("SELECT * FROM ig_snapshots ORDER BY synced_date DESC LIMIT 1"),
    client.query(
      "SELECT media_type, post_date, like_count, comments_count, caption FROM ig_media ORDER BY post_date DESC LIMIT 10"
    ),
  ]);
  return {
    snapshot: snap.rows[0] ?? null,
    recent_media: media.rows,
  };
}

async function fetchFacebookData(client) {
  const [snap, posts] = await Promise.all([
    client.query("SELECT * FROM fb_snapshots ORDER BY synced_date DESC LIMIT 1"),
    client.query(
      "SELECT created_time, reactions, comments, shares, message FROM fb_posts ORDER BY created_time DESC LIMIT 10"
    ),
  ]);
  return {
    snapshot: snap.rows[0] ?? null,
    recent_posts: posts.rows,
  };
}

async function fetchTikTokData(client) {
  const [snap, videos] = await Promise.all([
    client.query("SELECT * FROM tiktok_snapshots ORDER BY synced_date DESC LIMIT 1"),
    client.query(
      `SELECT title, create_date, view_count, like_count, comment_count, share_count, engagement_rate
       FROM tiktok_videos ORDER BY view_count DESC LIMIT 10`
    ),
  ]);
  return {
    snapshot: snap.rows[0] ?? null,
    top_videos: videos.rows,
  };
}

const PLATFORM_FETCHERS = {
  youtube: fetchYouTubeData,
  instagram: fetchInstagramData,
  facebook: fetchFacebookData,
  tiktok: fetchTikTokData,
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(platform, data) {
  return `You are a social media strategist for Cynthia, a Portuguese Pilates instructor building her brand online.

Analyse the following ${platform.toUpperCase()} analytics data and generate 4–6 strategy recommendation cards as a JSON array.

ANALYTICS DATA:
${JSON.stringify(data, null, 2)}

Output ONLY a valid JSON array with this exact schema — no markdown, no explanation, no code fences:
[
  {
    "tag": "BIG BET",
    "title": "5–8 word action-oriented title",
    "description": "2–3 sentences grounded in specific numbers from the data above",
    "actions": [
      { "text": "specific action step", "priority": "HIGH" }
    ],
    "isFeatured": false
  }
]

Schema rules:
- tag must be one of: "BIG BET", "GROW", "WATCH", "FIX"
- priority must be one of: "HIGH", "MED", "LOW"
- isFeatured: exactly one card must be true (the single most important recommendation)
- 2–4 actions per card
- Every insight must reference specific numbers, rates, or dates from the data — no generic advice`;
}

// ── Claude invocation ─────────────────────────────────────────────────────────

function runClaude(prompt) {
  const raw = execSync("claude --print --output-format json", {
    input: prompt,
    encoding: "utf8",
    timeout: CLAUDE_TIMEOUT_MS,
  });

  const envelope = JSON.parse(raw);

  if (envelope.is_error) {
    throw new Error(`Claude error: ${envelope.result}`);
  }

  const text = envelope.result.trim();

  // Strip any accidental markdown fences claude might add
  const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  const cards = JSON.parse(jsonText);

  if (!Array.isArray(cards)) {
    throw new Error("Claude did not return a JSON array");
  }

  return cards;
}

// ── DB upsert ─────────────────────────────────────────────────────────────────

async function upsertStrategy(client, platform, cards) {
  await client.query(
    `INSERT INTO strategy_content (platform, cards, generated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (platform) DO UPDATE
       SET cards = EXCLUDED.cards,
           generated_at = EXCLUDED.generated_at`,
    [platform, JSON.stringify(cards)]
  );
}

// ── Request handler ───────────────────────────────────────────────────────────

async function handleGenerate(platform, res) {
  const fetcher = PLATFORM_FETCHERS[platform];
  if (!fetcher) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Unknown platform: ${platform}` }));
    return;
  }

  const client = await pool.connect();
  try {
    console.log(`[${platform}] fetching analytics data...`);
    const data = await fetcher(client);

    console.log(`[${platform}] running claude...`);
    const cards = runClaude(buildPrompt(platform, data));

    console.log(`[${platform}] upserting ${cards.length} cards into strategy_content...`);
    await upsertStrategy(client, platform, cards);

    console.log(`[${platform}] done.`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, platform, cards_count: cards.length }));
  } catch (err) {
    console.error(`[${platform}] error:`, err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  } finally {
    client.release();
  }
}

// ── HTTP server ───────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const match = req.url?.match(/^\/generate-strategy\/([a-z]+)$/);

  if (req.method === "POST" && match) {
    handleGenerate(match[1], res);
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`strategy-webhook listening on http://localhost:${PORT}`);
  console.log(`  POST /generate-strategy/:platform  (youtube|instagram|facebook|tiktok)`);
  console.log(`  GET  /health`);
});
