/**
 * Undo/Redo visual indicator for the toolbar.
 */

import { useProjectStore } from '@/apps/desktop/store/project-store';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function UndoRedoIndicator() {
  const { undo, redo, canUndo, canRedo, commandHistory } = useProjectStore();
  const undoCount = commandHistory.undoStack.length;
  const redoCount = commandHistory.redoStack.length;

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canUndo()}
            onClick={undo}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Desfazer (⌘Z){undoCount > 0 && ` · ${undoCount} ações`}</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canRedo()}
            onClick={redo}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Refazer (⌘⇧Z){redoCount > 0 && ` · ${redoCount} ações`}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
