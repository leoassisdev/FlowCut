use serde::{Deserialize, Serialize};
use std::process::Command;

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub file_path: String,
    pub file_name: String,
    pub duration_ms: u64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub size_bytes: u64,
}

// ─── Commands ────────────────────────────────────────────────────────────────

/// Lê metadados reais de um arquivo de vídeo usando ffprobe.
#[tauri::command]
fn get_video_metadata(file_path: String) -> Result<VideoMetadata, String> {
    // Verifica se ffprobe está disponível
    let ffprobe_available = Command::new("which")
        .arg("ffprobe")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !ffprobe_available {
        return Err("ffprobe not found. Install ffmpeg: brew install ffmpeg".to_string());
    }

    // Tamanho do arquivo
    let size_bytes = std::fs::metadata(&file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Nome do arquivo
    let file_name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // ffprobe — extrai streams e format em JSON
    let output = Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            &file_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "ffprobe error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let json: serde_json::Value = serde_json::from_str(
        &String::from_utf8_lossy(&output.stdout)
    ).map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    // Stream de vídeo
    let streams = json["streams"].as_array()
        .ok_or("No streams found")?;

    let video_stream = streams.iter()
        .find(|s| s["codec_type"].as_str() == Some("video"))
        .ok_or("No video stream found")?;

    let width  = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    let codec  = video_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
    let fps    = parse_fps(video_stream["r_frame_rate"].as_str().unwrap_or("30/1"));

    // Duração: tenta no stream, depois no format
    let duration_secs = video_stream["duration"]
        .as_str()
        .or_else(|| json["format"]["duration"].as_str())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    Ok(VideoMetadata {
        file_path,
        file_name,
        duration_ms: (duration_secs * 1000.0) as u64,
        width,
        height,
        fps,
        codec,
        size_bytes,
    })
}

/// Verifica se ffmpeg/ffprobe estão instalados.
#[tauri::command]
fn check_ffmpeg() -> serde_json::Value {
    let has_ffprobe = Command::new("which").arg("ffprobe").output()
        .map(|o| o.status.success()).unwrap_or(false);
    let has_ffmpeg = Command::new("which").arg("ffmpeg").output()
        .map(|o| o.status.success()).unwrap_or(false);

    serde_json::json!({
        "ffmpeg":  has_ffmpeg,
        "ffprobe": has_ffprobe,
        "ready":   has_ffmpeg && has_ffprobe,
        "install_hint": "brew install ffmpeg"
    })
}

/// Info básica do sistema.
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch":     std::env::consts::ARCH,
        "version":  env!("CARGO_PKG_VERSION"),
    })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn parse_fps(fps_str: &str) -> f64 {
    let parts: Vec<&str> = fps_str.split('/').collect();
    if parts.len() == 2 {
        let num = parts[0].parse::<f64>().unwrap_or(30.0);
        let den = parts[1].parse::<f64>().unwrap_or(1.0);
        if den > 0.0 { (num / den * 100.0).round() / 100.0 } else { 30.0 }
    } else {
        fps_str.parse::<f64>().unwrap_or(30.0)
    }
}

// ─── App Entry ───────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            get_video_metadata,
            check_ffmpeg,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowCut");
}
