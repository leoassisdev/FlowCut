import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAutosaveState,
  saveSnapshot,
  restoreSnapshot,
  createAutosaveDebounce,
} from '@/apps/desktop/core/autosave';
import { MOCK_PROJECT } from '@/apps/desktop/mocks/mock-data';

describe('Autosave', () => {
  it('starts clean', () => {
    const state = createAutosaveState();
    expect(state.isDirty).toBe(false);
    expect(state.snapshots).toHaveLength(0);
  });

  it('saves a snapshot', () => {
    let state = createAutosaveState();
    state = saveSnapshot(state, MOCK_PROJECT, 'Test save');
    expect(state.isDirty).toBe(false);
    expect(state.lastSavedAt).not.toBeNull();
    expect(state.snapshots).toHaveLength(1);
    expect(state.snapshots[0].label).toBe('Test save');
  });

  it('restores from snapshot', () => {
    let state = createAutosaveState();
    state = saveSnapshot(state, MOCK_PROJECT, 'Snap 1');
    const snapshotId = state.snapshots[0].id;
    const { project } = restoreSnapshot(state, snapshotId);
    expect(project).not.toBeNull();
    expect(project!.id).toBe(MOCK_PROJECT.id);
  });

  it('respects maxSnapshots', () => {
    let state = { ...createAutosaveState(), maxSnapshots: 3 };
    for (let i = 0; i < 5; i++) {
      state = saveSnapshot(state, MOCK_PROJECT, `Snap ${i}`);
    }
    expect(state.snapshots).toHaveLength(3);
  });

  it('debounce triggers callback after delay', async () => {
    vi.useFakeTimers();
    const debounce = createAutosaveDebounce(100);
    const cb = vi.fn();
    debounce.trigger(cb);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
