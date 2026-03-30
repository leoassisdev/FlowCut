import { ArrowLeft, Settings, Download, Subtitles, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import UndoRedoIndicator from './UndoRedoIndicator';
import SaveIndicator from './SaveIndicator';
import type { VideoProject } from '@/packages/shared-types';

interface Props {
  project: VideoProject;
  onNavigateHome: () => void;
}

export default function EditorToolbar({ project, onNavigateHome }: Props) {
  const navigate = useNavigate();
  const { generateCaptions, generateBrollCues, editorMachine } = useProjectStore();
  
  return (
    <div className="h-12 border-b border-[#1c1c20] bg-[#0a0a0c] flex items-center px-4 gap-2 select-none">
      {/* ─── ZONA ESQUERDA (Navegação e Status) ─── */}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#888] hover:text-white hover:bg-[#1a1a24] transition-colors" onClick={onNavigateHome}>
        <ArrowLeft className="w-4 h-4" />
      </Button>
      
      <h2 className="text-sm font-medium truncate max-w-48 text-[#eee]">{project.name}</h2>
      
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1a1a24] text-[#888]">
        {project.state}
      </span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
        {editorMachine.state}
      </span>

      <div className="w-px h-5 bg-[#1c1c20] mx-1" />

      {/* ─── ZONA CENTRO-ESQUERDA (Edição e Cortes) ─── */}
      <SaveIndicator />
      

      {/* ─── ESPAÇADOR FLEX ─── */}
      <div className="flex-1" />
      
      {/* ─── ZONA DIREITA (Finalização e Exportação) ─── */}
      <UndoRedoIndicator />
      
      <div className="w-px h-5 bg-[#1c1c20] mx-2" />
      
      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-[#ccc] hover:text-white hover:bg-[#1a1a24] transition-colors" onClick={generateCaptions}>
        <Subtitles className="w-3.5 h-3.5" /> Legendas
      </Button>
      
      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-[#ccc] hover:text-white hover:bg-[#1a1a24] transition-colors" onClick={generateBrollCues}>
        <Image className="w-3.5 h-3.5" /> B-Roll
      </Button>
      
      <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 transition-colors ml-1" onClick={() => navigate('/export')}>
        <Download className="w-3.5 h-3.5" /> Exportar
      </Button>
      
      <Button variant="ghost" size="icon" className="h-8 w-8 text-[#888] hover:text-white hover:bg-[#1a1a24] transition-colors ml-1" onClick={() => navigate('/settings')}>
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );
}