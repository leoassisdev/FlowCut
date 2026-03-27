/**
 * Save state visual indicator.
 */

import { useProjectStore } from '@/apps/desktop/store/project-store';
import { Save, Check, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function SaveIndicator() {
  const { autosave } = useProjectStore();

  const icon = autosave.isDirty
    ? <AlertCircle className="w-3 h-3 text-status-warning" />
    : autosave.lastSavedAt
    ? <Check className="w-3 h-3 text-status-success" />
    : <Save className="w-3 h-3 text-muted-foreground" />;

  const label = autosave.isDirty
    ? 'Alterações não salvas'
    : autosave.lastSavedAt
    ? `Salvo ${new Date(autosave.lastSavedAt).toLocaleTimeString()}`
    : 'Nenhum save';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-default">
          {icon}
          <span className="hidden sm:inline">{autosave.isDirty ? '●' : ''}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
        {autosave.snapshots.length > 0 && (
          <p className="text-muted-foreground">{autosave.snapshots.length} snapshots</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
