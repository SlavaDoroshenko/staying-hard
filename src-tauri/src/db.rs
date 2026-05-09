// DB connection and migration helpers live here. Migrations themselves are
// declared via the SQL plugin's `Migration` API in `lib.rs::run`. This module
// is reserved for future helpers (e.g., backup-before-migration logic).

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[allow(dead_code)]
pub fn data_dir(app: &AppHandle) -> tauri::Result<PathBuf> {
    let dir = app.path().app_data_dir()?;
    if !dir.exists() {
        std::fs::create_dir_all(&dir).ok();
    }
    Ok(dir)
}
