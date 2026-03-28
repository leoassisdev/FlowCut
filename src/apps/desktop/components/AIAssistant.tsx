import { useState, useCallback } from 'react';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import { ChevronDown, ChevronUp, Cpu, Check, Loader2 } from 'lucide-react';

type AssistantState = 'idle' | 'analyzing' | 'ready' | 'applied';

interface Suggestion {
  id: string;
  message: string;
  action: string;
  severity: 'info' | 'warning' | 'suggestion';
  applied?: boolean;
}

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: 'sug-1',
    message: 'Detected long pauses between 00:01:20 and 00:01:45. Removing them will improve pacing.',
    action: 'Remove Silences',
    severity: 'warning',
  },
  {
    id: 'sug-2',
    message: 'Found 8 filler words (uh, né, tipo). Removing them reduces 12s from the final cut.',
    action: 'Remove Fillers',
    severity: 'suggestion',
  },
  {
    id: 'sug-3',
    message: 'Segment at 00:02:10 has low engagement markers. Consider applying an engaging preset.',
    action: 'Apply Engaging Preset',
    severity: 'info',
  },
  {
    id: 'sug-4',
    message: 'No captions generated yet. Captions increase retention by ~40% for social content.',
    action: 'Generate Captions',
    severity: 'suggestion',
  },
];

const SEVERITY_COLORS = {
  info:       { dot: 'bg-[#4f6ef7]',  text: 'text-[#4f6ef7]',  border: 'border-[#1e2a4a]' },
  warning:    { dot: 'bg-[#f7c84f]',  text: 'text-[#f7c84f]',  border: 'border-[#2a2a14]' },
  suggestion: { dot: 'bg-[#4faa6f]',  text: 'text-[#4faa6f]',  border: 'border-[#1a2a1a]' },
};

export default function AIAssistant() {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<AssistantState>('ready');
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);
  const [appliedLog, setAppliedLog] = useState<string[]>([]);

  const { applyPreset, generateCaptions, generateBrollCues } = useProjectStore();

  const handleAction = useCallback((sug: Suggestion) => {
    setState('analyzing');

    setTimeout(() => {
      // Mock actions
      if (sug.action === 'Generate Captions') generateCaptions();
      if (sug.action === 'Suggest B-Roll') generateBrollCues();

      setSuggestions(prev =>
        prev.map(s => s.id === sug.id ? { ...s, applied: true } : s)
      );
      setAppliedLog(prev => [
        `${new Date().toLocaleTimeString('en', { hour12: false })} — ${sug.action} applied`,
        ...prev,
      ]);
      setState('applied');

      setTimeout(() => setState('ready'), 1500);
    }, 800);
  }, [generateCaptions, generateBrollCues]);

  const analyze = useCallback(() => {
    setState('analyzing');
    setSuggestions(prev => prev.map(s => ({ ...s, applied: false })));
    setTimeout(() => setState('ready'), 1200);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono select-none">
      {/* Expanded panel */}
      {expanded && (
        <div className="mb-2 w-[300px] bg-[#0d0d10] border border-[#1e1e28] rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.8)] overflow-hidden">

          {/* Panel header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a20]">
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-[#4f6ef7]" />
              <span className="text-[10px] uppercase tracking-widest text-[#666]">AI FLOW ASSISTENT</span>
            </div>
            <div className="flex items-center gap-2">
              {state === 'analyzing' && (
                <div className="flex items-center gap-1 text-[9px] text-[#f7c84f]">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Analyzing
                </div>
              )}
              {state === 'applied' && (
                <div className="flex items-center gap-1 text-[9px] text-[#4faa6f]">
                  <Check className="w-2.5 h-2.5" />
                  Applied
                </div>
              )}
              {state === 'ready' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#4faa6f] animate-pulse" />
              )}
              {state === 'idle' && (
                <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="max-h-[240px] overflow-y-auto">
            {suggestions.map((sug) => {
              const colors = SEVERITY_COLORS[sug.severity];
              return (
                <div
                  key={sug.id}
                  className={`px-3 py-2.5 border-b border-[#141418] ${sug.applied ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${colors.dot}`} />
                    <p className="text-[10px] text-[#666] leading-relaxed">{sug.message}</p>
                  </div>
                  {!sug.applied ? (
                    <button
                      onClick={() => handleAction(sug)}
                      disabled={state === 'analyzing'}
                      className={`ml-3.5 text-[9px] uppercase tracking-wider px-2 py-0.5 border rounded transition-all
                        ${colors.border} ${colors.text} hover:bg-white/5 disabled:opacity-30`}
                    >
                      {sug.action}
                    </button>
                  ) : (
                    <div className="ml-3.5 flex items-center gap-1 text-[9px] text-[#333]">
                      <Check className="w-2.5 h-2.5" />
                      Applied
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Applied log */}
          {appliedLog.length > 0 && (
            <div className="border-t border-[#141418] px-3 py-2">
              <p className="text-[9px] uppercase tracking-widest text-[#222] mb-1.5">History</p>
              {appliedLog.slice(0, 3).map((entry, i) => (
                <p key={i} className="text-[9px] text-[#2a2a35] leading-relaxed">{entry}</p>
              ))}
            </div>
          )}

          {/* Re-analyze button */}
          <div className="px-3 py-2 border-t border-[#141418]">
            <button
              onClick={analyze}
              disabled={state === 'analyzing'}
              className="w-full py-1.5 text-[9px] uppercase tracking-widest text-[#333] hover:text-[#4f6ef7] border border-[#1a1a20] hover:border-[#4f6ef7]/30 rounded transition-all disabled:opacity-30"
            >
              Re-analyze project
            </button>
          </div>
        </div>
      )}

      {/* Dock button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-sm border transition-all shadow-[0_4px_20px_rgba(0,0,0,0.6)]
          ${expanded
            ? 'bg-[#0d0d10] border-[#4f6ef7]/40 text-[#4f6ef7]'
            : 'bg-[#0d0d10] border-[#1e1e28] text-[#444] hover:text-[#888] hover:border-[#2a2a35]'
          }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-widest">Copilot</span>
        {suggestions.filter(s => !s.applied).length > 0 && (
          <span className="w-4 h-4 rounded-full bg-[#4f6ef7]/20 border border-[#4f6ef7]/40 text-[#4f6ef7] text-[8px] flex items-center justify-center">
            {suggestions.filter(s => !s.applied).length}
          </span>
        )}
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
    </div>
  );
}
