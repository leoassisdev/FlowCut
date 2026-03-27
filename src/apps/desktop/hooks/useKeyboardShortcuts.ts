/**
 * @module useKeyboardShortcuts
 * Global keyboard shortcuts for the editor.
 */

import { useEffect } from 'react';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import { logger } from '@/apps/desktop/core/logger';

export interface ShortcutDef {
  key: string;
  meta?: boolean;
  shift?: boolean;
  label: string;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const { undo, redo, saveNow, rebuildTimeline, canUndo, canRedo } = useProjectStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+Z — Undo
      if (meta && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo()) {
          undo();
          logger.info('shortcuts', 'Undo (Cmd+Z)');
        }
        return;
      }

      // Cmd+Shift+Z — Redo
      if (meta && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo()) {
          redo();
          logger.info('shortcuts', 'Redo (Cmd+Shift+Z)');
        }
        return;
      }

      // Cmd+S — Save snapshot
      if (meta && e.key === 's') {
        e.preventDefault();
        saveNow('Manual save (Cmd+S)');
        logger.info('shortcuts', 'Save (Cmd+S)');
        return;
      }

      // Cmd+Shift+R — Rebuild timeline
      if (meta && e.shiftKey && e.key === 'r') {
        e.preventDefault();
        rebuildTimeline();
        logger.info('shortcuts', 'Rebuild timeline (Cmd+Shift+R)');
        return;
      }

      // Space — Play/Pause (only if not in input)
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        logger.info('shortcuts', 'Play/Pause (Space) — MOCK');
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, saveNow, rebuildTimeline, canUndo, canRedo]);
}

/** Returns list of shortcuts for display */
export function getShortcutsList(): Array<{ keys: string; label: string }> {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const mod = isMac ? '⌘' : 'Ctrl';
  return [
    { keys: `${mod}+Z`, label: 'Desfazer' },
    { keys: `${mod}+⇧+Z`, label: 'Refazer' },
    { keys: `${mod}+S`, label: 'Salvar snapshot' },
    { keys: `${mod}+⇧+R`, label: 'Reconstruir timeline' },
    { keys: 'Space', label: 'Play/Pause' },
  ];
}
