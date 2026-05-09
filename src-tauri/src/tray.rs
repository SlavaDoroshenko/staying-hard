use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconEvent},
    AppHandle, Manager,
};

pub fn setup_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "Открыть", true, None::<&str>)?;
    let test_i = MenuItem::with_id(app, "test_notif", "Тест-уведомление", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_i, &test_i, &quit_i])?;

    if let Some(tray) = app.tray_by_id("main-tray") {
        tray.set_menu(Some(menu))?;
        tray.on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "test_notif" => {
                // WebviewWindowBuilder::build() deadlocks on Windows when
                // called from the tray's sync event handler — spawn a thread.
                let app_for_thread = app.clone();
                std::thread::spawn(move || {
                    if let Err(e) =
                        crate::notification_window::open_test_notification(app_for_thread)
                    {
                        log::error!("test notification failed: {e}");
                    }
                });
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        });
        tray.on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        });
    }

    Ok(())
}
