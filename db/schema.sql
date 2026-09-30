-- Compatible with Neon / standard PostgreSQL. Records are scoped by verified owner.
CREATE TABLE IF NOT EXISTS root_records (
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS root_records_owner ON root_records(kind, owner_id, created_at);
CREATE TABLE IF NOT EXISTS root_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL,
  expires_at BIGINT NOT NULL
);
