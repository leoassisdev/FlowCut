/**
 * @module local-api-client
 * Client HTTP para comunicação com a local-engine (FastAPI na porta 7777).
 *
 * Em desenvolvimento: chama http://127.0.0.1:7777 diretamente.
 * Em produção: a engine sobe como sidecar do Tauri na mesma porta.
 *
 * REGRA: Nenhum outro módulo chama a engine diretamente.
 * Toda comunicação passa por aqui.
 */

import type {
  ApiResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  StartTranscriptionRequest,
  TranscriptionResponse,
  RebuildTimelineResponse,
  ListJobsResponse,
  ExportResponse,
  StartExportRequest,
} from '@/packages/shared-contracts';
import type { Transcript, TranscriptSegment, WordToken } from '@/packages/shared-types';
import { MOCK_PROJECT, MOCK_JOBS, MOCK_TIMELINE } from '@/apps/desktop/mocks/mock-data';

const ENGINE_BASE_URL = 'http://127.0.0.1:7777';

// ─── Health ──────────────────────────────────────────────────────────────────

/**
 * Verifica se a engine local está rodando.
 */
export async function checkEngineHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Transcription ───────────────────────────────────────────────────────────

/**
 * Chama a engine real para transcrever um arquivo de áudio.
 * Retorna Transcript compatível com shared-types.
 */
export async function transcribeAudio(
  projectId: string,
  audioPath: string,
  language = 'pt',
): Promise<Transcript | null> {
  try {
    const res = await fetch(`${ENGINE_BASE_URL}/api/v1/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, audio_path: audioPath, language }),
      signal: AbortSignal.timeout(300_000), // 5 min — vídeos longos podem demorar
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Engine error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return mapEngineTranscriptToSharedTypes(data.transcript, projectId);
  } catch (error) {
    console.error('[local-api-client] transcribeAudio error:', error);
    return null;
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

/**
 * Converte o response da engine Python para o formato shared-types TypeScript.
 * A engine retorna snake_case, o frontend usa camelCase.
 */
function mapEngineTranscriptToSharedTypes(
  engineTranscript: any,
  projectId: string,
): Transcript {
  const segments: TranscriptSegment[] = (engineTranscript.segments ?? []).map(
    (seg: any, segIdx: number): TranscriptSegment => {
      const words: WordToken[] = (seg.words ?? []).map(
        (w: any): WordToken => ({
          id: w.id ?? `word-${projectId}-${segIdx}-${Math.random().toString(36).slice(2, 7)}`,
          word: w.word,
          startMs: w.start_ms,
          endMs: w.end_ms,
          confidence: w.confidence,
          isFillerWord: w.is_filler_word,
          isRemoved: false,
        }),
      );

      return {
        id: seg.id ?? `seg-${projectId}-${segIdx}`,
        startMs: seg.start_ms,
        endMs: seg.end_ms,
        text: seg.text,
        words,
        speakerId: seg.speaker_id ?? null,
        confidence: seg.confidence ?? 0.9,
      };
    },
  );

  return {
    id: engineTranscript.id ?? `transcript-${projectId}`,
    language: engineTranscript.language ?? 'pt',
    segments,
    raw: engineTranscript.raw ?? segments.map((s) => s.text).join('\n'),
    engine: 'whisper.cpp',
  };
}

// ─── Legacy mock methods (mantidos para compatibilidade) ──────────────────────

export const localApiClient = {
  async createProject(_req: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponse>> {
    return {
      success: true,
      data: { project: MOCK_PROJECT },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },

  async startTranscription(req: StartTranscriptionRequest): Promise<ApiResponse<TranscriptionResponse>> {
    // Delega para a engine real se possível
    const transcript = await transcribeAudio(req.projectId, '', req.language ?? 'pt');
    return {
      success: true,
      data: { transcript: transcript ?? MOCK_PROJECT.transcript!, job: MOCK_JOBS[1] },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },

  async rebuildTimeline(_projectId: string): Promise<ApiResponse<RebuildTimelineResponse>> {
    return {
      success: true,
      data: { timeline: MOCK_TIMELINE },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },

  async listJobs(_projectId: string): Promise<ApiResponse<ListJobsResponse>> {
    return {
      success: true,
      data: { jobs: MOCK_JOBS },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },

  async startExport(_req: StartExportRequest): Promise<ApiResponse<ExportResponse>> {
    return {
      success: true,
      data: { job: MOCK_JOBS[3], estimatedDurationMs: 30000 },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },
};
