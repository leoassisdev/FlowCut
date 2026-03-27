/**
 * @module project-store
 * Zustand store for the active VideoProject.
 * Integrates command system, undo/redo, autosave, editor state machine, and job queue.
 */

import { create } from 'zustand';
import type {
  VideoProject, PipelineState, StylePreset,
  ProcessingJob, CaptionStyle, SourceVideo, Transcript,
  SemanticTimeline, TimelineCut,
} from '@/packages/shared-types';
import { MOCK_PROJECT, MOCK_BROLL_CUES, MOCK_CAPTION_TRACK } from '@/apps/desktop/mocks/mock-data';
import { getVideoMetadata, extractAudio, generateProxy } from '@/apps/desktop/services/tauri-bridge';
import { transcribeAudio, checkEngineHealth } from '@/apps/desktop/services/local-api-client';
import {
  type CommandHistory, createCommandHistory, pushCommand,
  undoCommand, redoCommand, canUndo, canRedo,
  createRemoveWordCommand, createRemoveSegmentCommand,
  createApplyPresetCommand, createUpdateCaptionsCommand,
  createUpdateCaptionStyleCommand, type Command,
} from '@/apps/desktop/core/command-system';
import {
  type EditorMachineState, createEditorMachine,
  transition, canTransition, type EditorEvent,
} from '@/apps/desktop/core/editor-state-machine';
import {
  type AutosaveState, createAutosaveState,
  saveSnapshot, restoreSnapshot, createAutosaveDebounce,
} from '@/apps/desktop/core/autosave';
import { logger } from '@/apps/desktop/core/logger';
import { enqueueJob, cancelJob, retryJob } from '@/apps/desktop/core/job-queue';

