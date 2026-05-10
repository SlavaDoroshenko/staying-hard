// DB connection helpers + safety nets:
//
// 1. `backup_db_before_migration` — runs on app boot before tauri-plugin-sql
//    has a chance to apply migrations. Copies data.db to a timestamped
//    backup so a botched migration is recoverable.
// 2. `reset_database` — Tauri command that deletes the local DB and restarts
//    the app. Used by the Settings UI as the recovery exit when sqlx
//    checksum-mismatch breaks all SQL operations.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager};

const DB_FILE: &str = "data.db";
const BACKUP_PREFIX: &str = "data.db.backup-";
const KEEP_BACKUPS: usize = 3;

pub fn data_dir(app: &AppHandle) -> tauri::Result<PathBuf> {
    let dir = app.path().app_data_dir()?;
    if !dir.exists() {
        std::fs::create_dir_all(&dir).ok();
    }
    Ok(dir)
}

/// Copy `data.db` to `data.db.backup-{YYYYMMDD-HHMMSS}` if it exists.
/// Idempotent and safe to call on first run (no-op when the file is absent).
/// Keeps the most recent `KEEP_BACKUPS` backups; older ones are deleted.
pub fn backup_db_before_migration(app: &AppHandle) -> tauri::Result<()> {
    let dir = data_dir(app)?;
    let db_path = dir.join(DB_FILE);
    if !db_path.exists() {
        return Ok(());
    }

    let stamp = chrono::Local::now().format("%Y%m%d-%H%M%S");
    let backup = dir.join(format!("{BACKUP_PREFIX}{stamp}"));
    if let Err(e) = std::fs::copy(&db_path, &backup) {
        log::warn!("[db] failed to back up before migration: {e}");
        return Ok(()); // never block startup on backup failure
    }
    log::info!("[db] backup written: {}", backup.display());

    if let Err(e) = prune_old_backups(&dir) {
        log::warn!("[db] failed to prune old backups: {e}");
    }
    Ok(())
}

fn prune_old_backups(dir: &Path) -> std::io::Result<()> {
    let mut backups: Vec<PathBuf> = std::fs::read_dir(dir)?
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .and_then(|n| n.to_str())
                .map(|n| n.starts_with(BACKUP_PREFIX))
                .unwrap_or(false)
        })
        .collect();

    // Names contain a sortable timestamp suffix — lexical sort = chronological.
    backups.sort();
    while backups.len() > KEEP_BACKUPS {
        let victim = backups.remove(0);
        if let Err(e) = std::fs::remove_file(&victim) {
            log::warn!("[db] couldn't prune {}: {}", victim.display(), e);
        }
    }
    Ok(())
}

/// Delete the local database files and restart the app. Recovery exit when
/// sqlx checksum-mismatch (or any other DB corruption) makes normal SQL
/// operations impossible. Operates on file system directly so it doesn't need
/// a working `Database` connection.
#[tauri::command]
pub async fn reset_database(app: AppHandle) -> Result<(), String> {
    let dir = data_dir(&app).map_err(|e| e.to_string())?;
    for name in [DB_FILE, "data.db-shm", "data.db-wal"] {
        let p = dir.join(name);
        if p.exists() {
            if let Err(e) = std::fs::remove_file(&p) {
                log::warn!("[db] reset: couldn't remove {}: {}", p.display(), e);
            }
        }
    }
    log::info!("[db] reset complete — restarting");
    app.restart();
}

/// Generic restart used after `update.downloadAndInstall()` finishes.
#[tauri::command]
pub async fn restart_app(app: AppHandle) {
    app.restart();
}
