/**
 * @module mock-data
 * MOCK — Dados fictícios coerentes para desenvolvimento do FlowCut.
 * Nenhum dado aqui vem de processamento real de mídia.
 */

import type {
  VideoProject,
  SourceVideo,
  Transcript,
  TranscriptSegment,
  WordToken,
  SemanticTimeline,
  TimelineCut,
  ProcessingJob,
  StylePreset,
  BrollCue,
  CaptionTrack,
} from '@/packages/shared-types';
import { ALL_PRESETS } from '@/packages/shared-presets';

// ─── Helper ─────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `mock-${++_id}`;

// ─── Words ──────────────────────────────────────────────────────────

const createWords = (text: string, baseMs: number): WordToken[] => {
  const rawWords = text.split(' ');
  let cursor = baseMs;
  return rawWords.map((w) => {
    const duration = 200 + Math.random() * 300;
    const token: WordToken = {
      id: uid(),
      word: w,
      startMs: Math.round(cursor),
      endMs: Math.round(cursor + duration),
      confidence: 0.85 + Math.random() * 0.15,
      isFillerWord: ['uh', 'um', 'like', 'you know', 'né', 'tipo'].includes(w.toLowerCase()),
      isRemoved: false,
    };
    cursor += duration + 50;
    return token;
  });
};

// ─── Segments ───────────────────────────────────────────────────────

const MOCK_TEXTS = [
  'Olá pessoal, hoje vamos falar sobre edição de vídeo com inteligência artificial',
  'A ideia é uh simples: você importa o vídeo e o sistema transcreve automaticamente',
  'Depois você pode editar o texto e a timeline se reconstrói sozinha',
  'Isso é tipo revolucionário porque você não precisa mais cortar manualmente',
  'Vamos ver um exemplo prático de como isso funciona na prática',
  'Primeiro passo: importar o arquivo de vídeo no FlowCut',
  'O sistema gera um proxy de baixa resolução para edição rápida',
  'Em seguida extrai o áudio e envia para transcrição',
  'O whisper processa o áudio e retorna os timecodes de cada palavra',
  'Agora você pode simplesmente deletar palavras no texto e pronto',
];

const createSegments = (): TranscriptSegment[] => {
  let cursor = 0;
  return MOCK_TEXTS.map((text) => {
    const words = createWords(text, cursor);
    const seg: TranscriptSegment = {
      id: uid(),
      startMs: cursor,
      endMs: words[words.length - 1].endMs,
      text,
      words,
      speakerId: 'speaker-1',
      confidence: 0.92,
    };
    cursor = seg.endMs + 500;
    return seg;
  });
};

// ─── Transcript ─────────────────────────────────────────────────────

const segments = createSegments();

export const MOCK_TRANSCRIPT: Transcript = {
  id: 'transcript-1',
  language: 'pt-BR',
  segments,
  raw: segments.map((s) => s.text).join('\n'),
  engine: 'whisper.cpp',
};

// ─── Source Video ───────────────────────────────────────────────────

export const MOCK_SOURCE_VIDEO: SourceVideo = {
  id: 'source-1',
  filePath: '/mock/videos/tutorial-ia-edicao.mp4',
  fileName: 'tutorial-ia-edicao.mp4',
  durationMs: 185000,
  width: 1920,
  height: 1080,
  fps: 30,
  codec: 'h264',
  sizeBytes: 245_000_000,
  proxyPath: '/mock/proxy/tutorial-ia-edicao-proxy.mp4',
  audioPath: '/mock/audio/tutorial-ia-edicao.wav',
};

// ─── Timeline ───────────────────────────────────────────────────────

const createTimelineCuts = (): TimelineCut[] =>
  segments.map((seg) => ({
    id: uid(),
    startMs: seg.startMs,
    endMs: seg.endMs,
    type: 'keep' as const,
    sourceSegmentId: seg.id,
    label: seg.text.slice(0, 40) + '…',
  }));

export const MOCK_TIMELINE: SemanticTimeline = {
  id: 'timeline-1',
  cuts: createTimelineCuts(),
  totalDurationMs: 185000,
  originalDurationMs: 185000,
};

// ─── Jobs ───────────────────────────────────────────────────────────

export const MOCK_JOBS: ProcessingJob[] = [
  { id: 'job-1', type: 'transcode', status: 'completed', progress: 100, startedAt: '2025-01-01T10:00:00Z', completedAt: '2025-01-01T10:02:00Z', error: null },
  { id: 'job-2', type: 'transcribe', status: 'completed', progress: 100, startedAt: '2025-01-01T10:02:00Z', completedAt: '2025-01-01T10:05:00Z', error: null },
  { id: 'job-3', type: 'align', status: 'completed', progress: 100, startedAt: '2025-01-01T10:05:00Z', completedAt: '2025-01-01T10:06:00Z', error: null },
  { id: 'job-4', type: 'export', status: 'queued', progress: 0, startedAt: null, completedAt: null, error: null },
];

// ─── B-Roll Cues ────────────────────────────────────────────────────

export const MOCK_BROLL_CUES: BrollCue[] = [
  { id: 'broll-1', timelineCutId: MOCK_TIMELINE.cuts[0]?.id ?? '', keyword: 'inteligência artificial', suggestedQuery: 'AI technology futuristic', startMs: 2000, endMs: 5000, status: 'suggested', assetId: null },
  { id: 'broll-2', timelineCutId: MOCK_TIMELINE.cuts[5]?.id ?? '', keyword: 'importar arquivo', suggestedQuery: 'file import drag drop', startMs: 45000, endMs: 48000, status: 'suggested', assetId: null },
];

// ─── Caption Track ──────────────────────────────────────────────────

export const MOCK_CAPTION_TRACK: CaptionTrack = {
  id: 'caption-1',
  format: 'srt',
  segments: segments.map((s) => ({ startMs: s.startMs, endMs: s.endMs, text: s.text })),
  style: {
    fontFamily: 'Inter',
    fontSize: 48,
    color: '#FFFFFF',
    backgroundColor: '#00000080',
    position: 'bottom',
    animation: 'word-highlight',
  },
};

// ─── Project ────────────────────────────────────────────────────────

export const MOCK_PROJECT: VideoProject = {
  id: 'project-1',
  name: 'Tutorial IA Edição',
  state: 'ALIGNED',
  sourceVideo: MOCK_SOURCE_VIDEO,
  transcript: MOCK_TRANSCRIPT,
  semanticTimeline: MOCK_TIMELINE,
  editDecisions: [],
  captionTrack: null,
  reframePlan: null,
  audioPostPlan: null,
  exportProfile: null,
  appliedPreset: null,
  brollCues: [],
  generatedAssets: [],
  jobs: MOCK_JOBS,
  createdAt: '2025-01-01T10:00:00Z',
  updatedAt: '2025-01-01T10:06:00Z',
};

export const MOCK_PRESETS: StylePreset[] = ALL_PRESETS;
