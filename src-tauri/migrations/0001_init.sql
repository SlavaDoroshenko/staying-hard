CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT PRIMARY KEY,
  category            TEXT NOT NULL CHECK(category IN ('food','water','hygiene','cleaning')),
  title               TEXT NOT NULL,
  schedule_json       TEXT NOT NULL,
  notification_level  TEXT NOT NULL CHECK(notification_level IN ('soft','hard')),
  active              INTEGER NOT NULL DEFAULT 1,
  next_fire_at        INTEGER,
  last_fire_at        INTEGER,
  estimate_minutes    INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_active_next ON tasks(active, next_fire_at);

CREATE TABLE IF NOT EXISTS task_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id      TEXT NOT NULL,
  scheduled_at INTEGER NOT NULL,
  completed_at INTEGER,
  status       TEXT NOT NULL CHECK(status IN ('pending','completed','skipped','missed')),
  quick_action TEXT,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logs_task_time ON task_logs(task_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_logs_status ON task_logs(status, scheduled_at);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
