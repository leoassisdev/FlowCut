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

/// Representa um corte na timeline semântica.
/// start_ms e end_ms são posições no vídeo ORIGINAL (source).
#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineCutInput {
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub source_video_path: String,
    pub cuts: Vec<TimelineCutInput>,   // apenas cortes do tipo 'keep'
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub quality: String,               // "high" | "medium" | "ultra"
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

/// Extrai o áudio do vídeo como WAV mono 16kHz (otimizado para Whisper).
#[tauri::command]
fn extract_audio(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    let stem = Path::new(&video_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("audio");

    let output_path = format!("{}/{}.wav", output_dir, stem);

    let result = Command::new("ffmpeg")
        .args([
            "-y",
            "-i", &video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
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

    let size_bytes = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
    let duration_ms = get_audio_duration_ms(&output_path).unwrap_or(0);

    Ok(ProcessingResult { output_path, duration_ms, size_bytes })
}

/// Gera proxy de baixa resolução (480p) para preview rápido.
#[tauri::command]
fn generate_proxy(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    let stem = Path::new(&video_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("proxy");

    let output_path = format!("{}/{}_proxy.mp4", output_dir, stem);

    let result = run_proxy_ffmpeg(&video_path, &output_path, true);
    let result = if result.is_err() {
        run_proxy_ffmpeg(&video_path, &output_path, false)
    } else {
        result
    };
    result.map_err(|e| format!("generate_proxy failed: {}", e))?;

    let size_bytes = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
    let duration_ms = get_video_duration_ms(&output_path).unwrap_or(0);

    Ok(ProcessingResult { output_path, duration_ms, size_bytes })
}

/// Exporta o vídeo final aplicando os cortes da SemanticTimeline.
///
/// Estratégia:
/// 1. Para cada corte 'keep', extrai o trecho do vídeo original
/// 2. Cria um arquivo de concatenação (concat list)
/// 3. ffmpeg concatena todos os trechos em um único arquivo final
/// 4. Aplica codec e qualidade conforme o perfil selecionado
#[tauri::command]
fn export_video(request: ExportRequest) -> Result<ProcessingResult, String> {
    if request.cuts.is_empty() {
        return Err("No cuts provided for export".to_string());
    }

    // Garante que o diretório de saída existe
    if let Some(parent) = Path::new(&request.output_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    // Cria diretório temporário para os segmentos
    let tmp_dir = format!("{}_segments", request.output_path);
    std::fs::create_dir_all(&tmp_dir)
        .map_err(|e| format!("Failed to create tmp dir: {}", e))?;

    // Extrai cada segmento 'keep' do vídeo original
    let mut segment_paths: Vec<String> = Vec::new();

    for (i, cut) in request.cuts.iter().enumerate() {
        let seg_path = format!("{}/seg_{:04}.mp4", tmp_dir, i);
        let start_secs = cut.start_ms as f64 / 1000.0;
        let duration_secs = (cut.end_ms - cut.start_ms) as f64 / 1000.0;

        if duration_secs <= 0.0 {
            continue;
        }

        let result = Command::new("ffmpeg")
            .args([
                "-y",
                "-ss", &format!("{:.3}", start_secs),
                "-i", &request.source_video_path,
                "-t", &format!("{:.3}", duration_secs),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "18",
                "-c:a", "aac",
                "-b:a", "192k",
                "-avoid_negative_ts", "make_zero",
                &seg_path,
            ])
            .output()
            .map_err(|e| format!("Failed to extract segment {}: {}", i, e))?;

        if !result.status.success() {
            // Limpa tmp e retorna erro
            let _ = std::fs::remove_dir_all(&tmp_dir);
            return Err(format!(
                "ffmpeg segment {} error: {}",
                i,
                String::from_utf8_lossy(&result.stderr)
            ));
        }

        segment_paths.push(seg_path);
    }

    if segment_paths.is_empty() {
        let _ = std::fs::remove_dir_all(&tmp_dir);
        return Err("No valid segments extracted".to_string());
    }

    // Se só tem um segmento, move direto para o output
    if segment_paths.len() == 1 {
        let (crf, preset) = quality_params(&request.quality);
        let result = Command::new("ffmpeg")
            .args([
                "-y",
                "-i", &segment_paths[0],
                "-c:v", "libx264",
                "-preset", preset,
                "-crf", crf,
                "-c:a", "aac",
                "-b:a", "192k",
                &request.output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to finalize export: {}", e))?;

        let _ = std::fs::remove_dir_all(&tmp_dir);

        if !result.status.success() {
            return Err(format!(
                "ffmpeg finalize error: {}",
                String::from_utf8_lossy(&result.stderr)
            ));
        }
    } else {
        // Cria concat list
        let concat_list_path = format!("{}/concat.txt", tmp_dir);
        let concat_content = segment_paths
            .iter()
            .map(|p| format!("file '{}'\n", p))
            .collect::<String>();

        std::fs::write(&concat_list_path, concat_content)
            .map_err(|e| format!("Failed to write concat list: {}", e))?;

        let (crf, preset) = quality_params(&request.quality);

        // Concatena todos os segmentos
        let result = Command::new("ffmpeg")
            .args([
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", &concat_list_path,
                "-c:v", "libx264",
                "-preset", preset,
                "-crf", crf,
                "-c:a", "aac",
                "-b:a", "192k",
                &request.output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to concatenate segments: {}", e))?;

        // Limpa tmp
        let _ = std::fs::remove_dir_all(&tmp_dir);

        if !result.status.success() {
            return Err(format!(
                "ffmpeg concat error: {}",
                String::from_utf8_lossy(&result.stderr)
            ));
        }
    }

    let size_bytes = std::fs::metadata(&request.output_path)
        .map(|m| m.len())
        .unwrap_or(0);
    let duration_ms = get_video_duration_ms(&request.output_path).unwrap_or(0);

    Ok(ProcessingResult {
        output_path: request.output_path,
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

fn quality_params(quality: &str) -> (&'static str, &'static str) {
    match quality {
        "ultra"  => ("16", "slow"),
        "high"   => ("20", "medium"),
        _        => ("23", "fast"),   // medium / default
    }
}

fn run_proxy_ffmpeg(input: &str, output: &str, use_hw: bool) -> Result<(), String> {
    let mut args = vec![
        "-y".to_string(),
        "-i".to_string(), input.to_string(),
    ];

    if use_hw {
        args.extend([
            "-vf".to_string(), "scale=-2:480".to_string(),
            "-c:v".to_string(), "h264_videotoolbox".to_string(),
            "-b:v".to_string(), "1500k".to_string(),
            "-c:a".to_string(), "aac".to_string(),
            "-b:a".to_string(), "128k".to_string(),
        ]);
    } else {
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
    get_audio_duration_ms(path)
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
            export_video,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowCut");
}
