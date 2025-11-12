#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tauri::Manager;
#[cfg(target_os = "macos")]
use tauri::{ActivationPolicy, Emitter, LogicalPosition, LogicalSize, Position};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[tauri::command]
fn run_osascript(script: String) -> Result<(), String> {
    let status = std::process::Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(script)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("osascript exit: {:?}", status))
    }
}

#[tauri::command]
fn frontmost_bundle_id() -> Result<String, String> {
    let scpt = r#"
    use framework "AppKit"
    use scripting additions
    set bid to (current application's NSWorkspace's sharedWorkspace()'s frontmostApplication()'s bundleIdentifier()) as text
    return bid
  "#.to_string();
    let output = std::process::Command::new("/usr/bin/osascript")
        .arg("-l")
        .arg("AppleScript")
        .arg("-e")
        .arg(scpt)
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!("osascript failed: {:?}", output.status));
    }
    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok(s)
}

#[tauri::command]
fn run_shell(cmd: String) -> Result<(), String> {
    let status = std::process::Command::new("/bin/zsh")
        .arg("-lc")
        .arg(cmd)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("command exited with status: {status}"))
    }
}

#[cfg(target_os = "macos")]
fn position_window_at_cursor(window: &tauri::WebviewWindow) {
    const HUD_LOGICAL: f64 = 700.0;
    eprintln!("position_window_at_cursor: triggered");

    // Get cursor in desktop top-left physical coords via Tauri (winit/tao), not CoreGraphics.
    let cursor_physical = match window.cursor_position() {
        Ok(p) => p,
        Err(e) => {
            eprintln!("cursor_position error: {e:?}");
            return;
        }
    };
    eprintln!(
        "cursor physical: x={:.2} y={:.2}",
        cursor_physical.x, cursor_physical.y
    );

    // Determine monitor under the cursor and its scale/position.
    let monitor = window
        .monitor_from_point(cursor_physical.x, cursor_physical.y)
        .ok()
        .flatten();
    let (mon_pos, mon_size, mon_scale) = if let Some(m) = monitor.as_ref() {
        (
            *m.position(),
            *m.size(),
            m.scale_factor(),
        )
    } else {
        let scale = window.scale_factor().unwrap_or(1.0);
        (tauri::PhysicalPosition::new(0, 0), tauri::PhysicalSize::new(0, 0), scale)
    };
    eprintln!(
        "monitor pos physical=({}, {}), size=({}, {}), scale={:.2}",
        mon_pos.x, mon_pos.y, mon_size.width, mon_size.height, mon_scale
    );

    // Convert to logical points using the monitor scale to keep all math in CSS px.
    let cursor_logical = cursor_physical.to_logical::<f64>(mon_scale);
    let inner_px = window.inner_size().ok();
    let inner_logical = inner_px
        .map(|s| s.to_logical::<f64>(mon_scale))
        .unwrap_or_else(|| LogicalSize::new(HUD_LOGICAL, HUD_LOGICAL));
    eprintln!(
        "inner_size_px={:?} inner_logical=({:.2},{:.2})",
        inner_px, inner_logical.width, inner_logical.height
    );

    // Ideal top-left in desktop top-left logical coords.
    let ideal_x = cursor_logical.x - inner_logical.width / 2.0;
    let ideal_y = cursor_logical.y - inner_logical.height / 2.0;
    let _ = window.set_position(Position::Logical(LogicalPosition::new(ideal_x, ideal_y)));
    eprintln!(
        "set_position logical x={:.2} y={:.2}",
        ideal_x, ideal_y
    );

    // Defer correction until AppKit has applied the move.
    let window_clone = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(30));
        let w = window_clone.clone();
        let w2 = w.clone();
        let _ = w.run_on_main_thread(move || {
            let scale_now = w2.scale_factor().unwrap_or(mon_scale);
            if let (Ok(pos_physical), Ok(inner_px2)) = (w2.inner_position(), w2.inner_size()) {
                let pos_logical = pos_physical.to_logical::<f64>(scale_now);
                let inner_logical2 = inner_px2.to_logical::<f64>(scale_now);
                let center_x = pos_logical.x + inner_logical2.width / 2.0;
                let center_y = pos_logical.y + inner_logical2.height / 2.0;
                // Cursor in same logical space.
                let cursor_logical2 = cursor_physical.to_logical::<f64>(scale_now);
                let dx = cursor_logical2.x - center_x;
                let dy = cursor_logical2.y - center_y;
                let _ = w2.emit(
                    "hud-offset",
                    serde_json::json!({"dx": dx, "dy": dy}),
                );
                eprintln!(
                    "post-move: inner_pos_logical=({:.2},{:.2}) inner_logical=({:.2},{:.2}) center=({:.2},{:.2}) cursor_logical=({:.2},{:.2}) -> dx={:.2} dy={:.2} scale={:.2}",
                    pos_logical.x, pos_logical.y, inner_logical2.width, inner_logical2.height, center_x, center_y, cursor_logical2.x, cursor_logical2.y, dx, dy, scale_now
                );
            }
        });
    });
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            run_osascript,
            frontmost_bundle_id,
            run_shell
        ])
    .setup(|app| {
      #[cfg(target_os = "macos")]
      app.set_activation_policy(ActivationPolicy::Accessory);
      let window = app.handle().get_webview_window("main").unwrap();
      // Avoid macOS drop shadow on our transparent HUD window
      let _ = window.set_shadow(false);
            let hk = std::env::var("HOTKEY").unwrap_or_else(|_| "Ctrl+Cmd+Space".into());
            let toggle = window.clone();
            app.global_shortcut()
                .on_shortcut(hk.as_str(), move |_, _, _| {
                    if let Ok(visible) = toggle.is_visible() {
                        if visible {
                            let _ = toggle.hide();
                        } else {
                            #[cfg(target_os = "macos")]
                            position_window_at_cursor(&toggle);
                            let _ = toggle.show();
                            let _ = toggle.set_focus();
                        }
                    }
                })?;
            Ok(())
        })
        .on_window_event(|window, event| {
            use tauri::WindowEvent;
            if let WindowEvent::CloseRequested { api, .. } = event {
                window.hide().ok();
                api.prevent_close();
            }
            if let WindowEvent::Focused(false) = event {
                window.hide().ok();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
