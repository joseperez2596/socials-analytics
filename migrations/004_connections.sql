-- Platform logins for in-app sync (see /connections). Secret columns hold AES-256-GCM ciphertext.
CREATE TABLE IF NOT EXISTS connections (
  platform            TEXT PRIMARY KEY,               -- youtube | meta | tiktok
  client_id           TEXT,
  client_secret       TEXT,                           -- encrypted
  access_token        TEXT,                           -- encrypted
  refresh_token       TEXT,                           -- encrypted
  token_expires_at    TIMESTAMPTZ,
  refresh_expires_at  TIMESTAMPTZ,
  account             JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error          TEXT,
  connected_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id           BIGSERIAL PRIMARY KEY,
  platform     TEXT NOT NULL,
  trigger      TEXT NOT NULL,                         -- manual | schedule | connect
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'running',       -- running | ok | error
  rows         INTEGER,
  error        TEXT
);
CREATE INDEX IF NOT EXISTS sync_runs_platform_started ON sync_runs (platform, started_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);
