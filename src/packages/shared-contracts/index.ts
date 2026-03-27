/**
 * @package shared-contracts
 * Request/Response DTOs and API contracts shared across all apps.
 * These contracts define the communication protocol between desktop ↔ local-engine ↔ cloud-api.
 */

import type {
  VideoProject,
  PipelineState,
  ProcessingJob,
  StylePreset,
  ExportProfile,
  Transcript,
  SemanticTimeline,
  BrollCue,
  CaptionTrack,
  ReframePlan,
  AudioPostPlan,
} from '../shared-types';

// ─── Generic ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Project ────────────────────────────────────────────────────────

export interface CreateProjectRequest {
  name: string;
  filePath: string;
}

export interface CreateProjectResponse {
  project: VideoProject;
}

export interface GetProjectResponse {
  project: VideoProject;
}

export interface ListProjectsResponse {
  projects: VideoProjectSummary[];
}

export interface VideoProjectSummary {
  id: string;
  name: string;
  state: PipelineState;
  thumbnailUrl: string | null;
  durationMs: number;
  updatedAt: string;
}

// ─── Transcription ──────────────────────────────────────────────────

export interface StartTranscriptionRequest {
  projectId: string;
  engine: 'whisper.cpp' | 'whisperx' | 'cloud';
  language?: string;
}

export interface TranscriptionResponse {
  transcript: Transcript;
  job: ProcessingJob;
}

// ─── Edit ───────────────────────────────────────────────────────────

export interface ApplyEditRequest {
  projectId: string;
  type: 'remove_word' | 'remove_segment' | 'reorder' | 'insert_pause' | 'insert_broll';
  targetId: string;
  payload?: Record<string, unknown>;
}

export interface RebuildTimelineRequest {
  projectId: string;
}

export interface RebuildTimelineResponse {
  timeline: SemanticTimeline;
}

// ─── Presets ────────────────────────────────────────────────────────

export interface ApplyPresetRequest {
  projectId: string;
  presetId: string;
}

export interface ListPresetsResponse {
  presets: StylePreset[];
}

// ─── B-Roll ─────────────────────────────────────────────────────────

export interface GenerateBrollCuesRequest {
  projectId: string;
}

export interface BrollCuesResponse {
  cues: BrollCue[];
}

// ─── Captions ───────────────────────────────────────────────────────

export interface GenerateCaptionsRequest {
  projectId: string;
  format: 'srt' | 'vtt' | 'ass' | 'burned';
  style?: Partial<CaptionTrack['style']>;
}

export interface CaptionsResponse {
  captionTrack: CaptionTrack;
}

// ─── Reframe ────────────────────────────────────────────────────────

export interface StartReframeRequest {
  projectId: string;
  targetAspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  strategy: 'face-tracking' | 'speaker-tracking' | 'manual';
}

export interface ReframeResponse {
  plan: ReframePlan;
}

// ─── Audio Post ─────────────────────────────────────────────────────

export interface ApplyAudioPostRequest {
  projectId: string;
  plan: AudioPostPlan;
}

// ─── Export ──────────────────────────────────────────────────────────

export interface StartExportRequest {
  projectId: string;
  profile: ExportProfile;
  outputPath: string;
}

export interface ExportResponse {
  job: ProcessingJob;
  estimatedDurationMs: number;
}

// ─── Jobs ───────────────────────────────────────────────────────────

export interface ListJobsRequest {
  projectId: string;
}

export interface ListJobsResponse {
  jobs: ProcessingJob[];
}

export interface JobStatusResponse {
  job: ProcessingJob;
}
