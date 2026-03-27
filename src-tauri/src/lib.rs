use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingResult {
    pub output_path: String,
    pub duration_ms: u64,
    pub size_bytes: u64,
}

// ─── Commands ────────────────────────────────────────────────────────────────

/// Lê metadados reais de um arquivo de vídeo usando ffprobe.
#[tauri::command]
fn get_video_metadata(file_path: String) -> Result<VideoMetadata, String> {
    let ffprobe_available = Command::new("which")
        .arg("ffprobe")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !ffprobe_available {
        return Err("ffprobe not found. Install: brew install ffmpeg".to_string());
    }

    let size_bytes = std::fs::metadata(&file_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let file_name = Path::new(&file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

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

    let streams = json["streams"].as_array().ok_or("No streams found")?;
    let video_stream = streams.iter()
        .find(|s| s["codec_type"].as_str() == Some("video"))
        .ok_or("No video stream found")?;

    let width  = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    let codec  = video_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
    let fps    = parse_fps(video_stream["r_frame_rate"].as_str().unwrap_or("30/1"));

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

/// Extrai o áudio do vídeo como WAV mono 16kHz.
/// Formato otimizado para Whisper.
/// output_dir: pasta onde salvar o .wav (ex: ~/Library/Application Support/FlowCut/projects/<id>)
#[tauri::command]
fn extract_audio(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    // Garante que o diretório de saída existe
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    let stem = Path::new(&video_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("audio");

    let output_path = format!("{}/{}.wav", output_dir, stem);

    // ffmpeg extrai áudio: mono, 16kHz, PCM 16bit — formato ideal para Whisper
    let result = Command::new("ffmpeg")
        .args([
            "-y",                    // sobrescreve sem perguntar
            "-i", &video_path,       // input
            "-vn",                   // sem vídeo
            "-acodec", "pcm_s16le",  // PCM 16-bit little-endian
            "-ar", "16000",          // 16kHz (Whisper otimizado)
            "-ac", "1",              // mono
            &output_path,
        ])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !result.status.success() {
        return Err(format!(
            "ffmpeg extract_audio error: {}",
            String::from_utf8_lossy(&result.stderr)
        ));
    }

    let size_bytes = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    // Lê duração do WAV gerado
    let duration_ms = get_audio_duration_ms(&output_path).unwrap_or(0);

    Ok(ProcessingResult {
        output_path,
        duration_ms,
        size_bytes,
    })
}

/// Gera proxy de baixa resolução (480p) para preview rápido no editor.
/// Usa videotoolbox no Mac para aceleração por hardware quando disponível.
#[tauri::command]
fn generate_proxy(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    let stem = Path::new(&video_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("proxy");

    let output_path = format!("{}/{}_proxy.mp4", output_dir, stem);

    // Tenta com videotoolbox (aceleração Apple Silicon) primeiro
    // Se falhar, usa software encoding
    let result = run_proxy_ffmpeg(&video_path, &output_path, true);

    let result = if result.is_err() {
        run_proxy_ffmpeg(&video_path, &output_path, false)
    } else {
        result
    };

    result.map_err(|e| format!("generate_proxy failed: {}", e))?;

    let size_bytes = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    let duration_ms = get_video_duration_ms(&output_path).unwrap_or(0);

    Ok(ProcessingResult {
        output_path,
        duration_ms,
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
        "ffmpeg":       has_ffmpeg,
        "ffprobe":      has_ffprobe,
        "ready":        has_ffmpeg && has_ffprobe,
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

fn run_proxy_ffmpeg(input: &str, output: &str, use_hw: bool) -> Result<(), String> {
    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(), input.to_string(),
    ];

    if use_hw {
        // Videotoolbox: encoder H.264 acelerado por hardware no Mac
        args.extend([
            "-vf".to_string(), "scale=-2:480".to_string(),
            "-c:v".to_string(), "h264_videotoolbox".to_string(),
            "-b:v".to_string(), "1500k".to_string(),
            "-c:a".to_string(), "aac".to_string(),
            "-b:a".to_string(), "128k".to_string(),
        ]);
    } else {
        // Software fallback
        args.extend([
            "-vf".to_string(), "scale=-2:480".to_string(),
            "-c:v".to_string(), "libx264".to_string(),
            "-preset".to_string(), "fast".to_string(),
            "-crf".to_string(), "23".to_string(),
            "-c:a".to_string(), "aac".to_string(),
            "-b:a".to_string(), "128k".to_string(),
        ]);
    }

    args.push(output.to_string());

    let result = Command::new("ffmpeg")
        .args(&args)
        .output()
        .map_err(|e| format!("ffmpeg spawn error: {}", e))?;

    if !result.status.success() {
        return Err(String::from_utf8_lossy(&result.stderr).to_string());
    }

    Ok(())
}

fn get_audio_duration_ms(path: &str) -> Option<u64> {
    let output = Command::new("ffprobe")
        .args(["-v", "quiet", "-print_format", "json", "-show_format", path])
        .output().ok()?;
    let json: serde_json::Value = serde_json::from_str(
        &String::from_utf8_lossy(&output.stdout)
    ).ok()?;
    let secs = json["format"]["duration"].as_str()?.parse::<f64>().ok()?;
    Some((secs * 1000.0) as u64)
}

fn get_video_duration_ms(path: &str) -> Option<u64> {
    get_audio_duration_ms(path) // mesma lógica
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
            extract_audio,
            generate_proxy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowCut");
}
