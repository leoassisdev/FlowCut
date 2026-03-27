/**
 * @module mappers
 * Mappers for converting between domain entities and DTOs.
 * In a real implementation, mappers ensure the frontend never leaks internal structures.
 */

import type { VideoProject, ProcessingJob, TranscriptSegment } from '@/packages/shared-types';
import type { VideoProjectSummary } from '@/packages/shared-contracts';

/** Maps a full VideoProject to a list-friendly summary DTO */
export function toProjectSummary(project: VideoProject): VideoProjectSummary {
  return {
    id: project.id,
    name: project.name,
    state: project.state,
    thumbnailUrl: null, // PLACEHOLDER: would be generated from proxy
    durationMs: project.sourceVideo?.durationMs ?? 0,
    updatedAt: project.updatedAt,
  };
}

/** Formats duration ms to human-readable mm:ss */
export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

/** Maps a job to a human-readable status label */
export function jobStatusLabel(job: ProcessingJob): string {
  const labels: Record<string, string> = {
    queued: 'Na fila',
    running: 'Processando',
    completed: 'Concluído',
    failed: 'Falhou',
    cancelled: 'Cancelado',
  };
  return labels[job.status] ?? job.status;
}

/** Maps a job type to a human-readable label */
export function jobTypeLabel(job: ProcessingJob): string {
  const labels: Record<string, string> = {
    transcode: 'Transcodificação',
    transcribe: 'Transcrição',
    align: 'Alinhamento',
    auto_cut: 'Corte Automático',
    caption: 'Legendas',
    reframe: 'Reframe',
    export: 'Exportação',
  };
  return labels[job.type] ?? job.type;
}

/** Returns visible text of a segment excluding removed words */
export function visibleSegmentText(segment: TranscriptSegment): string {
  return segment.words
    .filter((w) => !w.isRemoved)
    .map((w) => w.word)
    .join(' ');
}
