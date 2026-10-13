#![cfg_attr(all(target_os = "windows", not(debug_assertions)), windows_subsystem = "windows")]

// Reuse upstream command handlers and Tauri app setup without duplicating the
// 90+ PDF tools. Tauri's Android build requires a library entry point.
include!("main.rs");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    main();
}
