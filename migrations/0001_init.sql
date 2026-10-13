CREATE TABLE links (
  code          TEXT PRIMARY KEY,
  url           TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  click_count   INTEGER NOT NULL DEFAULT 0,
  last_click_at INTEGER
);

CREATE INDEX idx_links_created_at ON links (created_at DESC);
