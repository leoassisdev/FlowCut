use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;
use tauri::Emitter;

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

#[derive(Debug, Serialize, Deserialize)]
pub struct TimelineCutInput {
    pub start_ms: u64,
    pub end_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub source_video_path: String,
    pub cuts: Vec<TimelineCutInput>,
    pub output_path: String,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub quality: String,
    pub subtitles: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SilenceInterval {
    pub start_ms: u64,
    pub end_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SilenceDetectionResult {
    pub silences: Vec<SilenceInterval>,
    pub total_silence_ms: u64,
    pub total_duration_ms: u64,
}

#[derive(Clone, Serialize)]
struct ProgressPayload {
    progress: u32,
}

#[tauri::command]
fn get_video_metadata(file_path: String) -> Result<VideoMetadata, String> {
    let ffprobe_available = Command::new("which").arg("ffprobe").output().map(|o| o.status.success()).unwrap_or(false);
    if !ffprobe_available { return Err("ffprobe not found. Install: brew install ffmpeg".to_string()); }

    let file_name = Path::new(&file_path).file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();

    let output = Command::new("ffprobe").args(["-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", &file_path])
        .output().map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() { return Err(format!("ffprobe error: {}", String::from_utf8_lossy(&output.stderr))); }

    let json: serde_json::Value = serde_json::from_str(&String::from_utf8_lossy(&output.stdout)).map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    let streams = json["streams"].as_array().ok_or("No streams found")?;
    let video_stream = streams.iter().find(|s| s["codec_type"].as_str() == Some("video")).ok_or("No video stream found")?;

    let mut width  = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let mut height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    let codec  = video_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
    let fps    = parse_fps(video_stream["r_frame_rate"].as_str().unwrap_or("30/1"));

    if let Some(side_data_list) = video_stream["side_data_list"].as_array() {
        for side_data in side_data_list {
            if let Some(rotation) = side_data["rotation"].as_i64() {
                let r = rotation.abs();
                if r == 90 || r == 270 {
                    std::mem::swap(&mut width, &mut height);
                }
                break;
            }
        }
    }

    let parse_duration = |val: &serde_json::Value| -> Option<f64> {
        val.as_str().and_then(|s| s.parse::<f64>().ok())
            .or_else(|| val.as_f64())
    };

    let duration_secs = parse_duration(&video_stream["duration"])
        .or_else(|| parse_duration(&json["format"]["duration"]))
        .unwrap_or(0.0);

    let size_bytes = json["format"]["size"].as_str()
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or_else(|| std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0));

    Ok(VideoMetadata { file_path, file_name, duration_ms: (duration_secs * 1000.0) as u64, width, height, fps, codec, size_bytes })
}

// ─── DETECÇÃO DE SILÊNCIO VIA FFMPEG (NOISE GATE REAL) ───
#[tauri::command]
fn detect_silences(file_path: String, noise_db: f64, min_duration: f64) -> Result<SilenceDetectionResult, String> {
    let filter = format!("silencedetect=noise={}dB:d={}", noise_db, min_duration);

    let output = Command::new("ffmpeg")
        .args(["-i", &file_path, "-af", &filter, "-f", "null", "-"])
        .output()
        .map_err(|e| format!("Failed to run ffmpeg silencedetect: {}", e))?;

    // silencedetect escreve no stderr do ffmpeg
    let stderr = String::from_utf8_lossy(&output.stderr);

    let mut silences: Vec<SilenceInterval> = Vec::new();
    let mut current_start: Option<f64> = None;
    let mut total_duration_secs: f64 = 0.0;

    for line in stderr.lines() {
        if line.contains("silence_start:") {
            // Formato: [silencedetect @ 0x...] silence_start: 3.72102
            if let Some(pos) = line.find("silence_start:") {
                let after = &line[pos + 15..];
                // Pega só o número (pode ter lixo como "bitrate=..." grudado)
                let num_str: String = after.chars().take_while(|c| c.is_ascii_digit() || *c == '.' || *c == '-').collect();
                if let Ok(start) = num_str.parse::<f64>() {
                    current_start = Some(start);
                }
            }
        } else if line.contains("silence_end:") {
            if let Some(start) = current_start {
                // Formato: [silencedetect @ 0x...] silence_end: 4.37 | silence_duration: 0.64898
                if let Some(pos) = line.find("silence_end:") {
                    let after = &line[pos + 13..];
                    let num_str: String = after.chars().take_while(|c| c.is_ascii_digit() || *c == '.' || *c == '-').collect();
                    if let Ok(end) = num_str.parse::<f64>() {
                        let dur = end - start;
                        silences.push(SilenceInterval {
                            start_ms: (start * 1000.0) as u64,
                            end_ms: (end * 1000.0) as u64,
                            duration_ms: (dur * 1000.0) as u64,
                        });
                    }
                }
                current_start = None;
            }
        }
        // Captura duração total do arquivo
        if line.contains("Duration:") {
            if let Some(pos) = line.find("Duration:") {
                let after = &line[pos + 10..];
                let time_str: String = after.chars().take_while(|c| *c != ',').collect();
                let parts: Vec<&str> = time_str.trim().split(':').collect();
                if parts.len() == 3 {
                    let h = parts[0].parse::<f64>().unwrap_or(0.0);
                    let m = parts[1].parse::<f64>().unwrap_or(0.0);
                    let s = parts[2].parse::<f64>().unwrap_or(0.0);
                    total_duration_secs = h * 3600.0 + m * 60.0 + s;
                }
            }
        }
    }

    // Se o último silêncio não teve silence_end (silêncio até o fim do arquivo)
    if let Some(start) = current_start {
        if total_duration_secs > start {
            let end = total_duration_secs;
            silences.push(SilenceInterval {
                start_ms: (start * 1000.0) as u64,
                end_ms: (end * 1000.0) as u64,
                duration_ms: ((end - start) * 1000.0) as u64,
            });
        }
    }

    let total_silence_ms: u64 = silences.iter().map(|s| s.duration_ms).sum();

    Ok(SilenceDetectionResult {
        silences,
        total_silence_ms,
        total_duration_ms: (total_duration_secs * 1000.0) as u64,
    })
}

#[tauri::command]
fn extract_audio(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;
    let stem = Path::new(&video_path).file_stem().and_then(|s| s.to_str()).unwrap_or("audio");
    let output_path = format!("{}/{}.wav", output_dir, stem);

    let result = Command::new("ffmpeg").args(["-y", "-i", &video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", &output_path])
        .output().map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !result.status.success() { return Err(format!("ffmpeg extract_audio error: {}", String::from_utf8_lossy(&result.stderr))); }

    let size_bytes = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
    let duration_ms = get_audio_duration_ms(&output_path).unwrap_or(0);
    Ok(ProcessingResult { output_path, duration_ms, size_bytes })
}

#[tauri::command]
fn generate_proxy(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    std::fs::create_dir_all(&output_dir).map_err(|e| format!("Failed to create output dir: {}", e))?;
    let stem = Path::new(&video_path).file_stem().and_then(|s| s.to_str()).unwrap_or("proxy");
    let output_path = format!("{}/{}_proxy.mp4", output_dir, stem);

    let result = run_proxy_ffmpeg(&video_path, &output_path, true);
    let result = if result.is_err() { run_proxy_ffmpeg(&video_path, &output_path, false) } else { result };
    result.map_err(|e| format!("generate_proxy failed: {}", e))?;

    let size_bytes = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);
    let duration_ms = get_video_duration_ms(&output_path).unwrap_or(0);
    Ok(ProcessingResult { output_path, duration_ms, size_bytes })
}

#[tauri::command]
fn generate_thumbnails(video_path: String, output_dir: String) -> Result<ProcessingResult, String> {
    let thumbs_dir = format!("{}/thumbs", output_dir);
    std::fs::create_dir_all(&thumbs_dir).map_err(|e| format!("Failed to create thumbs dir: {}", e))?;

    let output_pattern = format!("{}/thumb_%04d.jpg", thumbs_dir);
    
    let result = Command::new("ffmpeg")
        .args(["-y", "-i", &video_path, "-vf", "fps=1,scale=160:-1", "-q:v", "5", &output_pattern])
        .output().map_err(|e| format!("Failed to extract thumbnails: {}", e))?;

    if !result.status.success() { 
        return Err(format!("ffmpeg thumbnails error: {}", String::from_utf8_lossy(&result.stderr))); 
    }

    Ok(ProcessingResult { output_path: thumbs_dir, duration_ms: 0, size_bytes: 0 })
}

#[tauri::command]
fn export_video(app: tauri::AppHandle, request: ExportRequest) -> Result<ProcessingResult, String> {
    if request.cuts.is_empty() { return Err("No cuts provided for export".to_string()); }

    if let Some(parent) = Path::new(&request.output_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output dir: {}", e))?;
    }

    let tmp_dir = format!("{}_segments", request.output_path);
    std::fs::create_dir_all(&tmp_dir).map_err(|e| format!("Failed to create tmp dir: {}", e))?;

    let _ = app.emit("export-progress", ProgressPayload { progress: 5 });

    let mut srt_filter = None;
    if let Some(srt_content) = &request.subtitles {
        let safe_srt_path = "/tmp/flowcut_subs.srt";
        std::fs::write(safe_srt_path, srt_content).map_err(|e| format!("Failed to write SRT file: {}", e))?;
        srt_filter = Some(format!("subtitles={}", safe_srt_path)); 
    }

    let mut segment_paths: Vec<String> = Vec::new();
    let total_cuts = request.cuts.len();

    for (i, cut) in request.cuts.iter().enumerate() {
        let seg_path = format!("{}/seg_{:04}.mp4", tmp_dir, i);
        let start_secs = cut.start_ms as f64 / 1000.0;
        let duration_secs = (cut.end_ms - cut.start_ms) as f64 / 1000.0;

        if duration_secs <= 0.0 { continue; }

        let result = Command::new("ffmpeg")
            .args(["-y", "-ss", &format!("{:.3}", start_secs), "-i", &request.source_video_path, "-t", &format!("{:.3}", duration_secs), "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-avoid_negative_ts", "make_zero", &seg_path])
            .output().map_err(|e| format!("Failed to extract segment {}: {}", i, e))?;

        if !result.status.success() {
            let _ = std::fs::remove_dir_all(&tmp_dir);
            return Err(format!("ffmpeg segment {} error: {}", i, String::from_utf8_lossy(&result.stderr)));
        }
        segment_paths.push(seg_path);

        let pct = 5 + ((i as f32 / total_cuts as f32) * 75.0) as u32;
        let _ = app.emit("export-progress", ProgressPayload { progress: pct });
    }

    if segment_paths.is_empty() {
        let _ = std::fs::remove_dir_all(&tmp_dir);
        return Err("No valid segments extracted".to_string());
    }

    let (crf, preset) = quality_params(&request.quality);
    let _ = app.emit("export-progress", ProgressPayload { progress: 85 });

    let mut cmd = Command::new("ffmpeg");
    cmd.current_dir(&tmp_dir);

    if segment_paths.len() == 1 {
        let mut args = vec!["-y".to_string(), "-i".to_string(), "seg_0000.mp4".to_string()];
        if let Some(ref srt) = srt_filter { args.push("-vf".to_string()); args.push(srt.clone()); }
        args.extend(["-c:v".to_string(), "libx264".to_string(), "-preset".to_string(), preset.to_string(), "-crf".to_string(), crf.to_string(), "-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "192k".to_string(), request.output_path.clone()]);
        
        let result = cmd.args(&args).output().map_err(|e| format!("Failed to finalize export: {}", e))?;
        if !result.status.success() { let _ = std::fs::remove_dir_all(&tmp_dir); return Err(format!("ffmpeg finalize error: {}", String::from_utf8_lossy(&result.stderr))); }
    } else {
        let concat_list_path = format!("{}/concat.txt", tmp_dir);
        let concat_content = segment_paths.iter().enumerate().map(|(i, _)| format!("file 'seg_{:04}.mp4'\n", i)).collect::<String>();
        std::fs::write(&concat_list_path, concat_content).map_err(|e| format!("Failed to write concat list: {}", e))?;

        let mut args = vec!["-y".to_string(), "-f".to_string(), "concat".to_string(), "-safe".to_string(), "0".to_string(), "-i".to_string(), "concat.txt".to_string()];
        if let Some(ref srt) = srt_filter { args.push("-vf".to_string()); args.push(srt.clone()); }
        args.extend(["-c:v".to_string(), "libx264".to_string(), "-preset".to_string(), preset.to_string(), "-crf".to_string(), crf.to_string(), "-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "192k".to_string(), request.output_path.clone()]);

        let result = cmd.args(&args).output().map_err(|e| format!("Failed to concatenate segments: {}", e))?;
        if !result.status.success() { let _ = std::fs::remove_dir_all(&tmp_dir); return Err(format!("ffmpeg concat error: {}", String::from_utf8_lossy(&result.stderr))); }
    }

    let _ = std::fs::remove_dir_all(&tmp_dir);
    let _ = app.emit("export-progress", ProgressPayload { progress: 100 });

    let size_bytes = std::fs::metadata(&request.output_path).map(|m| m.len()).unwrap_or(0);
    let duration_ms = get_video_duration_ms(&request.output_path).unwrap_or(0);

    Ok(ProcessingResult { output_path: request.output_path, duration_ms, size_bytes })
}

#[tauri::command]
fn open_in_finder(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    Command::new("open").arg("-R").arg(&path).spawn().map_err(|e| format!("Failed to open finder: {}", e))?;
    Ok(())
}

#[tauri::command]
fn check_ffmpeg() -> serde_json::Value {
    let has_ffprobe = Command::new("which").arg("ffprobe").output().map(|o| o.status.success()).unwrap_or(false);
    let has_ffmpeg = Command::new("which").arg("ffmpeg").output().map(|o| o.status.success()).unwrap_or(false);
    serde_json::json!({ "ffmpeg": has_ffmpeg, "ffprobe": has_ffprobe, "ready": has_ffmpeg && has_ffprobe, "install_hint": "brew install ffmpeg" })
}

#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({ "platform": std::env::consts::OS, "arch": std::env::consts::ARCH, "version": env!("CARGO_PKG_VERSION") })
}

fn parse_fps(fps_str: &str) -> f64 {
    let parts: Vec<&str> = fps_str.split('/').collect();
    if parts.len() == 2 {
        let num = parts[0].parse::<f64>().unwrap_or(30.0);
        let den = parts[1].parse::<f64>().unwrap_or(1.0);
        if den > 0.0 { (num / den * 100.0).round() / 100.0 } else { 30.0 }
    } else { fps_str.parse::<f64>().unwrap_or(30.0) }
}

fn quality_params(quality: &str) -> (&'static str, &'static str) {
    match quality { "ultra" => ("16", "slow"), "high" => ("20", "medium"), _ => ("23", "fast") }
}

fn run_proxy_ffmpeg(input: &str, output: &str, use_hw: bool) -> Result<(), String> {
    let mut args = vec!["-y".to_string(), "-i".to_string(), input.to_string()];
    if use_hw { args.extend(["-vf".to_string(), "scale=-2:480".to_string(), "-c:v".to_string(), "h264_videotoolbox".to_string(), "-b:v".to_string(), "1500k".to_string(), "-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "128k".to_string()]); } 
    else { args.extend(["-vf".to_string(), "scale=-2:480".to_string(), "-c:v".to_string(), "libx264".to_string(), "-preset".to_string(), "fast".to_string(), "-crf".to_string(), "23".to_string(), "-c:a".to_string(), "aac".to_string(), "-b:a".to_string(), "128k".to_string()]); }
    args.push(output.to_string());
    let result = Command::new("ffmpeg").args(&args).output().map_err(|e| format!("ffmpeg spawn error: {}", e))?;
    if !result.status.success() { return Err(String::from_utf8_lossy(&result.stderr).to_string()); }
    Ok(())
}

fn get_audio_duration_ms(path: &str) -> Option<u64> {
    let output = Command::new("ffprobe").args(["-v", "quiet", "-print_format", "json", "-show_format", path]).output().ok()?;
    let json: serde_json::Value = serde_json::from_str(&String::from_utf8_lossy(&output.stdout)).ok()?;
    let secs = json["format"]["duration"].as_str()?.parse::<f64>().ok()?;
    Some((secs * 1000.0) as u64)
}

fn get_video_duration_ms(path: &str) -> Option<u64> { get_audio_duration_ms(path) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_system_info, get_video_metadata, check_ffmpeg,
            extract_audio, generate_proxy, generate_thumbnails,
            detect_silences, export_video, open_in_finder
        ])
        .run(tauri::generate_context!())
        .expect("error while running FlowCut");
}