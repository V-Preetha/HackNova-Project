-- Append-only MedTrace storage (SQLite)

PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS cases (
  log_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  image_hash TEXT NOT NULL,
  image_path TEXT,
  model_version TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence REAL NOT NULL,
  stability_score REAL NOT NULL,
  prediction_variance REAL NOT NULL,
  instability_flag INTEGER NOT NULL,
  adversarial_score REAL NOT NULL,
  tampering_flag INTEGER NOT NULL,
  trust_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  decision_trace_json TEXT NOT NULL,
  introspection_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  log_id TEXT PRIMARY KEY,
  heatmap_path TEXT,
  overlay_path TEXT,
  FOREIGN KEY (log_id) REFERENCES cases (log_id)
);

-- Immutable append-only ledger entries; hash chain across inserts.
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  prev_hash TEXT,
  entry_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
CREATE INDEX IF NOT EXISTS idx_ledger_created_at ON ledger(created_at);

