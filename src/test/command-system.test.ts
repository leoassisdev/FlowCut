import { describe, it, expect } from 'vitest';
import {
  createCommandHistory,
  pushCommand,
  undoCommand,
  redoCommand,
  canUndo,
  canRedo,
  createRemoveWordCommand,
  createApplyPresetCommand,
  createUpdateCaptionStyleCommand,
  type Command,
} from '@/apps/desktop/core/command-system';
import type { VideoProject, StylePreset, CaptionStyle } from '@/packages/shared-types';
import { MOCK_PROJECT } from '@/apps/desktop/mocks/mock-data';

// Helper: get a word id from mock project
function getFirstWordId(): string {
  return MOCK_PROJECT.transcript!.segments[0].words[0].id;
}

function getFirstWordText(): string {
  return MOCK_PROJECT.transcript!.segments[0].words[0].word;
}

describe('Command System', () => {
  describe('CommandHistory', () => {
    it('starts empty', () => {
      const h = createCommandHistory();
      expect(h.undoStack).toHaveLength(0);
      expect(h.redoStack).toHaveLength(0);
      expect(canUndo(h)).toBe(false);
      expect(canRedo(h)).toBe(false);
    });

    it('pushCommand adds to undo stack and clears redo', () => {
      let h = createCommandHistory();
      const cmd = createRemoveWordCommand('w1', 'hello');
      h = pushCommand(h, cmd);
      expect(canUndo(h)).toBe(true);
      expect(h.undoStack).toHaveLength(1);
    });

    it('undoCommand moves from undo to redo stack', () => {
      let h = createCommandHistory();
      const cmd = createRemoveWordCommand('w1', 'hello');
      h = pushCommand(h, cmd);

      const { history, command } = undoCommand(h);
      expect(command).toBe(cmd);
      expect(history.undoStack).toHaveLength(0);
      expect(history.redoStack).toHaveLength(1);
    });

    it('redoCommand moves from redo to undo stack', () => {
      let h = createCommandHistory();
      const cmd = createRemoveWordCommand('w1', 'hello');
      h = pushCommand(h, cmd);
      const { history: h2 } = undoCommand(h);
      const { history: h3, command } = redoCommand(h2);
      expect(command).toBe(cmd);
      expect(h3.undoStack).toHaveLength(1);
      expect(h3.redoStack).toHaveLength(0);
    });

    it('new command clears redo stack', () => {
      let h = createCommandHistory();
      h = pushCommand(h, createRemoveWordCommand('w1', 'a'));
      h = pushCommand(h, createRemoveWordCommand('w2', 'b'));
      const { history: h2 } = undoCommand(h);
      expect(h2.redoStack).toHaveLength(1);

      // New command should clear redo
      h = pushCommand(h2, createRemoveWordCommand('w3', 'c'));
      expect(h.redoStack).toHaveLength(0);
    });

    it('respects maxSize', () => {
      let h = createCommandHistory(3);
      for (let i = 0; i < 5; i++) {
        h = pushCommand(h, createRemoveWordCommand(`w${i}`, `word${i}`));
      }
      expect(h.undoStack).toHaveLength(3);
    });
  });

  describe('RemoveWordCommand', () => {
    it('marks word as removed on execute', () => {
      const wordId = getFirstWordId();
      const cmd = createRemoveWordCommand(wordId, getFirstWordText());
      const project = structuredClone(MOCK_PROJECT);
      const result = cmd.execute(project);

      const word = result.transcript!.segments[0].words.find((w) => w.id === wordId);
      expect(word?.isRemoved).toBe(true);
      expect(result.state).toBe('EDITING');
      expect(result.editDecisions.length).toBeGreaterThan(0);
    });

    it('restores word on undo', () => {
      const wordId = getFirstWordId();
      const cmd = createRemoveWordCommand(wordId, getFirstWordText());
      const project = structuredClone(MOCK_PROJECT);
      const edited = cmd.execute(project);
      const restored = cmd.undo(edited);

      const word = restored.transcript!.segments[0].words.find((w) => w.id === wordId);
      expect(word?.isRemoved).toBe(false);
    });
  });

  describe('ApplyPresetCommand', () => {
    it('applies and undoes preset', () => {
      const preset: StylePreset = {
        id: 'test-preset',
        name: 'Test',
        description: 'Test preset',
        category: 'podcast',
        config: {
          removeFiller: true,
          removeSilence: true,
          silenceThresholdMs: 500,
          maxPauseDurationMs: 1000,
          autoZoom: false,
          captionStyle: 'default',
          targetPlatform: 'youtube',
        },
      };
      const cmd = createApplyPresetCommand(preset, null);
      const project = structuredClone(MOCK_PROJECT);
      const result = cmd.execute(project);
      expect(result.appliedPreset).toBe(preset);
      expect(result.state).toBe('PRESET_APPLIED');

      const undone = cmd.undo(result);
      expect(undone.appliedPreset).toBeNull();
    });
  });
});
