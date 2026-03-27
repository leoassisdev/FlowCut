/**
 * @module command-system
 * Command pattern for editor actions with undo/redo support.
 * All editor mutations go through commands to enable history tracking.
 */

import type { VideoProject, StylePreset, CaptionTrack, CaptionStyle } from '@/packages/shared-types';

// ─── Command Types ──────────────────────────────────────────────────

export type CommandType =
  | 'REMOVE_WORD'
  | 'REMOVE_SEGMENT'
  | 'RESTORE_WORD'
  | 'APPLY_PRESET'
  | 'UPDATE_CAPTIONS'
  | 'UPDATE_CAPTION_STYLE'
  | 'REBUILD_TIMELINE';

export interface Command {
  id: string;
  type: CommandType;
  label: string;
  timestamp: number;
  execute: (project: VideoProject) => VideoProject;
  undo: (project: VideoProject) => VideoProject;
}

// ─── Command History ────────────────────────────────────────────────

export interface CommandHistory {
  undoStack: Command[];
  redoStack: Command[];
  maxSize: number;
}

export function createCommandHistory(maxSize = 100): CommandHistory {
  return { undoStack: [], redoStack: [], maxSize };
}

export function pushCommand(history: CommandHistory, command: Command): CommandHistory {
  const undoStack = [...history.undoStack, command].slice(-history.maxSize);
  return { ...history, undoStack, redoStack: [] }; // Clear redo on new command
}

export function undoCommand(history: CommandHistory): { history: CommandHistory; command: Command | null } {
  if (history.undoStack.length === 0) return { history, command: null };
  const command = history.undoStack[history.undoStack.length - 1];
  return {
    history: {
      ...history,
      undoStack: history.undoStack.slice(0, -1),
      redoStack: [...history.redoStack, command],
    },
    command,
  };
}

export function redoCommand(history: CommandHistory): { history: CommandHistory; command: Command | null } {
  if (history.redoStack.length === 0) return { history, command: null };
  const command = history.redoStack[history.redoStack.length - 1];
  return {
    history: {
      ...history,
      undoStack: [...history.undoStack, command],
      redoStack: history.redoStack.slice(0, -1),
    },
    command,
  };
}

export function canUndo(history: CommandHistory): boolean {
  return history.undoStack.length > 0;
}

export function canRedo(history: CommandHistory): boolean {
  return history.redoStack.length > 0;
}

// ─── Command Factories ─────────────────────────────────────────────

let _cmdId = 0;
const cmdUid = () => `cmd-${++_cmdId}`;

export function createRemoveWordCommand(wordId: string, wordText: string): Command {
  return {
    id: cmdUid(),
    type: 'REMOVE_WORD',
    label: `Remover "${wordText}"`,
    timestamp: Date.now(),
    execute: (project) => {
      if (!project.transcript) return project;
      const segments = project.transcript.segments.map((seg) => ({
        ...seg,
        words: seg.words.map((w) =>
          w.id === wordId ? { ...w, isRemoved: true } : w
        ),
      }));
      return {
        ...project,
        state: 'EDITING',
        transcript: { ...project.transcript, segments },
        editDecisions: [
          ...project.editDecisions,
          {
            id: `edit-${Date.now()}`,
            type: 'remove_word' as const,
            targetId: wordId,
            payload: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };
    },
    undo: (project) => {
      if (!project.transcript) return project;
      const segments = project.transcript.segments.map((seg) => ({
        ...seg,
        words: seg.words.map((w) =>
          w.id === wordId ? { ...w, isRemoved: false } : w
        ),
      }));
      return {
        ...project,
        transcript: { ...project.transcript, segments },
        editDecisions: project.editDecisions.filter((d) => d.targetId !== wordId),
      };
    },
  };
}

export function createRemoveSegmentCommand(segmentId: string, segmentText: string): Command {
  return {
    id: cmdUid(),
    type: 'REMOVE_SEGMENT',
    label: `Remover segmento "${segmentText.slice(0, 30)}…"`,
    timestamp: Date.now(),
    execute: (project) => {
      if (!project.transcript) return project;
      const segments = project.transcript.segments.map((seg) =>
        seg.id === segmentId
          ? { ...seg, words: seg.words.map((w) => ({ ...w, isRemoved: true })) }
          : seg
      );
      return {
        ...project,
        state: 'EDITING',
        transcript: { ...project.transcript, segments },
        editDecisions: [
          ...project.editDecisions,
          {
            id: `edit-${Date.now()}`,
            type: 'remove_segment' as const,
            targetId: segmentId,
            payload: {},
            timestamp: new Date().toISOString(),
          },
        ],
      };
    },
    undo: (project) => {
      if (!project.transcript) return project;
      const segments = project.transcript.segments.map((seg) =>
        seg.id === segmentId
          ? { ...seg, words: seg.words.map((w) => ({ ...w, isRemoved: false })) }
          : seg
      );
      return {
        ...project,
        transcript: { ...project.transcript, segments },
        editDecisions: project.editDecisions.filter((d) => d.targetId !== segmentId),
      };
    },
  };
}

export function createApplyPresetCommand(preset: StylePreset, previousPreset: StylePreset | null): Command {
  return {
    id: cmdUid(),
    type: 'APPLY_PRESET',
    label: `Aplicar preset "${preset.name}"`,
    timestamp: Date.now(),
    execute: (project) => ({
      ...project,
      state: 'PRESET_APPLIED',
      appliedPreset: preset,
    }),
    undo: (project) => ({
      ...project,
      state: previousPreset ? 'PRESET_APPLIED' : 'EDITING',
      appliedPreset: previousPreset,
    }),
  };
}

export function createUpdateCaptionsCommand(captionTrack: CaptionTrack, previousTrack: CaptionTrack | null): Command {
  return {
    id: cmdUid(),
    type: 'UPDATE_CAPTIONS',
    label: 'Atualizar legendas',
    timestamp: Date.now(),
    execute: (project) => ({
      ...project,
      state: 'CAPTIONS_READY',
      captionTrack,
    }),
    undo: (project) => ({
      ...project,
      captionTrack: previousTrack,
    }),
  };
}

export function createUpdateCaptionStyleCommand(style: CaptionStyle, previousStyle: CaptionStyle | null): Command {
  return {
    id: cmdUid(),
    type: 'UPDATE_CAPTION_STYLE',
    label: 'Alterar estilo de legenda',
    timestamp: Date.now(),
    execute: (project) => {
      if (!project.captionTrack) return project;
      return {
        ...project,
        captionTrack: { ...project.captionTrack, style },
      };
    },
    undo: (project) => {
      if (!project.captionTrack || !previousStyle) return project;
      return {
        ...project,
        captionTrack: { ...project.captionTrack, style: previousStyle },
      };
    },
  };
}
