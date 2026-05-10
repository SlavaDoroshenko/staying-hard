use std::sync::Mutex;
use std::sync::OnceLock;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Tracks which notification windows have been internally resolved
/// (Done/Skip clicked). Until resolved, hard windows ignore CloseRequested.
static RESOLVED: OnceLock<Mutex<std::collections::HashSet<String>>> = OnceLock::new();

fn resolved_set() -> &'static Mutex<std::collections::HashSet<String>> {
    RESOLVED.get_or_init(|| Mutex::new(std::collections::HashSet::new()))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPayload {
    pub task_id: String,
    pub title: String,
    pub category: String,
    pub level: String,
    pub scheduled_at: i64,
    pub estimate_minutes: Option<i64>,
}

/// Internal sync builder. **Must NOT be called from the Tauri main thread**:
/// WebviewWindowBuilder::build() deadlocks WebView2 on Windows when called
/// from the main thread (sync command / event handler). Always reach this via
/// the async command or `std::thread::spawn`.
fn build_notification_window(
    app: &AppHandle,
    payload: &NotificationPayload,
) -> Result<(), String> {
    let label = format!("notif-{}-{}", payload.task_id, payload.scheduled_at);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let url = format!(
        "index.html?window=notification&task_id={}&scheduled_at={}&level={}&category={}&title={}",
        urlencode(&payload.task_id),
        payload.scheduled_at,
        urlencode(&payload.level),
        urlencode(&payload.category),
        urlencode(&payload.title),
    );

    let is_hard = payload.level == "hard";

    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
        .title(&payload.title)
        .inner_size(560.0, 360.0)
        .resizable(false)
        .always_on_top(true)
        .decorations(false)
        .shadow(false)
        .center()
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?;

    if is_hard {
        let label_owned = label.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let resolved = resolved_set().lock().unwrap().contains(&label_owned);
                if !resolved {
                    api.prevent_close();
                }
            }
        });
    }
    // Soft: X-close is allowed via the in-app × button (rendered in
    // NotificationShell.tsx). Pending log → "missed" via engine sweep.

    Ok(())
}

#[tauri::command]
pub async fn open_notification_window(
    app: AppHandle,
    payload: NotificationPayload,
) -> Result<(), String> {
    build_notification_window(&app, &payload)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmergencyPayload {
    pub category: String,    // "food" | "hygiene" | "cleaning"
    pub days_without: i64,
    pub message: String,
}

fn build_emergency_window(
    app: &AppHandle,
    payload: &EmergencyPayload,
) -> Result<(), String> {
    let label = format!("emergency-{}", payload.category);
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let url = format!(
        "index.html?window=emergency&category={}&days={}&message={}",
        urlencode(&payload.category),
        payload.days_without,
        urlencode(&payload.message),
    );

    // No CloseRequested handler — the 5s delay is enforced by React. Letting
    // close happen freely avoids RESOLVED-set leaks across emergency cycles.
    WebviewWindowBuilder::new(app, &label, WebviewUrl::App(url.into()))
        .title("аварийный режим")
        .inner_size(720.0, 480.0)
        .resizable(false)
        .always_on_top(true)
        .decorations(false)
        .shadow(false)
        .center()
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_emergency_window(
    app: AppHandle,
    payload: EmergencyPayload,
) -> Result<(), String> {
    build_emergency_window(&app, &payload)
}

#[tauri::command]
pub async fn open_review_window(
    app: AppHandle,
    data_json: String,
) -> Result<(), String> {
    let label = "review-window".to_string();
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }
    let url = format!(
        "index.html?window=review&data={}",
        urlencode(&data_json),
    );
    WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
        .title("воскресный обзор")
        .inner_size(640.0, 520.0)
        .resizable(false)
        .always_on_top(true)
        .decorations(false)
        .shadow(false)
        .center()
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_notification_window(
    app: AppHandle,
    label: String,
) -> Result<(), String> {
    // Async: window operations on Windows must not run on the main thread,
    // see the same deadlock pattern as open_notification_window.
    if let Some(w) = app.get_webview_window(&label) {
        w.close().map_err(|e| e.to_string())?;
    }
    resolved_set().lock().unwrap().remove(&label);
    Ok(())
}

#[tauri::command]
pub fn mark_notification_resolved(label: String) -> Result<(), String> {
    resolved_set().lock().unwrap().insert(label);
    Ok(())
}

/// Test entry point used by the tray menu. Caller MUST run this from a
/// non-main thread (see `std::thread::spawn` in `tray.rs`).
pub fn open_test_notification(app: AppHandle) -> Result<(), String> {
    build_notification_window(
        &app,
        &NotificationPayload {
            task_id: "__test__".into(),
            title: "Тест".into(),
            category: "food".into(),
            level: "soft".into(),
            scheduled_at: chrono::Utc::now().timestamp_millis(),
            estimate_minutes: None,
        },
    )
}

fn urlencode(s: &str) -> String {
    let mut out = String::new();
    for &byte in s.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char);
            }
            _ => {
                out.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    out
}
