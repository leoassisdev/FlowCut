import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, Copy, Check, Edit3 } from 'lucide-react';
import { useProjectStore } from '../store/project-store';

export default function TranscriptPanel() {
  const project = useProjectStore(s => s.project);
  const toggleWordRemoval = useProjectStore(s => s.toggleWordRemoval);
  const editWordText = useProjectStore(s => s.editWordText);
  const currentPlaybackMs = useProjectStore(s => s.currentPlaybackMs);
  const requestSeek = useProjectStore(s => s.requestSeek);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  const matches = useMemo(() => {
    if (!searchQuery.trim() || !project?.transcript) return [];
    const query = searchQuery.toLowerCase();
    const found: string[] = [];
    project.transcript.segments.forEach(seg => {
      seg.words.forEach(w => {
        if (w.word.toLowerCase().includes(query)) {
          found.push(w.id);
        }
      });
    });
    return found;
  }, [searchQuery, project?.transcript]);

  useEffect(() => {
    setCurrentMatchIdx(0);
  }, [searchQuery]);

  useEffect(() => {
    if (matches.length > 0 && !isEditMode) {
      const activeId = matches[currentMatchIdx];
      const el = wordRefs.current.get(activeId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentMatchIdx, matches, isEditMode]);

  const handlePrevMatch = () => setCurrentMatchIdx(prev => (prev > 0 ? prev - 1 : matches.length - 1));
  const handleNextMatch = () => setCurrentMatchIdx(prev => (prev < matches.length - 1 ? prev + 1 : 0));

  const handleCopy = () => {
    if (!project?.transcript) return;
    const text = project.transcript.segments
      .flatMap(s => s.words)
      .filter(w => !w.isRemoved)
      .map(w => w.word)
      .join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWordClick = (id: string, text: string) => {
    if (isEditMode) {
      setEditingWordId(id);
      setEditingText(text);
    } else {
      toggleWordRemoval(id);
    }
  };

  const saveWordEdit = () => {
    if (editingWordId && editingText.trim()) {
      editWordText(editingWordId, editingText.trim());
    }
    setEditingWordId(null);
  };

  if (!project?.transcript) {
    return (
      <div className="h-full flex items-center justify-center text-[10px] text-[#555] font-mono tracking-widest uppercase bg-[#0a0a0c] border-r border-[#1c1c20]">
        Sem Transcrição
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] border-r border-[#1c1c20]">
      <div className="h-12 border-b border-[#1c1c20] flex items-center px-3 gap-2 flex-shrink-0 bg-[#070708]">
        <div className="flex-1 relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#555] absolute left-2.5" />
          <input
            type="text"
            placeholder="Buscar na transcrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNextMatch(); }}
            className="w-full bg-[#111115] border border-[#222] rounded-md pl-8 pr-16 py-1.5 text-[11px] text-[#eee] placeholder:text-[#555] focus:outline-none focus:border-[#4f6ef7] transition-colors"
          />
          {matches.length > 0 && (
            <div className="absolute right-1 flex items-center bg-[#111115] pl-2">
              <span className="text-[9px] font-mono text-[#888] mr-1">{currentMatchIdx + 1}/{matches.length}</span>
              <button onClick={handlePrevMatch} className="p-1 text-[#888] hover:text-[#eee] transition-colors rounded hover:bg-[#222]"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button onClick={handleNextMatch} className="p-1 text-[#888] hover:text-[#eee] transition-colors rounded hover:bg-[#222]"><ChevronDown className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => {
            setIsEditMode(!isEditMode);
            setEditingWordId(null);
          }}
          title="Modo de Edição de Texto"
          className={`w-8 h-8 flex items-center justify-center rounded-md border transition-all ${isEditMode ? 'bg-[#4f6ef7]/20 border-[#4f6ef7] text-[#4f6ef7]' : 'border-[#222] bg-[#111115] text-[#888] hover:text-[#eee] hover:border-[#444]'}`}
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleCopy}
          title="Copiar texto não cortado"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-[#222] bg-[#111115] text-[#888] hover:text-[#eee] hover:border-[#444] transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {project.transcript.segments.map((seg) => (
          <div key={seg.id} className="text-[13px] leading-relaxed text-[#ccc]">
            {seg.words.map((w) => {
              const isMatch = matches.includes(w.id);
              const isActiveMatch = isMatch && matches[currentMatchIdx] === w.id;
              const isPlaying = currentPlaybackMs >= w.startMs && currentPlaybackMs < w.endMs;
              const isBeingEdited = editingWordId === w.id;

              if (isBeingEdited) {
                return (
                  <input
                    key={w.id}
                    autoFocus
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onBlur={saveWordEdit}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveWordEdit(); }}
                    className="inline-block bg-[#1a1a24] text-white border border-[#4f6ef7] rounded px-1 w-20 text-center outline-none text-[13px]"
                  />
                );
              }

              return (
                <span
                  key={w.id}
                  ref={(el) => {
                    if (el) wordRefs.current.set(w.id, el);
                    else wordRefs.current.delete(w.id);
                  }}
                  onClick={() => handleWordClick(w.id, w.word)}
                  onDoubleClick={() => requestSeek(w.startMs)}
                  className={`
                    inline-block px-0.5 mx-[1px] rounded-sm cursor-pointer transition-all select-none
                    ${w.isRemoved ? 'line-through text-red-500 opacity-70' : isEditMode ? 'hover:bg-[#4f6ef7]/20 hover:text-[#4f6ef7]' : 'hover:bg-[#1a1a24]'}
                    ${isPlaying && !w.isRemoved && !isActiveMatch ? 'bg-primary/20 text-[#4f6ef7] font-medium' : ''}
                    ${isMatch && !isActiveMatch ? 'border border-yellow-500/60 text-yellow-200 bg-yellow-500/10' : ''}
                    ${isActiveMatch ? 'bg-yellow-500/40 border border-yellow-400 text-yellow-400 font-bold scale-110 shadow-[0_0_10px_rgba(234,179,8,0.2)] z-10 relative' : 'border border-transparent'}
                  `}
                >
                  {w.word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}