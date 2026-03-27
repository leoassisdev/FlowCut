/**
 * @module autosave
 * MOCK — Autosave with debounce, dirty state tracking, and snapshots.
 * No real persistence — snapshots stored in memory.
 */

import type { VideoProject, ProjectSnapshot } from '@/packages/shared-types';
import { logger } from './logger';

export interface AutosaveState {
  isDirty: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;
  snapshots: ProjectSnapshot[];
  maxSnapshots: number;
}

export function createAutosaveState(): AutosaveState {
  return {
    isDirty: false,
    lastSavedAt: null,
    isSaving: false,
    snapshots: [],
    maxSnapshots: 20,
  };
}

let _snapId = 0;

export function createSnapshot(project: VideoProject, label: string): ProjectSnapshot {
  return {
    id: `snapshot-${++_snapId}`,
    projectId: project.id,
    state: project.state,
    data: structuredClone(project),
    createdAt: new Date().toISOString(),
    label,
  };
}

export function saveSnapshot(state: AutosaveState, project: VideoProject, label = 'Autosave'): AutosaveState {
  const snapshot = createSnapshot(project, label);
  const snapshots = [...state.snapshots, snapshot].slice(-state.maxSnapshots);
  logger.info('autosave', `Snapshot saved: ${label}`, { snapshotId: snapshot.id });
  return {
    ...state,
    isDirty: false,
    lastSavedAt: Date.now(),
    isSaving: false,
    snapshots,
  };
}

export function restoreSnapshot(state: AutosaveState, snapshotId: string): { state: AutosaveState; project: VideoProject | null } {
  const snapshot = state.snapshots.find((s) => s.id === snapshotId);
  if (!snapshot) return { state, project: null };
  logger.info('autosave', `Snapshot restored: ${snapshot.label}`, { snapshotId });
  return {
    state: { ...state, isDirty: false },
    project: structuredClone(snapshot.data),
  };
}

/** Creates a debounced autosave trigger */
export function createAutosaveDebounce(delayMs = 3000) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    trigger: (callback: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(callback, delayMs);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
