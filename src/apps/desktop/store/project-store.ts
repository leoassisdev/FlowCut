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

function buildInitialTimeline(transcript: Transcript): SemanticTimeline {
  let totalDurationMs = 0;
  
  const cuts: TimelineCut[] = transcript.segments.map((seg) => {
    const cut: TimelineCut = {
      id: `cut-${seg.id}`,
      startMs: seg.startMs,
      endMs: seg.endMs,
      type: 'keep',
      sourceSegmentId: seg.id,
      label: seg.text.slice(0, 40) + (seg.text.length > 40 ? '…' : ''),
    };
    totalDurationMs += (seg.endMs - seg.startMs);
    return cut;
  });

  return {
    id: `timeline-${transcript.id}`,
    cuts,
    totalDurationMs,
    originalDurationMs: totalDurationMs,
  };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface ProjectStore {
  project: VideoProject | null;
  isLoading: boolean;
  importError: string | null;
  importProgress: string | null;

  isRebuilding: boolean;
  rebuildProgress: number;

  // NOVO: Controle de tempo de reprodução para sync com o texto
  currentPlaybackMs: number;
  setCurrentPlaybackMs: (ms: number) => void;

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
  toggleWordRemoval: (wordId: string) => void; // NOVO: Função para riscar/desriscar
  removeSegment: (segmentId: string) => void;
  
  rebuildTimeline: () => Promise<void>;
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

  isRebuilding: false,
  rebuildProgress: 0,

  currentPlaybackMs: 0,
  setCurrentPlaybackMs: (ms: number) => set({ currentPlaybackMs: ms }),

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
    setTimeout(() => {
      set({ project: structuredClone(MOCK_PROJECT), isLoading: false });
      get().sendEditorEvent({ type: 'PROJECT_LOADED' });
      get().sendEditorEvent({ type: 'START_EDITING' });
      get().saveNow('Initial load');
    }, 300);
  },

  importVideoFromPath: async (filePath: string) => {
    set({ isLoading: true, importError: null, importProgress: 'Reading metadata...' });
    get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: 'new' });

    try {
      const metadata = await getVideoMetadata(filePath);
      if (!metadata) throw new Error('Failed to read video metadata');

      const projectId = generateProjectId();
      const projectDir = getProjectDir(projectId);
      const projectName = metadata.file_name.replace(/\.[^.]+$/, '');

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

      set({ importProgress: 'Extracting audio...' });
      const audioResult = await extractAudio(filePath, projectDir);

      if (audioResult) {
        currentProject = {
          ...get().project!,
          state: 'AUDIO_EXTRACTED',
          sourceVideo: { ...sourceVideo, audioPath: audioResult.output_path },
        };
        set({ project: currentProject });
      }

      set({ importProgress: 'Generating preview...' });
      const proxyResult = await generateProxy(filePath, projectDir);

      if (proxyResult) {
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

      const audioPath = get().project?.sourceVideo?.audioPath;

      if (audioPath) {
        set({ importProgress: 'Transcribing... (this may take a moment)', project: { ...get().project!, state: 'TRANSCRIBING' } });
        
        const engineOk = await checkEngineHealth();

        if (!engineOk) {
          set({ importProgress: null });
        } else {
          const transcript = await transcribeAudio(projectId, audioPath, 'pt');

          if (transcript) {
            const timeline = buildInitialTimeline(transcript);

            currentProject = {
              ...get().project!,
              state: 'ALIGNED',
              transcript,
              semanticTimeline: timeline,
            };
            set({ project: currentProject });
          } else {
            set({ project: { ...get().project!, state: 'TRANSCRIBED' } });
          }
        }
      }

      set({ isLoading: false, importProgress: null });
      get().saveNow('Video imported');

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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

  // NOVO: Função que permite clicar para riscar e clicar para voltar ao normal!
  toggleWordRemoval: (wordId: string) => {
    const project = get().project;
    if (!project?.transcript) return;

    const newProject = structuredClone(project);
    let found = false;

    for (const seg of newProject.transcript.segments) {
      const w = seg.words.find(w => w.id === wordId);
      if (w) {
        w.isRemoved = !w.isRemoved; // Inverte o estado (riscado/não riscado)
        found = true;
        break;
      }
    }

    if (found) {
      set({ project: newProject });
      get().markDirty();
    }
  },

  removeSegment: (segmentId: string) => {
    const project = get().project;
    if (!project?.transcript) return;
    const seg = project.transcript.segments.find((s) => s.id === segmentId);
    get().executeCommand(createRemoveSegmentCommand(segmentId, seg?.text ?? ''));
  },

  rebuildTimeline: async () => {
    const project = get().project;
    if (!project?.transcript || !project.semanticTimeline) return;

    set({ isRebuilding: true, rebuildProgress: 0 });
    for (let i = 1; i <= 10; i++) {
      await new Promise(r => setTimeout(r, 40));
      set({ rebuildProgress: i * 10 });
    }

    const newCuts: TimelineCut[] = [];
    let currentCut: TimelineCut | null = null;
    let totalDurationMs = 0;

    project.transcript.segments.forEach((seg) => {
      seg.words.forEach((w) => {
        if (!w.isRemoved) {
          if (!currentCut) {
            currentCut = { id: `cut-${w.id}`, startMs: w.startMs, endMs: w.endMs, type: 'keep', sourceSegmentId: seg.id, label: w.word };
          } else {
            currentCut.endMs = w.endMs;
            currentCut.label += ` ${w.word}`;
          }
        } else {
          if (currentCut) {
            if (currentCut.label.length > 40) currentCut.label = currentCut.label.slice(0, 40) + '…';
            newCuts.push(currentCut);
            totalDurationMs += (currentCut.endMs - currentCut.startMs);
            currentCut = null;
          }
        }
      });
    });

    if (currentCut) {
      const finalCut = currentCut as TimelineCut;
      if (finalCut.label.length > 40) finalCut.label = finalCut.label.slice(0, 40) + '…';
      newCuts.push(finalCut);
      totalDurationMs += (finalCut.endMs - finalCut.startMs);
    }

    set({
      project: {
        ...project,
        semanticTimeline: {
          ...project.semanticTimeline,
          cuts: newCuts,
          totalDurationMs,
        },
      },
    });
    get().markDirty();

    set({ isRebuilding: false, rebuildProgress: 100 });
    setTimeout(() => set({ rebuildProgress: 0 }), 300);
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
  },

  updateCaptionStyle: (style: CaptionStyle) => {
    const project = get().project;
    if (!project?.captionTrack) return;
    get().executeCommand(createUpdateCaptionStyleCommand(style, project.captionTrack.style));
  },

  generateBrollCues: () => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, state: 'BROLL_READY', brollCues: MOCK_BROLL_CUES } });
    get().markDirty();
  },

  enqueueJob: (type: ProcessingJob['type']) => enqueueJob(type),
  cancelJob: (id: string) => cancelJob(id),
  retryJob: (id: string) => retryJob(id),

  simulateExport: () => {
    const project = get().project;
    if (!project) return;
    set({ project: { ...project, state: 'EXPORTING' } });
    enqueueJob('export', 'Export video');
  },
}));