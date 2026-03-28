import { useProjectStore } from '../store/project-store';
import { Search, Loader2, Copy, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Função auxiliar para o formato SRT
function formatSrtTime(ms: number) {
  const d = new Date(Date.UTC(0, 0, 0, 0, 0, 0, ms));
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const secs = String(d.getUTCSeconds()).padStart(2, '0');
  const millis = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `${hours}:${mins}:${secs},${millis}`;
}

export default function TranscriptPanel() {
  const project = useProjectStore((s) => s.project);
  
  const toggleWordRemoval = useProjectStore((s) => (s as any).toggleWordRemoval);
  const currentPlaybackMs = useProjectStore((s) => (s as any).currentPlaybackMs);
  const isRebuilding = useProjectStore((s) => (s as any).isRebuilding);

  const activeWordRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPlaybackMs]);

  if (!project) return <div className="flex-1 border-r border-[#1a1a20] bg-[#0c0c0f]" />;

  const currentState = project.state as string;
  if (['IMPORTING', 'AUDIO_EXTRACTED', 'PROXY_GENERATED', 'TRANSCRIBING'].includes(currentState)) {
    return (
        <div className="flex-1 border-r border-[#1a1a20] bg-[#0c0c0f] flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Processando áudio... Isso pode levar alguns minutos.</p>
        </div>
    );
  }

  if (!project.transcript) {
    return (
        <div className="flex-1 border-r border-[#1a1a20] bg-[#0c0c0f] flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
          <p>Nenhuma transcrição disponível.</p>
        </div>
    );
  }

  // ─── LÓGICA DE COPIAR TEXTO EDITADO ───
  const handleCopyTranscript = () => {
    if (!project.transcript) return;
    // Pega apenas as palavras que não foram cortadas!
    const textToCopy = project.transcript.segments
      .flatMap(seg => seg.words.filter(w => !w.isRemoved).map(w => w.word))
      .join(' ');
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── LÓGICA DE EXPORTAR ARQUIVO .SRT ───
  const handleDownloadSRT = () => {
    const cuts = project.semanticTimeline?.cuts.filter(c => c.type === 'keep') || [];
    if (cuts.length === 0) return;

    let srt = '';
    let srtIndex = 1;
    let currentExportMs = 0;

    for (const cut of cuts) {
      const duration = cut.endMs - cut.startMs;
      const startSrt = formatSrtTime(currentExportMs);
      const endSrt = formatSrtTime(currentExportMs + duration);
      srt += `${srtIndex}\n${startSrt} --> ${endSrt}\n${cut.label}\n\n`;
      srtIndex++;
      currentExportMs += duration;
    }

    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_legendas.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── CHECAGEM DE SELEÇÃO DE TEXTO ───
  const handleWordAction = (wordId: string) => {
    // Se o usuário selecionou texto (arrastou o mouse), não corta a palavra.
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    
    toggleWordRemoval(wordId);
  };

  return (
    <div className="flex-1 flex flex-col border-r border-[#1a1a20] bg-[#0c0c0f] h-full overflow-hidden">
      
      {/* Header com Botões de Exportação */}
      <div className="h-12 border-b border-[#1a1a20] flex items-center px-4 justify-between shrink-0">
        <h2 className="text-xs font-semibold tracking-wider text-[#aaa] uppercase">Transcrição</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleCopyTranscript}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#aaa] hover:text-white hover:bg-[#1a1a20] rounded transition-colors"
            title="Copiar texto editado"
          >
            {copied ? <span className="text-emerald-400">Copiado!</span> : <><Copy className="w-3 h-3" /> Copiar</>}
          </button>
          <button 
            onClick={handleDownloadSRT}
            className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#aaa] hover:text-white hover:bg-[#1a1a20] rounded transition-colors"
            title="Baixar arquivo de legendas .SRT"
          >
            <FileText className="w-3 h-3" /> .SRT
          </button>
        </div>
      </div>
      
      <div className="p-3 border-b border-[#1a1a20] shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input 
            type="text" 
            placeholder="Buscar na transcrição..." 
            className="w-full bg-[#111116] border border-[#1a1a20] rounded-md pl-9 pr-4 py-1.5 text-sm text-[#eee] focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#2a2a35] scrollbar-track-transparent">
        <div className={`transition-opacity duration-300 ${isRebuilding ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          
          {project.transcript.segments.map((seg) => (
            <div key={seg.id} className="flex gap-4 group">
              <div className="w-12 shrink-0 pt-1">
                <span className="text-[10px] font-mono text-[#555]">
                  {formatTime(seg.startMs)}
                </span>
              </div>

              <div className="flex-1 flex flex-wrap gap-x-1.5 gap-y-2 content-start leading-relaxed">
                {seg.words.map((w) => {
                  const isActive = currentPlaybackMs >= w.startMs && currentPlaybackMs <= w.endMs;
                  
                  return (
                    <span
                      key={w.id}
                      ref={isActive ? activeWordRef : null}
                      // Use onMouseUp instead of onClick to allow text selection
                      onMouseUp={() => handleWordAction(w.id)} 
                      className={`
                        text-[15px] cursor-pointer px-1 rounded transition-all duration-150 
                        ${w.isRemoved 
                          ? 'text-[#555] line-through decoration-[#ef4444]/60 decoration-2 hover:text-[#777]' 
                          : isActive 
                            ? 'text-[#4f6ef7] bg-[#4f6ef7]/10 font-medium scale-105 shadow-sm' 
                            : 'text-[#ccc] hover:bg-[#1e1e28] hover:text-white'}
                      `}
                    >
                      {w.word}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}