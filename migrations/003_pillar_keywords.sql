-- Content-category ("pillar") keywords edited on /pillars.
-- platform 'default' = All platforms; a platform with its own rows overrides it.
-- Empty table = fall back to config/pillars.json (or the example file).
CREATE TABLE IF NOT EXISTS pillar_keywords (
  platform  TEXT NOT NULL,
  pillar    TEXT NOT NULL,
  position  INTEGER NOT NULL,
  keywords  TEXT[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (platform, pillar)
);