const autosaveDebounce = createAutosaveDebounce(3000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getProjectDir(projectId: string): string {
  return `/tmp/flowcut/projects/${projectId}`;
}

/**
 * Constrói a SemanticTimeline inicial a partir do transcript.
 * Cada segmento vira um TimelineCut do tipo 'keep'.
 */
function buildInitialTimeline(transcript: Transcript): SemanticTimeline {
  let cursor = 0;
  const cuts: TimelineCut[] = transcript.segments.map((seg) => {
    const cut: TimelineCut = {
      id: `cut-${seg.id}`,
      startMs: cursor,
      endMs: cursor + (seg.endMs - seg.startMs),
      type: 'keep',
      sourceSegmentId: seg.id,
      label: seg.text.slice(0, 40) + (seg.text.length > 40 ? '…' : ''),
    };
    cursor = cut.endMs + 50;
    return cut;
  });

  return {
    id: `timeline-${transcript.id}`,
    cuts,
    totalDurationMs: cursor,
    originalDurationMs: cursor,
  };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface ProjectStore {
  project: VideoProject | null;
  isLoading: boolean;
  importError: string | null;
  importProgress: string | null;

  editorMachine: EditorMachineState;
  sendEditorEvent: (event: EditorEvent) => void;

  commandHistory: CommandHistory;
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  autosave: AutosaveState;
  markDirty: () => void;
  saveNow: (label?: string) => void;
  restoreFromSnapshot: (snapshotId: string) => void;

  loadProject: (id: string) => void;
  importVideoFromPath: (filePath: string) => Promise<void>;
  removeWord: (wordId: string) => void;
  removeSegment: (segmentId: string) => void;
  rebuildTimeline: () => void;
  applyPreset: (preset: StylePreset) => void;
  setState: (state: PipelineState) => void;

  generateCaptions: () => void;
  updateCaptionStyle: (style: CaptionStyle) => void;
  generateBrollCues: () => void;

  enqueueJob: (type: ProcessingJob['type']) => string;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => void;
  simulateExport: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  isLoading: false,
  importError: null,
  importProgress: null,
  editorMachine: createEditorMachine(),
  commandHistory: createCommandHistory(),
  autosave: createAutosaveState(),

  // ─── Editor State Machine ─────────────────────────────────────────

  sendEditorEvent: (event: EditorEvent) => {
    const machine = get().editorMachine;
    if (canTransition(machine, event)) {
      const next = transition(machine, event);
      logger.info('editor-sm', `${machine.state} → ${next.state} [${event.type}]`);
      set({ editorMachine: next });
    } else {
      logger.warn('editor-sm', `Blocked: ${machine.state} + ${event.type}`);
    }
  },

  // ─── Command System ───────────────────────────────────────────────

  executeCommand: (command: Command) => {
    const project = get().project;
    if (!project) return;
    const newProject = command.execute(project);
    const newHistory = pushCommand(get().commandHistory, command);
    logger.info('command', `Executed: ${command.label}`);
    set({ project: newProject, commandHistory: newHistory });
    get().markDirty();
  },

  undo: () => {
    const { history, command } = undoCommand(get().commandHistory);
    if (!command || !get().project) return;
    const project = command.undo(get().project!);
    logger.info('command', `Undo: ${command.label}`);
    set({ project, commandHistory: history });
    get().markDirty();
  },

  redo: () => {
    const { history, command } = redoCommand(get().commandHistory);
    if (!command || !get().project) return;
    const project = command.execute(get().project!);
    logger.info('command', `Redo: ${command.label}`);
    set({ project, commandHistory: history });
    get().markDirty();
  },

  canUndo: () => canUndo(get().commandHistory),
  canRedo: () => canRedo(get().commandHistory),

  // ─── Autosave ─────────────────────────────────────────────────────

  markDirty: () => {
    set({ autosave: { ...get().autosave, isDirty: true } });
    autosaveDebounce.trigger(() => get().saveNow('Autosave'));
  },

  saveNow: (label = 'Manual save') => {
    const project = get().project;
    if (!project) return;
    set({ autosave: saveSnapshot(get().autosave, project, label) });
  },

  restoreFromSnapshot: (snapshotId: string) => {
    const { state, project } = restoreSnapshot(get().autosave, snapshotId);
    if (project) {
      set({ autosave: state, project, commandHistory: createCommandHistory() });
      logger.info('autosave', 'Project restored from snapshot');
    }
  },

  // ─── Project Actions ──────────────────────────────────────────────

  loadProject: (id: string) => {
    set({ isLoading: true });
    get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: id });
    logger.info('project', `Loading project: ${id}`);
    setTimeout(() => {
      set({ project: structuredClone(MOCK_PROJECT), isLoading: false });
      get().sendEditorEvent({ type: 'PROJECT_LOADED' });
      get().sendEditorEvent({ type: 'START_EDITING' });
      get().saveNow('Initial load');
      logger.info('project', 'Project loaded (MOCK)');
    }, 300);
  },

  /**
   * Pipeline completo de importação:
   * 1. get_video_metadata  → metadados reais via ffprobe
   * 2. extract_audio       → WAV 16kHz para Whisper
   * 3. generate_proxy      → MP4 480p para preview
   * 4. transcribeAudio     → transcrição real via engine Python + whisper.cpp
   * 5. buildInitialTimeline → timeline semântica inicial
   */
  importVideoFromPath: async (filePath: string) => {
    set({ isLoading: true, importError: null, importProgress: 'Reading metadata...' });
    get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: 'new' });
    logger.info('project', `Importing: ${filePath}`);

    try {
      // ── Step 1: Metadados ─────────────────────────────────────────
      const metadata = await getVideoMetadata(filePath);
      if (!metadata) throw new Error('Failed to read video metadata');

      const projectId = generateProjectId();
      const projectDir = getProjectDir(projectId);
      const projectName = metadata.file_name.replace(/\.[^.]+$/, '');

      logger.info('project', `Metadata OK: ${metadata.file_name} ${metadata.width}x${metadata.height} ${metadata.duration_ms}ms`);

      const sourceVideo: SourceVideo = {
        id: `source-${Date.now()}`,
        filePath: metadata.file_path,
        fileName: metadata.file_name,
        durationMs: metadata.duration_ms,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
        sizeBytes: metadata.size_bytes,
        proxyPath: null,
        audioPath: null,
      };

      // Cria projeto inicial — usuário já vê o editor
      let currentProject: VideoProject = {
        ...structuredClone(MOCK_PROJECT),
        id: projectId,
        name: projectName,
        state: 'IMPORTED',
        sourceVideo,
        transcript: null,
        semanticTimeline: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({ project: currentProject });
      get().sendEditorEvent({ type: 'PROJECT_LOADED' });
      get().sendEditorEvent({ type: 'START_EDITING' });

      // ── Step 2: Extrai áudio ──────────────────────────────────────
      set({ importProgress: 'Extracting audio...' });
      logger.info('project', 'Extracting audio...');

      const audioResult = await extractAudio(filePath, projectDir);

      if (audioResult) {
        logger.info('project', `Audio OK: ${audioResult.output_path}`);
        currentProject = {
          ...get().project!,
          state: 'AUDIO_EXTRACTED',
          sourceVideo: { ...sourceVideo, audioPath: audioResult.output_path },
        };
        set({ project: currentProject });
      }

      // ── Step 3: Proxy ─────────────────────────────────────────────
      set({ importProgress: 'Generating preview...' });
      logger.info('project', 'Generating proxy...');

      const proxyResult = await generateProxy(filePath, projectDir);

      if (proxyResult) {
        logger.info('project', `Proxy OK: ${proxyResult.output_path}`);
        currentProject = {
          ...get().project!,
          state: 'PROXY_GENERATED',
          sourceVideo: {
            ...get().project!.sourceVideo!,
            proxyPath: proxyResult.output_path,
          },
        };
        set({ project: currentProject });
      }

      // ── Step 4: Transcrição real ──────────────────────────────────
      const audioPath = get().project?.sourceVideo?.audioPath;

      if (audioPath) {
        set({ importProgress: 'Transcribing... (this may take a moment)', project: { ...get().project!, state: 'TRANSCRIBING' } });
        logger.info('project', 'Starting transcription...');

        // Verifica se engine está rodando
        const engineOk = await checkEngineHealth();

        if (!engineOk) {
          logger.info('project', 'Engine not running — keeping mock transcript');
          set({ importProgress: null });
        } else {
          const transcript = await transcribeAudio(projectId, audioPath, 'pt');

          if (transcript) {
            logger.info('project', `Transcription OK: ${transcript.segments.length} segments, ${transcript.segments.reduce((acc, s) => acc + s.words.length, 0)} words`);

            // Constrói timeline real a partir do transcript
            const timeline = buildInitialTimeline(transcript);

            currentProject = {
              ...get().project!,
              state: 'ALIGNED',
              transcript,
              semanticTimeline: timeline,
            };
            set({ project: currentProject });
          } else {
            logger.info('project', 'Transcription failed — keeping mock transcript');
            set({ project: { ...get().project!, state: 'TRANSCRIBED' } });
          }
        }
      }

      // ── Finaliza ──────────────────────────────────────────────────
      set({ isLoading: false, importProgress: null });
      get().saveNow('Video imported');
      logger.info('project', `Import complete: ${projectId} — ${projectName}`);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.info('project', `Import failed: ${message}`);
      set({ isLoading: false, importProgress: null, importError: message });
    }
  },

  // ─── Edit Actions ─────────────────────────────────────────────────

  removeWord: (wordId: string) => {
    const project = get().project;
    if (!project?.transcript) return;
    let wordText = '';
    for (const seg of project.transcript.segments) {
      const w = seg.words.find((w) => w.id === wordId);
      if (w) { wordText = w.word; break; }
    }
    get().executeCommand(createRemoveWordCommand(wordId, wordText));
  },

  removeSegment: (segmentId: string) => {
    const project = get().project;
    if (!project?.transcript) return;
    const seg = project.transcript.segments.find((s) => s.id === segmentId);
    get().executeCommand(createRemoveSegmentCommand(segmentId, seg?.text ?? ''));
  },

  rebuildTimeline: () => {
    const project = get().project;
    if (!project?.transcript || !project.semanticTimeline) return;

    const keptSegments = project.transcript.segments.filter(
      (seg) => seg.words.some((w) => !w.isRemoved)
    );
    let cursor = 0;
    const newCuts = keptSegments.map((seg) => {
      const keptWords = seg.words.filter((w) => !w.isRemoved);
      const duration = keptWords.reduce((sum, w) => sum + (w.endMs - w.startMs), 0);
      const cut: TimelineCut = {
        id: `cut-${seg.id}`,
        startMs: cursor,
        endMs: cursor + duration,
        type: 'keep',
        sourceSegmentId: seg.id,
        label: keptWords.map((w) => w.word).join(' ').slice(0, 40) + '…',
      };
      cursor += duration + 50;
      return cut;
    });

    logger.info('timeline', `Rebuilt: ${newCuts.length} cuts, ${Math.round(cursor / 1000)}s`);
    set({
      project: {
        ...project,
        semanticTimeline: {
          ...project.semanticTimeline,
          cuts: newCuts,
          totalDurationMs: cursor,
        },
      },
    });
    get().markDirty();
  },

  applyPreset: (preset: StylePreset) => {
    const project = get().project;
    if (!project) return;
    get().executeCommand(createApplyPresetCommand(preset, project.appliedPreset));
  },

  setState: (state: PipelineState) => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, state } });
  },

  // ─── Captions ─────────────────────────────────────────────────────

  generateCaptions: () => {
    const project = get().project;
    if (!project) return;
    get().executeCommand(createUpdateCaptionsCommand(MOCK_CAPTION_TRACK, project.captionTrack));
    logger.info('captions', 'Captions generated (MOCK)');
  },

  updateCaptionStyle: (style: CaptionStyle) => {
    const project = get().project;
    if (!project?.captionTrack) return;
    get().executeCommand(createUpdateCaptionStyleCommand(style, project.captionTrack.style));
  },

  // ─── B-Roll ───────────────────────────────────────────────────────

  generateBrollCues: () => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, state: 'BROLL_READY', brollCues: MOCK_BROLL_CUES } });
    get().markDirty();
    logger.info('broll', 'B-Roll cues generated (MOCK)');
  },

  // ─── Jobs ─────────────────────────────────────────────────────────

  enqueueJob: (type: ProcessingJob['type']) => enqueueJob(type),
  cancelJob: (id: string) => cancelJob(id),
  retryJob: (id: string) => retryJob(id),

  simulateExport: () => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, state: 'EXPORTING' } });
    const jobId = enqueueJob('export', 'Export video');
    logger.info('export', `Export started (MOCK), job: ${jobId}`);
  },
}));
