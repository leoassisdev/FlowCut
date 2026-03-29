/**
 * @module project-store
 * Zustand store for the active VideoProject.
 */

import { create } from 'zustand';
import type {
  VideoProject, PipelineState, StylePreset,
  ProcessingJob, CaptionStyle, SourceVideo, Transcript,
  SemanticTimeline, TimelineCut,
} from '@/packages/shared-types';
import { MOCK_PROJECT, MOCK_BROLL_CUES, MOCK_CAPTION_TRACK } from '@/apps/desktop/mocks/mock-data';
import { getVideoMetadata, extractAudio, generateProxy, generateThumbnails, detectSilences } from '@/apps/desktop/services/tauri-bridge';
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
import { enqueueJob, cancelJob, retryJob } from '@/apps/desktop/core/job-queue';

const autosaveDebounce = createAutosaveDebounce(3000);

function generateProjectId(): string { return `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function getProjectDir(projectId: string): string { return `/tmp/flowcut/projects/${projectId}`; }

function buildInitialTimeline(transcript: Transcript, videoDurationMs: number): SemanticTimeline {
  const cuts: TimelineCut[] = [{
    id: 'cut-full-video',
    startMs: 0,
    endMs: videoDurationMs,
    type: 'keep',
    sourceSegmentId: 'full',
    label: 'Vídeo Completo',
  }];
  return {
    id: `timeline-${transcript.id}`,
    cuts,
    totalDurationMs: videoDurationMs,
    originalDurationMs: videoDurationMs,
  };
}

interface SourceVideoExtended extends SourceVideo {
  thumbsDir?: string | null;
}

interface ProjectStore {
  project: (VideoProject & { sourceVideo: SourceVideoExtended }) | null;
  isLoading: boolean;
  importError: string | null;
  importProgress: string | null;

  isRebuilding: boolean;
  rebuildProgress: number;
  
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  currentPlaybackMs: number;
  setCurrentPlaybackMs: (ms: number) => void;
  seekRequestMs: number | null;
  requestSeek: (ms: number) => void;
  
  silenceNoiseDb: number;
  setSilenceNoiseDb: (db: number) => void;
  silenceMinDuration: number;
  setSilenceMinDuration: (d: number) => void;
  applyCrossfade: boolean;
  setApplyCrossfade: (apply: boolean) => void;

  masterVolume: number;
  setMasterVolume: (vol: number) => void;
  setCutVolume: (cutId: string, vol: number) => void;

  activeTool: 'selection' | 'blade';
  setActiveTool: (tool: 'selection' | 'blade') => void;
  selectedCutId: string | null;
  setSelectedCutId: (id: string | null) => void;
  
  updateCutBounds: (cutId: string, newStartMs: number, newEndMs: number) => void;
  splitCut: (timeMs: number) => void;
  rippleTrim: (timeMs: number, direction: 'left' | 'right') => void;
  deleteCut: (cutId: string) => void;
  restoreTimeline: () => void;

  editorMachine: EditorMachineState;
  sendEditorEvent: (event: EditorEvent) => void;
  commandHistory: CommandHistory;
  executeCommand: (command: Command) => void;
  undo: () => void; redo: () => void; canUndo: () => boolean; canRedo: () => boolean;
  autosave: AutosaveState; markDirty: () => void; saveNow: (label?: string) => void; restoreFromSnapshot: (snapshotId: string) => void;
  loadProject: (id: string) => void;
  importVideoFromPath: (filePath: string) => Promise<void>;
  removeWord: (wordId: string) => void;
  toggleWordRemoval: (wordId: string) => void;
  removeSegment: (segmentId: string) => void;
  rebuildTimeline: () => Promise<void>;
  applyAutoCut: () => Promise<void>;
  applyPreset: (preset: StylePreset) => void;
  setState: (state: PipelineState) => void;
  generateCaptions: () => void;
  updateCaptionStyle: (style: CaptionStyle) => void;
  generateBrollCues: () => void;
  enqueueJob: (type: ProcessingJob['type']) => string; cancelJob: (id: string) => void; retryJob: (id: string) => void; simulateExport: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null, isLoading: false, importError: null, importProgress: null,
  isRebuilding: false, rebuildProgress: 0, 
  
  isPlaying: false,
  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  currentPlaybackMs: 0,
  setCurrentPlaybackMs: (ms: number) => set({ currentPlaybackMs: ms }),
  seekRequestMs: null,
  requestSeek: (ms: number) => set({ seekRequestMs: ms }),
  
  silenceNoiseDb: -20,
  setSilenceNoiseDb: (db: number) => set({ silenceNoiseDb: db }),
  silenceMinDuration: 0.3,
  setSilenceMinDuration: (d: number) => set({ silenceMinDuration: d }),
  applyCrossfade: true,
  setApplyCrossfade: (apply: boolean) => { set({ applyCrossfade: apply }); get().markDirty(); },

  masterVolume: 1.0,
  setMasterVolume: (vol: number) => { set({ masterVolume: vol }); get().markDirty(); },
  
  setCutVolume: (cutId: string, vol: number) => {
    const project = get().project; if (!project?.semanticTimeline) return;
    const cuts = project.semanticTimeline.cuts.map(c => 
      c.id === cutId ? { ...c, volume: vol } : c
    );
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts } } }); get().markDirty();
  },

  activeTool: 'selection',
  setActiveTool: (tool) => set({ activeTool: tool }),
  selectedCutId: null,
  setSelectedCutId: (id) => set({ selectedCutId: id }),

  updateCutBounds: (cutId, newStartMs, newEndMs) => {
    const project = get().project; if (!project?.semanticTimeline) return;
    const cuts = project.semanticTimeline.cuts.map(c => 
      c.id === cutId ? { ...c, startMs: Math.max(0, newStartMs), endMs: Math.max(newStartMs + 100, newEndMs) } : c
    );
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts } } }); get().markDirty();
  },

  splitCut: (timeMs) => {
    const project = get().project; if (!project?.semanticTimeline) return;
    const cuts = [...project.semanticTimeline.cuts];
    const idx = cuts.findIndex(c => timeMs > c.startMs && timeMs < c.endMs);
    if (idx === -1) return;
    
    const target = cuts[idx];
    const vol = (target as any).volume ?? 1.0;
    const cutA: TimelineCut & { volume: number } = { ...target, id: `${target.id}-a`, endMs: timeMs, volume: vol };
    const cutB: TimelineCut & { volume: number } = { ...target, id: `${target.id}-b`, startMs: timeMs, volume: vol };
    
    cuts.splice(idx, 1, cutA, cutB);
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts } } }); get().markDirty();
  },

  rippleTrim: (timeMs, direction) => {
    const project = get().project; if (!project?.semanticTimeline) return;
    const cuts = [...project.semanticTimeline.cuts];
    const targetId = get().selectedCutId;
    
    let idx = -1;
    if (targetId) { idx = cuts.findIndex(c => c.id === targetId); } 
    else { idx = cuts.findIndex(c => timeMs >= c.startMs && timeMs <= c.endMs); }
    
    if (idx === -1) return;

    if (direction === 'left') cuts[idx].startMs = timeMs;
    else cuts[idx].endMs = timeMs;
    
    if (cuts[idx].startMs >= cuts[idx].endMs) { cuts.splice(idx, 1); set({ selectedCutId: null }); }
    
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts } } }); get().markDirty();
  },

  deleteCut: (cutId) => {
    const project = get().project; if (!project?.semanticTimeline) return;
    const cuts = project.semanticTimeline.cuts.filter(c => c.id !== cutId);
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts } }, selectedCutId: null });
    get().markDirty();
  },

  restoreTimeline: () => {
    const project = get().project; if (!project?.sourceVideo) return;
    const originalMs = project.sourceVideo.durationMs;
    const cuts: TimelineCut[] = [{
      id: `cut-restore-${Date.now()}`, startMs: 0, endMs: originalMs,
      type: 'keep', sourceSegmentId: 'restored', label: 'Vídeo Original Restaurado',
    }];
    set({ project: { ...project, semanticTimeline: { ...project.semanticTimeline, cuts, totalDurationMs: originalMs } } });
    get().markDirty();
  },

  editorMachine: createEditorMachine(), commandHistory: createCommandHistory(), autosave: createAutosaveState(),

  sendEditorEvent: (event: EditorEvent) => {
    const machine = get().editorMachine; if (canTransition(machine, event)) set({ editorMachine: transition(machine, event) });
  },

  executeCommand: (command: Command) => {
    const project = get().project; if (!project) return;
    set({ project: command.execute(project) as any, commandHistory: pushCommand(get().commandHistory, command) }); get().markDirty();
  },

  undo: () => {
    const { history, command } = undoCommand(get().commandHistory); if (!command || !get().project) return;
    set({ project: command.undo(get().project!) as any, commandHistory: history }); get().markDirty();
  },

  redo: () => {
    const { history, command } = redoCommand(get().commandHistory); if (!command || !get().project) return;
    set({ project: command.execute(get().project!) as any, commandHistory: history }); get().markDirty();
  },

  canUndo: () => canUndo(get().commandHistory), canRedo: () => canRedo(get().commandHistory),

  markDirty: () => { set({ autosave: { ...get().autosave, isDirty: true } }); autosaveDebounce.trigger(() => get().saveNow('Autosave')); },
  saveNow: (label = 'Manual save') => { const project = get().project; if (project) set({ autosave: saveSnapshot(get().autosave, project, label) }); },
  restoreFromSnapshot: (snapshotId: string) => {
    const { state, project } = restoreSnapshot(get().autosave, snapshotId);
    if (project) set({ autosave: state, project: project as any, commandHistory: createCommandHistory() });
  },

  loadProject: (id: string) => {
    set({ isLoading: true }); get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: id });
    setTimeout(() => {
      set({ project: structuredClone(MOCK_PROJECT) as any, isLoading: false });
      get().sendEditorEvent({ type: 'PROJECT_LOADED' }); get().sendEditorEvent({ type: 'START_EDITING' }); get().saveNow('Initial load');
    }, 300);
  },

  importVideoFromPath: async (filePath: string) => {
    set({ isLoading: true, importError: null, importProgress: 'Lendo metadados do vídeo...' });
    get().sendEditorEvent({ type: 'LOAD_PROJECT', projectId: 'new' });
    try {
      const metadata = await getVideoMetadata(filePath);
      if (!metadata) throw new Error('Falha ao ler o vídeo.');
      const projectId = generateProjectId(); const projectDir = getProjectDir(projectId);
      const projectName = metadata.file_name.replace(/\.[^.]+$/, '');
      const sourceVideo: SourceVideoExtended = {
        id: `source-${Date.now()}`, filePath: metadata.file_path, fileName: metadata.file_name, durationMs: metadata.duration_ms, width: metadata.width, height: metadata.height, fps: metadata.fps, codec: metadata.codec, sizeBytes: metadata.size_bytes, proxyPath: null, audioPath: null, thumbsDir: null,
      };
      let currentProject: any = { ...structuredClone(MOCK_PROJECT), id: projectId, name: projectName, state: 'IMPORTED', sourceVideo, transcript: null, semanticTimeline: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      set({ project: currentProject }); get().sendEditorEvent({ type: 'PROJECT_LOADED' }); get().sendEditorEvent({ type: 'START_EDITING' });

      set({ importProgress: 'Extraindo áudio para análise...' });
      const audioResult = await extractAudio(filePath, projectDir);
      if (audioResult) { currentProject = { ...get().project!, state: 'AUDIO_EXTRACTED', sourceVideo: { ...sourceVideo, audioPath: audioResult.output_path } }; set({ project: currentProject }); }

      set({ importProgress: 'Gerando miniaturas da timeline (NLE Mode)...' });
      const thumbsResult = await generateThumbnails(filePath, projectDir);
      if (thumbsResult) { currentProject = { ...get().project!, sourceVideo: { ...get().project!.sourceVideo, thumbsDir: thumbsResult.output_path } }; set({ project: currentProject }); }

      set({ importProgress: 'Gerando vídeo proxy...' });
      const proxyResult = await generateProxy(filePath, projectDir);
      if (proxyResult) { currentProject = { ...get().project!, state: 'PROXY_GENERATED', sourceVideo: { ...get().project!.sourceVideo!, proxyPath: proxyResult.output_path } }; set({ project: currentProject }); }

      const audioPath = get().project?.sourceVideo?.audioPath;
      if (audioPath) {
        set({ importProgress: 'Transcrevendo áudio via Whisper (Isso pode demorar)...', project: { ...get().project!, state: 'TRANSCRIBING' } });
        const engineOk = await checkEngineHealth();
        if (!engineOk) { set({ importProgress: null }); } else {
          const transcript = await transcribeAudio(projectId, audioPath, 'pt');
          if (transcript) {
            const videoDurationMs = get().project!.sourceVideo!.durationMs;
            currentProject = { ...get().project!, state: 'ALIGNED', transcript, semanticTimeline: buildInitialTimeline(transcript, videoDurationMs) };
            set({ project: currentProject });
          } else { set({ project: { ...get().project!, state: 'TRANSCRIBED' } }); }
        }
      }
      set({ isLoading: false, importProgress: null }); get().saveNow('Video imported');
    } catch (error) { set({ isLoading: false, importProgress: null, importError: String(error) }); }
  },

  removeWord: (wordId: string) => {
    const project = get().project; if (!project?.transcript) return;
    let wordText = '';
    for (const seg of project.transcript.segments) { const w = seg.words.find((w) => w.id === wordId); if (w) { wordText = w.word; break; } }
    get().executeCommand(createRemoveWordCommand(wordId, wordText));
  },

  toggleWordRemoval: (wordId: string) => {
    const project = get().project; if (!project?.transcript) return;
    const newProject = structuredClone(project); let found = false;
    for (const seg of newProject.transcript.segments) {
      const w = seg.words.find(w => w.id === wordId);
      if (w) { w.isRemoved = !w.isRemoved; found = true; break; }
    }
    if (found) { set({ project: newProject as any }); get().markDirty(); }
  },

  removeSegment: (segmentId: string) => {
    const project = get().project; if (!project?.transcript) return;
    const seg = project.transcript.segments.find((s) => s.id === segmentId);
    get().executeCommand(createRemoveSegmentCommand(segmentId, seg?.text ?? ''));
  },

  // ─── REBUILD: Reconstrói timeline baseada nas palavras riscadas ───
  rebuildTimeline: async () => {
    const project = get().project;
    if (!project?.transcript || !project.semanticTimeline) return;

    set({ isRebuilding: true, rebuildProgress: 0 });

    const originalDurationMs = project.sourceVideo?.durationMs ?? project.semanticTimeline.originalDurationMs;
    const allWords = project.transcript.segments.flatMap(s => s.words).filter(w => !w.isRemoved);
    
    if (allWords.length === 0) {
      set({ isRebuilding: false, rebuildProgress: 100 });
      setTimeout(() => set({ rebuildProgress: 0 }), 300);
      return;
    }

    allWords.sort((a, b) => a.startMs - b.startMs);

    const newCuts: TimelineCut[] = [];
    let currentCutStart = allWords[0].startMs;
    let currentCutEnd = allWords[0].endMs;
    let currentLabel = allWords[0].word;
    let totalDurationMs = 0;
    let cutIndex = 0;

    // Agrupa palavras consecutivas em cortes (gap > 300ms = novo corte)
    for (let i = 1; i < allWords.length; i++) {
      const w = allWords[i];
      const gap = w.startMs - currentCutEnd;

      if (gap > 300) {
        const label = currentLabel.length > 40 ? currentLabel.slice(0, 40) + '…' : currentLabel;
        newCuts.push({ id: `cut-rebuild-${cutIndex++}`, startMs: currentCutStart, endMs: currentCutEnd, type: 'keep', sourceSegmentId: 'rebuild', label } as TimelineCut);
        totalDurationMs += (currentCutEnd - currentCutStart);
        currentCutStart = w.startMs;
        currentCutEnd = w.endMs;
        currentLabel = w.word;
      } else {
        currentCutEnd = w.endMs;
        currentLabel += ` ${w.word}`;
      }

      if (i % Math.max(1, Math.floor(allWords.length / 10)) === 0) {
        set({ rebuildProgress: Math.round((i / allWords.length) * 90) });
        await new Promise(r => setTimeout(r, 5));
      }
    }
    
    const lastLabel = currentLabel.length > 40 ? currentLabel.slice(0, 40) + '…' : currentLabel;
    newCuts.push({ id: `cut-rebuild-${cutIndex}`, startMs: currentCutStart, endMs: currentCutEnd, type: 'keep', sourceSegmentId: 'rebuild', label: lastLabel } as TimelineCut);
    totalDurationMs += (currentCutEnd - currentCutStart);

    set({
      project: {
        ...project,
        semanticTimeline: { ...project.semanticTimeline, cuts: newCuts, totalDurationMs, originalDurationMs },
      },
    });
    get().markDirty();
    set({ isRebuilding: false, rebuildProgress: 100 });
    setTimeout(() => set({ rebuildProgress: 0 }), 300);
  },

  // ─── AUTO-CUT: Noise gate real via FFmpeg silencedetect ───
  applyAutoCut: async () => {
    const project = get().project;
    if (!project?.semanticTimeline || !project.sourceVideo) return;

    const filePath = project.sourceVideo.filePath;
    if (!filePath) return;

    set({ isRebuilding: true, rebuildProgress: 10 });

    const noiseDb = get().silenceNoiseDb;
    const minDuration = get().silenceMinDuration;
    const videoDurationMs = project.sourceVideo.durationMs;
    const originalDurationMs = project.semanticTimeline.originalDurationMs || videoDurationMs;
    const existingCuts = project.semanticTimeline.cuts;

    // Chama o Rust que roda ffmpeg silencedetect no arquivo original
    const result = await detectSilences(filePath, noiseDb, minDuration);

    if (!result || result.silences.length === 0) {
      // Nenhum silêncio detectado — mantém os cortes como estão
      set({ isRebuilding: false, rebuildProgress: 100 });
      setTimeout(() => set({ rebuildProgress: 0 }), 300);
      return;
    }

    set({ rebuildProgress: 60 });

    // Para cada corte existente, remove os trechos de silêncio que caem dentro dele
    const newCuts: TimelineCut[] = [];
    let cutIndex = 0;
    let totalKeptMs = 0;

    for (const cut of existingCuts) {
      // Encontra silêncios que se sobrepõem a este corte
      const overlappingSilences = result.silences.filter(
        s => s.start_ms < cut.endMs && s.end_ms > cut.startMs
      );

      if (overlappingSilences.length === 0) {
        // Nenhum silêncio neste corte — mantém inteiro
        newCuts.push({ ...cut, id: `cut-ac-${cutIndex++}` });
        totalKeptMs += (cut.endMs - cut.startMs);
        continue;
      }

      // Percorre o corte e pula os silêncios
      let cursor = cut.startMs;

      for (const silence of overlappingSilences) {
        const silStart = Math.max(silence.start_ms, cut.startMs);
        const silEnd = Math.min(silence.end_ms, cut.endMs);

        if (cursor < silStart) {
          // Trecho de fala antes do silêncio
          newCuts.push({
            id: `cut-ac-${cutIndex++}`,
            startMs: cursor,
            endMs: silStart,
            type: 'keep',
            sourceSegmentId: cut.sourceSegmentId,
            label: cut.label,
          } as TimelineCut);
          totalKeptMs += (silStart - cursor);
        }
        cursor = silEnd;
      }

      // Trecho de fala depois do último silêncio
      if (cursor < cut.endMs) {
        newCuts.push({
          id: `cut-ac-${cutIndex++}`,
          startMs: cursor,
          endMs: cut.endMs,
          type: 'keep',
          sourceSegmentId: cut.sourceSegmentId,
          label: cut.label,
        } as TimelineCut);
        totalKeptMs += (cut.endMs - cursor);
      }
    }

    set({
      project: {
        ...project,
        semanticTimeline: { ...project.semanticTimeline, cuts: newCuts, totalDurationMs: totalKeptMs, originalDurationMs },
      },
    });
    get().markDirty();
    set({ isRebuilding: false, rebuildProgress: 100 });
    setTimeout(() => set({ rebuildProgress: 0 }), 300);
  },

  applyPreset: (preset: StylePreset) => { const project = get().project; if (!project) return; get().executeCommand(createApplyPresetCommand(preset, project.appliedPreset)); },
  setState: (state: PipelineState) => { const project = get().project; if (!project) return; set({ project: { ...project, state } as any }); },
  generateCaptions: () => { const project = get().project; if (!project) return; get().executeCommand(createUpdateCaptionsCommand(MOCK_CAPTION_TRACK, project.captionTrack)); },
  updateCaptionStyle: (style: CaptionStyle) => { const project = get().project; if (!project?.captionTrack) return; get().executeCommand(createUpdateCaptionStyleCommand(style, project.captionTrack.style)); },
  generateBrollCues: () => { const project = get().project; if (!project) return; set({ project: { ...project, state: 'BROLL_READY', brollCues: MOCK_BROLL_CUES } as any }); get().markDirty(); },
  enqueueJob: (type: ProcessingJob['type']) => enqueueJob(type), cancelJob: (id: string) => cancelJob(id), retryJob: (id: string) => retryJob(id),
  simulateExport: () => { const project = get().project; if (!project) return; set({ project: { ...project, state: 'EXPORTING' } as any }); enqueueJob('export', 'Export video'); },
}));