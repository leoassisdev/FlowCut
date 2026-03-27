/**
 * @module tauri-bridge
 * Ponte entre o frontend React e o backend Tauri (Rust).
 * Toda comunicação com o Tauri passa por aqui.
 */

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface VideoFileInfo {
  path: string;
  name: string;
}

export interface VideoMetadata {
  file_path: string;
  file_name: string;
  duration_ms: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  size_bytes: number;
}

export interface ProcessingResult {
  output_path: string;
  duration_ms: number;
  size_bytes: number;
}

export interface TimelineCutInput {
  start_ms: number;
  end_ms: number;
}

export interface ExportRequest {
  source_video_path: string;
  cuts: TimelineCutInput[];
  output_path: string;
  width: number;
  height: number;
  fps: number;
  quality: 'high' | 'medium' | 'ultra';
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
}

export interface FfmpegStatus {
  ffmpeg: boolean;
  ffprobe: boolean;
  ready: boolean;
  install_hint: string;
}

// ─── File Dialog ─────────────────────────────────────────────────────────────

export async function pickVideoFile(): Promise<VideoFileInfo | null> {
  if (!IS_TAURI) {
    return { path: '/mock/videos/demo.mp4', name: 'demo.mp4' };
  }
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      title: 'Selecionar vídeo',
      multiple: false,
      filters: [{ name: 'Vídeo', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'] }],
    });
    if (!selected || typeof selected !== 'string') return null;
    return { path: selected, name: selected.split('/').pop() ?? selected };
  } catch (error) {
    console.error('[tauri-bridge] pickVideoFile error:', error);
    return null;
  }
}

// ─── Pick Output File ─────────────────────────────────────────────────────────

/**
 * Abre o save dialog nativo do macOS para escolher onde salvar o export.
 */
export async function pickExportPath(suggestedName: string): Promise<string | null> {
  if (!IS_TAURI) {
    return `/tmp/flowcut/exports/${suggestedName}`;
  }
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const selected = await save({
      title: 'Salvar vídeo exportado',
      defaultPath: suggestedName,
      filters: [{ name: 'Vídeo MP4', extensions: ['mp4'] }],
    });
    return selected ?? null;
  } catch (error) {
    console.error('[tauri-bridge] pickExportPath error:', error);
    return null;
  }
}

// ─── Video Metadata ──────────────────────────────────────────────────────────

export async function getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  if (!IS_TAURI) {
    return {
      file_path: filePath,
      file_name: filePath.split('/').pop() ?? 'demo.mp4',
      duration_ms: 185000, width: 1920, height: 1080,
      fps: 30, codec: 'h264', size_bytes: 245_000_000,
    };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<VideoMetadata>('get_video_metadata', { filePath });
  } catch (error) {
    console.error('[tauri-bridge] getVideoMetadata error:', error);
    return null;
  }
}

// ─── Audio Extraction ────────────────────────────────────────────────────────

export async function extractAudio(videoPath: string, outputDir: string): Promise<ProcessingResult | null> {
  if (!IS_TAURI) {
    return { output_path: '/mock/audio/demo.wav', duration_ms: 185000, size_bytes: 5_000_000 };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ProcessingResult>('extract_audio', { videoPath, outputDir });
  } catch (error) {
    console.error('[tauri-bridge] extractAudio error:', error);
    return null;
  }
}

// ─── Proxy Generation ────────────────────────────────────────────────────────

export async function generateProxy(videoPath: string, outputDir: string): Promise<ProcessingResult | null> {
  if (!IS_TAURI) {
    return { output_path: '/mock/proxy/demo_proxy.mp4', duration_ms: 185000, size_bytes: 15_000_000 };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ProcessingResult>('generate_proxy', { videoPath, outputDir });
  } catch (error) {
    console.error('[tauri-bridge] generateProxy error:', error);
    return null;
  }
}

// ─── Export Video ─────────────────────────────────────────────────────────────

/**
 * Exporta o vídeo final aplicando os cortes da SemanticTimeline.
 * Chama o comando Rust export_video que usa ffmpeg para cortar e concatenar.
 */
export async function exportVideo(request: ExportRequest): Promise<ProcessingResult | null> {
  if (!IS_TAURI) {
    console.warn('[tauri-bridge] exportVideo: mock mode');
    await new Promise((r) => setTimeout(r, 2000));
    return {
      output_path: `/tmp/flowcut/exports/export_mock.mp4`,
      duration_ms: 5000,
      size_bytes: 10_000_000,
    };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<ProcessingResult>('export_video', { request });
  } catch (error) {
    console.error('[tauri-bridge] exportVideo error:', error);
    return null;
  }
}

// ─── FFmpeg Check ────────────────────────────────────────────────────────────

export async function checkFfmpeg(): Promise<FfmpegStatus> {
  if (!IS_TAURI) {
    return { ffmpeg: false, ffprobe: false, ready: false, install_hint: 'brew install ffmpeg' };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<FfmpegStatus>('check_ffmpeg');
  } catch {
    return { ffmpeg: false, ffprobe: false, ready: false, install_hint: 'brew install ffmpeg' };
  }
}

// ─── System Info ─────────────────────────────────────────────────────────────

export async function getSystemInfo(): Promise<SystemInfo> {
  if (!IS_TAURI) {
    return { platform: 'browser-mock', arch: 'unknown', version: '0.0.0' };
  }
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<SystemInfo>('get_system_info');
  } catch {
    return { platform: 'unknown', arch: 'unknown', version: '0.0.0' };
  }
}
