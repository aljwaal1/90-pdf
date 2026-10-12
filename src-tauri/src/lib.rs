// Reuse upstream command handlers and Tauri app setup without duplicating the
// 90+ PDF tools. Tauri's Android build requires a library entry point.
include!("main.rs");

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    main();
}
