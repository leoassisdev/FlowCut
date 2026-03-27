/**
 * @package shared-types
 * Central type definitions for the FlowCut domain.
 * These types are shared across desktop, local-engine and cloud-api.
 */

// ─── Pipeline States ────────────────────────────────────────────────

export type PipelineState =
  | 'DRAFT'
  | 'IMPORTED'
  | 'PROXY_GENERATED'
  | 'AUDIO_EXTRACTED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'ALIGNING_WORDS'
  | 'ALIGNED'
  | 'AUTO_CUT_ANALYZING'
  | 'AUTO_CUT_READY'
  | 'EDITING'
  | 'PRESET_APPLIED'
  | 'BROLL_PLANNING'
  | 'BROLL_READY'
  | 'CAPTIONS_GENERATING'
  | 'CAPTIONS_READY'
  | 'REFRAMING'
  | 'REFRAMED'
  | 'POST_PRODUCTION_READY'
  | 'EXPORTING'
  | 'EXPORTED'
  | 'FAILED'
  | 'CANCELLED';

// ─── Core Entities ──────────────────────────────────────────────────

export interface VideoProject {
  id: string;
  name: string;
  state: PipelineState;
  sourceVideo: SourceVideo | null;
  transcript: Transcript | null;
  semanticTimeline: SemanticTimeline | null;
  editDecisions: EditDecision[];
  captionTrack: CaptionTrack | null;
  reframePlan: ReframePlan | null;
  audioPostPlan: AudioPostPlan | null;
  exportProfile: ExportProfile | null;
  appliedPreset: StylePreset | null;
  brollCues: BrollCue[];
  generatedAssets: GeneratedAsset[];
  jobs: ProcessingJob[];
  createdAt: string;
  updatedAt: string;
}

export interface SourceVideo {
  id: string;
  filePath: string;
  fileName: string;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  sizeBytes: number;
  proxyPath: string | null;
  audioPath: string | null;
}

export interface Transcript {
  id: string;
  language: string;
  segments: TranscriptSegment[];
  raw: string;
  engine: 'whisper.cpp' | 'whisperx' | 'cloud' | 'manual';
}

export interface TranscriptSegment {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  words: WordToken[];
  speakerId: string | null;
  confidence: number;
}

export interface WordToken {
  id: string;
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isFillerWord: boolean;
  isRemoved: boolean;
}

export interface EditDecision {
  id: string;
  type: 'remove_word' | 'remove_segment' | 'reorder' | 'insert_pause' | 'insert_broll';
  targetId: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface TimelineCut {
  id: string;
  startMs: number;
  endMs: number;
  type: 'keep' | 'remove' | 'broll' | 'pause';
  sourceSegmentId: string | null;
  label: string;
}

export interface SemanticTimeline {
  id: string;
  cuts: TimelineCut[];
  totalDurationMs: number;
  originalDurationMs: number;
}

export interface StylePreset {
  id: string;
  name: string;
  description: string;
  category: 'podcast' | 'youtube' | 'short' | 'presentation' | 'custom';
  config: {
    removeFiller: boolean;
    removeSilence: boolean;
    silenceThresholdMs: number;
    maxPauseDurationMs: number;
    autoZoom: boolean;
    captionStyle: string;
    targetPlatform: string;
  };
}

export interface BrollCue {
  id: string;
  timelineCutId: string;
  keyword: string;
  suggestedQuery: string;
  startMs: number;
  endMs: number;
  status: 'suggested' | 'approved' | 'rejected' | 'placed';
  assetId: string | null;
}

export interface GeneratedAsset {
  id: string;
  type: 'proxy' | 'audio' | 'caption_file' | 'thumbnail' | 'exported_video';
  filePath: string;
  createdAt: string;
  sizeBytes: number;
}

export interface CaptionTrack {
  id: string;
  format: 'srt' | 'vtt' | 'ass' | 'burned';
  segments: CaptionSegment[];
  style: CaptionStyle;
}

export interface CaptionSegment {
  startMs: number;
  endMs: number;
  text: string;
  highlight?: string;
}

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: 'bottom' | 'top' | 'center';
  animation: 'none' | 'word-highlight' | 'karaoke';
}

export interface ReframePlan {
  id: string;
  targetAspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  keyframes: ReframeKeyframe[];
  strategy: 'face-tracking' | 'speaker-tracking' | 'manual';
}

export interface ReframeKeyframe {
  timeMs: number;
  x: number;
  y: number;
  scale: number;
}

export interface AudioPostPlan {
  id: string;
  normalizeLoudness: boolean;
  targetLUFS: number;
  denoiseLevel: 'off' | 'light' | 'medium' | 'heavy';
  compressor: boolean;
}

export interface ExportProfile {
  id: string;
  name: string;
  format: 'mp4' | 'mov' | 'webm';
  resolution: '4k' | '1080p' | '720p' | 'custom';
  width: number;
  height: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  codec: 'h264' | 'h265' | 'vp9' | 'prores';
}

export interface ProcessingJob {
  id: string;
  type: 'transcode' | 'transcribe' | 'align' | 'auto_cut' | 'caption' | 'reframe' | 'export';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  state: PipelineState;
  data: VideoProject;
  createdAt: string;
  label: string;
}
