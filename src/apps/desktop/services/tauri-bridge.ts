/**
 * @module tauri-bridge
 * Ponte entre o frontend React e o backend Tauri (Rust).
 *
 * REGRA: Nenhum outro módulo do desktop chama @tauri-apps diretamente.
 * Toda comunicação com o Tauri passa por aqui.
 *
 * Em desenvolvimento sem Tauri (browser puro), as funções retornam
 * valores mock explicitamente marcados.
 */

// Detecta se está rodando dentro de um contexto Tauri real
const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface VideoFileInfo {
  path: string;
  name: string;
}

export interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
}

// ─── File Dialog ─────────────────────────────────────────────────────────────

/**
 * Abre o file picker nativo do macOS para selecionar um vídeo.
 * Retorna o path do arquivo selecionado ou null se cancelado.
 */
export async function pickVideoFile(): Promise<VideoFileInfo | null> {
  if (!IS_TAURI) {
    // ⚠️ MOCK — fora do contexto Tauri (ex: browser dev)
    console.warn('[tauri-bridge] pickVideoFile: fora do Tauri, retornando mock');
    return {
      path: '/mock/videos/demo.mp4',
      name: 'demo.mp4',
    };
  }

  try {
    const { open } = await import('@tauri-apps/plugin-dialog');

    const selected = await open({
      title: 'Selecionar vídeo',
      multiple: false,
      filters: [
        {
          name: 'Vídeo',
          extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'],
        },
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

// ─── System Info ─────────────────────────────────────────────────────────────

/**
 * Retorna informações do sistema via comando Rust.
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  if (!IS_TAURI) {
    return { platform: 'browser-mock', arch: 'unknown', version: '0.0.0' };
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<SystemInfo>('get_system_info');
  } catch (error) {
    console.error('[tauri-bridge] getSystemInfo error:', error);
    return { platform: 'unknown', arch: 'unknown', version: '0.0.0' };
  }
}
