import { useState } from 'react';
import { useProjectStore } from '../store/project-store';
import { X, Plus } from 'lucide-react';

const INITIAL_FILLERS = [
  'é', 'eh', 'éh', 'hum', 'uh', 'ah', 'ahm', 'uhm', 'hmm', 'hm', 'um',
  'tipo', 'né', 'ne', 'então', 'entao', 'assim', 'basicamente',
  'literalmente', 'enfim', 'bom', 'ahn', 'eeh',
  'tá', 'ta', 'daí', 'dai', 'sabe', 'viu', 'mano'
];

export default function RemoverViciosPanel() {
  const { project, markDirty } = useProjectStore();
  const [customWord, setCustomWord] = useState('');
  const [fillerList, setFillerList] = useState<string[]>(INITIAL_FILLERS);

  const allWords = project?.transcript?.segments.flatMap(s => s.words) || [];
  const removedWords = allWords.filter(w => w.isRemoved);
  const removedCounts: Record<string, number> = {};
  removedWords.forEach(w => {
    const n = w.word.toLowerCase().replace(/[.,!?]/g, '').trim();
    if (n) removedCounts[n] = (removedCounts[n] || 0) + 1;
  });
  const uniqueRemoved = Object.entries(removedCounts);

  const handleAddWord = () => {
    const word = customWord.toLowerCase().trim();
    if (!word || fillerList.includes(word)) return;
    setFillerList([...fillerList, word]);
    setCustomWord('');
  };

  const handleRemoveFromList = (word: string) => {
    setFillerList(fillerList.filter(w => w !== word));
  };

  const handleApply = () => {
    const state = useProjectStore.getState();
    const proj = state.project;
    if (!proj?.transcript) return;
    const newProject = JSON.parse(JSON.stringify(proj));
    let removedCount = 0;
    for (const seg of newProject.transcript.segments) {
      for (const w of seg.words) {
        if (w.isRemoved) continue;
        const normalized = w.word.toLowerCase().replace(/[.,!?]/g, '').trim();
        if (fillerList.includes(normalized)) {
          w.isRemoved = true;
          removedCount++;
        }
      }
    }
    if (removedCount > 0) {
      useProjectStore.setState({ project: newProject });
      state.markDirty();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e0f] border-l border-[#1c1c20]">
      <div className="p-4 border-b border-[#1c1c20]">
        <h2 className="text-xs font-bold text-[#eee] tracking-widest mb-1">REMOVER VÍCIOS</h2>
        <p className="text-[10px] text-[#888]">Gerencie as palavras de preenchimento para remoção.</p>
      </div>
      <div className="p-4 space-y-5 flex-1 overflow-y-auto">
        <button
          onClick={handleApply}
          className="w-full py-2.5 bg-[#10b981] text-[#0e0e0f] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#0ea5e9] transition-colors"
        >
          APLICAR REMOÇÃO
        </button>
        <div className="space-y-2">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Adicione Palavras na sua Lista</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customWord}
              onChange={e => setCustomWord(e.target.value)}
              placeholder="Ex: entende"
              className="flex-1 bg-[#1a1a24] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#10b981]"
              onKeyDown={e => e.key === 'Enter' && handleAddWord()}
            />
            <button
              onClick={handleAddWord}
              className="px-3 py-1.5 bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] text-[10px] rounded hover:bg-[#10b981]/30 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> ADICIONAR
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Palavras na Lista ({fillerList.length})</h3>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {fillerList.map(word => (
              <span key={word} className="px-2 py-1 bg-[#1a1a24] border border-[#333] text-[#ccc] text-[10px] rounded-full flex items-center gap-1 group hover:border-red-500/40">
                {word}
                <button onClick={() => handleRemoveFromList(word)} className="text-[#555] hover:text-red-400 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-2 pt-3 border-t border-[#1c1c20]">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Palavras Riscadas no Projeto</h3>
          <div className="flex flex-wrap gap-1.5">
            {uniqueRemoved.map(([word, count]) => (
              <span key={word} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-full">
                {word}({count})
              </span>
            ))}
            {uniqueRemoved.length === 0 && <span className="text-[10px] text-[#555]">Nenhuma palavra removida ainda.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
