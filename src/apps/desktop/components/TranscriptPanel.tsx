import { useProjectStore } from '@/apps/desktop/store/project-store';
import type { Transcript, WordToken } from '@/packages/shared-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useCallback } from 'react';
import { RefreshCw, Search, Trash2, Zap } from 'lucide-react';

interface Props {
  transcript: Transcript | null;
}

export default function TranscriptPanel({ transcript }: Props) {
  const { removeWord, removeSegment, rebuildTimeline } = useProjectStore();
  const [search, setSearch] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const handleWordClick = useCallback((
    word: WordToken,
    e: React.MouseEvent,
    allWords: WordToken[]
  ) => {
    if (word.isRemoved) return;

    if (e.metaKey || e.ctrlKey) {
      // CMD+click: toggle individual
      setSelectedWords(prev => {
        const next = new Set(prev);
        next.has(word.id) ? next.delete(word.id) : next.add(word.id);
        return next;
      });
      setLastSelected(word.id);
    } else if (e.shiftKey && lastSelected) {
      // SHIFT+click: range select
      const ids = allWords.map(w => w.id);
      const from = ids.indexOf(lastSelected);
      const to = ids.indexOf(word.id);
      const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
      setSelectedWords(new Set(range));
    } else if (selectedWords.size > 0) {
      // Clear selection on regular click
      setSelectedWords(new Set());
      setLastSelected(null);
    } else {
      // Direct remove
      removeWord(word.id);
      setLastSelected(word.id);
    }
  }, [lastSelected, selectedWords, removeWord]);

  const removeSelected = useCallback(() => {
    selectedWords.forEach(id => removeWord(id));
    setSelectedWords(new Set());
    setLastSelected(null);
  }, [selectedWords, removeWord]);

  const removeFillers = useCallback(() => {
    if (!transcript) return;
    transcript.segments.forEach(seg =>
      seg.words.forEach(w => { if (w.isFillerWord && !w.isRemoved) removeWord(w.id); })
    );
  }, [transcript, removeWord]);

  if (!transcript) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-[11px] text-[#333] text-center font-mono">
          No transcript available.<br />Import a video to begin.
        </p>
      </div>
    );
  }

  const allWords = transcript.segments.flatMap(s => s.words);
  const filteredSegments = search
    ? transcript.segments.filter(s =>
        s.text.toLowerCase().includes(search.toLowerCase())
      )
    : transcript.segments;

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e]">

      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a1a20] flex items-center justify-between flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-[#444] font-mono">Transcript</span>
        <button
          onClick={rebuildTimeline}
          className="w-6 h-6 flex items-center justify-center text-[#333] hover:text-[#4f6ef7] transition-colors"
          title="Rebuild timeline"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#141418] flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#2a2a35]" />
          <input
            type="text"
            placeholder="Search transcript..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#0e0e12] border border-[#1a1a20] rounded px-2 pl-6 py-1 text-[11px] text-[#888] placeholder-[#2a2a35] font-mono outline-none focus:border-[#4f6ef7]/40 transition-colors"
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-3 py-1.5 border-b border-[#141418] flex gap-1.5 flex-shrink-0">
        <button
          onClick={removeFillers}
          className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider font-mono bg-[#0e0e12] border border-[#1a1a20] text-[#555] hover:text-[#f7804f] hover:border-[#f7804f]/30 rounded transition-all"
          title="Remove filler words"
        >
          <Zap className="w-2.5 h-2.5" />
          Fillers
        </button>
        {selectedWords.size > 0 && (
          <button
            onClick={removeSelected}
            className="flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider font-mono bg-[#0e0e12] border border-[#3a1a1a] text-[#cc4444] hover:border-[#cc4444]/50 rounded transition-all"
          >
            <Trash2 className="w-2.5 h-2.5" />
            Remove {selectedWords.size}
          </button>
        )}
      </div>

      {/* Transcript content */}
      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-5">
          {filteredSegments.map((segment) => (
            <div key={segment.id} className="space-y-1.5">
              {/* Segment header */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-[#2a2a35] tracking-widest">
                  {String(Math.floor(segment.startMs / 60000)).padStart(2, '0')}:
                  {String(Math.floor((segment.startMs % 60000) / 1000)).padStart(2, '0')}
                </span>
                <button
                  onClick={() => removeSegment(segment.id)}
                  className="text-[9px] font-mono text-[#1e1e24] hover:text-[#cc4444] transition-colors px-1"
                  title="Remove segment"
                >
                  ✕
                </button>
              </div>

              {/* Words */}
              <p className="text-[12px] leading-[1.9] text-[#888]">
                {segment.words.map((word) => {
                  const isSelected = selectedWords.has(word.id);
                  const isRemoved = word.isRemoved;
                  const isFiller = word.isFillerWord && !isRemoved;

                  return (
                    <span
                      key={word.id}
                      onClick={(e) => handleWordClick(word, e, allWords)}
                      className={`
                        cursor-pointer rounded-sm px-0.5 transition-all select-none
                        ${isRemoved
                          ? 'line-through text-[#2a2a2a] decoration-[#3a3a3a]'
                          : isSelected
                          ? 'bg-[#4f6ef7]/25 text-[#a0b0ff]'
                          : isFiller
                          ? 'text-[#c07a40] hover:bg-[#c07a40]/10'
                          : 'hover:bg-[#1a1a22] hover:text-[#bbb]'
                        }
                      `}
                      title={
                        isRemoved ? 'Removed'
                        : isFiller ? 'Filler word'
                        : isSelected ? 'Selected'
                        : 'Click to remove · Cmd+click to multi-select'
                      }
                    >
                      {word.word}{' '}
                    </span>
                  );
                })}
              </p>
            </div>
          ))}
        </div>
        <div className="px-3 pb-3">
          <p className="text-[9px] font-mono text-[#1e1e24] tracking-widest uppercase">
            ⚠ Mock transcript
          </p>
        </div>
      </ScrollArea>

      {/* Selection hint */}
      {selectedWords.size === 0 && (
        <div className="px-3 py-2 border-t border-[#141418] flex-shrink-0">
          <p className="text-[9px] font-mono text-[#222228] leading-relaxed">
            Click word to remove · Cmd+click multi-select · Shift+click range
          </p>
        </div>
      )}
    </div>
  );
}
