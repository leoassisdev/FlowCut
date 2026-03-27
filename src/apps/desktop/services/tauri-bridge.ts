/**
 * @module tauri-bridge
 * Ponte entre o frontend React e o backend Tauri (Rust).
 *
 * REGRA: Nenhum outro módulo do desktop chama @tauri-apps diretamente.
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

/**
 * Abre o file picker nativo do macOS para selecionar um vídeo.
 * Retorna o path do arquivo selecionado ou null se cancelado.
 */
export async function pickVideoFile(): Promise<VideoFileInfo | null> {
  if (!IS_TAURI) {
    console.warn('[tauri-bridge] pickVideoFile: fora do Tauri, retornando mock');
    return { path: '/mock/videos/demo.mp4', name: 'demo.mp4' };
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      title: 'Selecionar vídeo',
      multiple: false,
      filters: [
        { name: 'Vídeo', extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'] },
      ],
    });

    if (!selected || typeof selected !== 'string') return null;
    const name = selected.split('/').pop() ?? selected;
    return { path: selected, name };
  } catch (error) {
    console.error('[tauri-bridge] pickVideoFile error:', error);
    return null;
  }
}

// ─── Video Metadata ──────────────────────────────────────────────────────────

/**
 * Lê metadados reais de um arquivo de vídeo via ffprobe (Rust).
 * Retorna duração, dimensões, fps, codec e tamanho reais.
 */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadata | null> {
  if (!IS_TAURI) {
    // Mock para desenvolvimento sem Tauri
    return {
      file_path: filePath,
      file_name: filePath.split('/').pop() ?? 'demo.mp4',
      duration_ms: 185000,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'h264',
      size_bytes: 245_000_000,
    };
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const metadata = await invoke<VideoMetadata>('get_video_metadata', {
      filePath,
    });
    return metadata;
  } catch (error) {
    console.error('[tauri-bridge] getVideoMetadata error:', error);
    return null;
  }
}

// ─── FFmpeg Check ────────────────────────────────────────────────────────────

/**
 * Verifica se ffmpeg/ffprobe estão instalados no sistema.
 */
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
