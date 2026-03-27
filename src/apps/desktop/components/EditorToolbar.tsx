import { ArrowLeft, Settings, Download, Subtitles, Image, RefreshCw, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import UndoRedoIndicator from './UndoRedoIndicator';
import SaveIndicator from './SaveIndicator';
import type { VideoProject } from '@/packages/shared-types';

interface Props {
  project: VideoProject;
  onNavigateHome: () => void;
}

export default function EditorToolbar({ project, onNavigateHome }: Props) {
  const navigate = useNavigate();
  const { generateCaptions, generateBrollCues, rebuildTimeline, editorMachine } = useProjectStore();

  return (
    <div className="h-12 border-b border-border bg-panel flex items-center px-4 gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateHome}>
        <ArrowLeft className="w-4 h-4" />
      </Button>

      <h2 className="text-sm font-medium truncate max-w-48">{project.name}</h2>
      <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
        {project.state}
      </span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
        {editorMachine.state}
      </span>

      <div className="flex-1" />

      <UndoRedoIndicator />
      <SaveIndicator />

      <div className="w-px h-5 bg-border mx-1" />

      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={rebuildTimeline}>
        <RefreshCw className="w-3 h-3" /> Rebuild
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={generateCaptions}>
        <Subtitles className="w-3 h-3" /> Legendas
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={generateBrollCues}>
        <Image className="w-3 h-3" /> B-Roll
      </Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate('/export')}>
        <Download className="w-3 h-3" /> Exportar
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/settings')}>
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );
}
