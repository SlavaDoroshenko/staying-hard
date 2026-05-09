use std::sync::{Arc, LazyLock};
use std::time::Duration;

use tauri::{AppHandle, Emitter};
use tokio::sync::Notify;
use tokio::time;

const TICK_INTERVAL_SECS: u64 = 30;

/// Notify handle so we can wake the scheduler immediately (e.g. after sleep/wake
/// or after a task is edited from the UI).
static WAKE: LazyLock<Arc<Notify>> = LazyLock::new(|| Arc::new(Notify::new()));

pub fn start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        loop {
            // Emit a "tick" event — the renderer will read tasks from SQL and
            // decide which (if any) to fire. Keeping the heavy logic in JS
            // (where the schema and types already live) avoids duplicating SQL
            // in Rust. The tick guarantees we wake regularly even when the
            // main window is hidden / throttled.
            let _ = app.emit("scheduler/tick", chrono::Utc::now().timestamp_millis());

            // Wait for either the tick interval OR an explicit wake signal.
            let sleep = time::sleep(Duration::from_secs(TICK_INTERVAL_SECS));
            tokio::select! {
                _ = sleep => {},
                _ = WAKE.notified() => {},
            }
        }
    });

    #[cfg(target_os = "macos")]
    install_macos_wake_observer();
}

#[tauri::command]
pub fn trigger_recompute() {
    WAKE.notify_one();
}

#[cfg(target_os = "macos")]
fn install_macos_wake_observer() {
    use cocoa::base::{id, nil};
    use cocoa::foundation::NSString;
    use objc::declare::ClassDecl;
    use objc::runtime::{Class, Object, Sel};
    use objc::{class, msg_send, sel, sel_impl};

    extern "C" fn on_wake(_this: &Object, _cmd: Sel, _notification: id) {
        WAKE.notify_one();
    }

    unsafe {
        let superclass = class!(NSObject);
        let mut decl = ClassDecl::new("StayingHardWakeObserver", superclass)
            .expect("declare wake observer");
        decl.add_method(
            sel!(onWake:),
            on_wake as extern "C" fn(&Object, Sel, id),
        );
        let cls = decl.register();

        let observer: id = msg_send![cls, new];
        let workspace: id = msg_send![class!(NSWorkspace), sharedWorkspace];
        let center: id = msg_send![workspace, notificationCenter];
        let name = NSString::alloc(nil).init_str("NSWorkspaceDidWakeNotification");
        let _: () = msg_send![
            center,
            addObserver: observer
            selector: sel!(onWake:)
            name: name
            object: nil
        ];
    }
}
