-- AI-generated strategy cards, one row per platform (written by scripts/strategy-webhook.js).
-- TIMESTAMP (not TIMESTAMPTZ): lib/db.ts parses it as a string, which the pages slice.
CREATE TABLE IF NOT EXISTS strategy_content (
  platform      TEXT PRIMARY KEY,
  cards         JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
