/**
 * @module project-store
 * Zustand store for the active VideoProject.
 * Integrates command system, undo/redo, autosave, editor state machine, and job queue.
 */

import { create } from 'zustand';
import type { VideoProject, PipelineState, StylePreset, ProcessingJob, CaptionStyle, SourceVideo } from '@/packages/shared-types';
import { MOCK_PROJECT, MOCK_BROLL_CUES, MOCK_CAPTION_TRACK } from '@/apps/desktop/mocks/mock-data';
import { getVideoMetadata } from '@/apps/desktop/services/tauri-bridge';
import {
  type CommandHistory,
  createCommandHistory,
  pushCommand,
  undoCommand,
  redoCommand,
  canUndo,
  canRedo,
  createRemoveWordCommand,
  createRemoveSegmentCommand,
  createApplyPresetCommand,
  createUpdateCaptionsCommand,
  createUpdateCaptionStyleCommand,
  type Command,
} from '@/apps/desktop/core/command-system';
import {
  type EditorMachineState,
  createEditorMachine,
  transition,
  canTransition,
  type EditorEvent,
} from '@/apps/desktop/core/editor-state-machine';
import {
  type AutosaveState,
  createAutosaveState,
  saveSnapshot,
  restoreSnapshot,
  createAutosaveDebounce,
} from '@/apps/desktop/core/autosave';
import { logger } from '@/apps/desktop/core/logger';
import { enqueueJob, cancelJob, retryJob } from '@/apps/desktop/core/job-queue';

const autosaveDebounce = createAutosaveDebounce(3000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface ProjectStore {
  // ─── Project State ──────────────
  project: VideoProject | null;
  isLoading: boolean;
  importError: string | null;

  // ─── Editor State Machine ──────
  editorMachine: EditorMachineState;
  sendEditorEvent: (event: EditorEvent) => void;

  // ─── Command History (Undo/Redo) ──
  commandHistory: CommandHistory;
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // ─── Autosave ──────────────────
  autosave: AutosaveState;
  markDirty: () => void;
  saveNow: (label?: string) => void;
  restoreFromSnapshot: (snapshotId: string) => void;

  // ─── Project Actions ───────────
  loadProject: (id: string) => void;
  importVideoFromPath: (filePath: string) => Promise<void>;
  removeWord: (wordId: string) => void;
  removeSegment: (segmentId: string) => void;
  rebuildTimeline: () => void;
  applyPreset: (preset: StylePreset) => void;
  setState: (state: PipelineState) => void;

  // ─── Captions ──────────────────
  generateCaptions: () => void;
  updateCaptionStyle: (style: CaptionStyle) => void;

  // ─── B-Roll ────────────────────
  generateBrollCues: () => void;

  // ─── Jobs ──────────────────────
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
      logger.warn('editor-sm', `Blocked transition: ${machine.state} + ${event.type}`);
    }
  },

  // ─── Command System / Undo-Redo ───────────────────────────────────

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
    autosaveDebounce.trigger(() => {
      get().saveNow('Autosave');
    });
  },

  saveNow: (label = 'Manual save') => {
    const project = get().project;
    if (!project) return;
    const newState = saveSnapshot(get().autosave, project, label);
    set({ autosave: newState });
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
   * Importa um vídeo real a partir do path selecionado pelo file picker.
   * Lê metadados reais via ffprobe (Tauri/Rust).
   * Cria um VideoProject real com SourceVideo populado com dados do arquivo.
   * O transcript ainda é mock — será substituído quando a transcrição for implementada.
   */
  importVideoFromPath: async (filePath: string) => {
    set({ isLoading: true, importError: null });
    get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: 'new' });
    logger.info('project', `Importing video from: ${filePath}`);

    try {
      // Lê metadados reais do arquivo via Tauri/ffprobe
      const metadata = await getVideoMetadata(filePath);

      if (!metadata) {
        throw new Error('Failed to read video metadata');
      }

      logger.info('project', `Metadata read: ${metadata.file_name} ${metadata.width}x${metadata.height} ${metadata.duration_ms}ms`);

      // Monta o SourceVideo com dados reais
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
        proxyPath: null,   // será gerado pela engine local futuramente
        audioPath: null,   // será extraído pela engine local futuramente
      };

      const projectId = generateProjectId();
      const projectName = metadata.file_name.replace(/\.[^.]+$/, '');

      // Cria o projeto com SourceVideo real + transcript mock
      // O transcript mock será substituído quando Whisper for integrado
      const newProject: VideoProject = {
        ...structuredClone(MOCK_PROJECT),
        id: projectId,
        name: projectName,
        state: 'IMPORTED',
        sourceVideo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({ project: newProject, isLoading: false });
      get().sendEditorEvent({ type: 'PROJECT_LOADED' });
      get().sendEditorEvent({ type: 'START_EDITING' });
      get().saveNow('Video imported');

      logger.info('project', `Project created: ${projectId} — ${projectName} (${metadata.width}x${metadata.height}, ${Math.round(metadata.duration_ms / 1000)}s)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.info('project', `Import failed: ${message}`);
      set({ isLoading: false, importError: message });
      get().sendEditorEvent({ type: 'LOAD_FAILED' } as any);
    }
  },

  removeWord: (wordId: string) => {
    const project = get().project;
    if (!project?.transcript) return;
    let wordText = '';
    for (const seg of project.transcript.segments) {
      const w = seg.words.find((w) => w.id === wordId);
      if (w) { wordText = w.word; break; }
    }
    const command = createRemoveWordCommand(wordId, wordText);
    get().executeCommand(command);
  },

  removeSegment: (segmentId: string) => {
    const project = get().project;
    if (!project?.transcript) return;
    const seg = project.transcript.segments.find((s) => s.id === segmentId);
    const command = createRemoveSegmentCommand(segmentId, seg?.text ?? '');
    get().executeCommand(command);
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
      const cut = {
        id: `cut-${seg.id}`,
        startMs: cursor,
        endMs: cursor + duration,
        type: 'keep' as const,
        sourceSegmentId: seg.id,
        label: keptWords.map((w) => w.word).join(' ').slice(0, 40) + '…',
      };
      cursor += duration + 50;
      return cut;
    });

    logger.info('timeline', `Rebuilt: ${newCuts.length} cuts, ${Math.round(cursor / 1000)}s total`);
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
    const command = createApplyPresetCommand(preset, project.appliedPreset);
    get().executeCommand(command);
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
    const command = createUpdateCaptionsCommand(MOCK_CAPTION_TRACK, project.captionTrack);
    get().executeCommand(command);
    logger.info('captions', 'Captions generated (MOCK)');
  },

  updateCaptionStyle: (style: CaptionStyle) => {
    const project = get().project;
    if (!project?.captionTrack) return;
    const command = createUpdateCaptionStyleCommand(style, project.captionTrack.style);
    get().executeCommand(command);
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
