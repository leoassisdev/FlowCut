import { useState } from 'react';
import { useProjectStore } from '../store/project-store';

export default function RemoverViciosPanel() {
  const { project, removeFillers } = useProjectStore();
  const [customWord, setCustomWord] = useState('');

  const allWords = project?.transcript?.segments.flatMap(s => s.words) || [];
  const removedWords = allWords.filter(w => w.isRemoved);
  const uniqueRemoved = Array.from(new Set(removedWords.map(w => w.word.toLowerCase().replace(/[.,!?]/g, '').trim()))).filter(Boolean);

  const defaultFillers = ['eh', 'hum', 'tipo', 'né', 'então', 'assim', 'basicamente', 'sabe'];

  const handleAddWord = () => {
    if (!customWord.trim()) return;
    const wordToFind = customWord.toLowerCase().trim();
    const state = useProjectStore.getState();
    const newProj = structuredClone(state.project);
    if (!newProj?.transcript) return;
    
    let count = 0;
    for (const seg of newProj.transcript.segments) {
      for (const w of seg.words) {
        if (!w.isRemoved && w.word.toLowerCase().replace(/[.,!?]/g, '').trim() === wordToFind) {
          w.isRemoved = true;
          count++;
        }
      }
    }
    
    if (count > 0) {
      useProjectStore.setState({ project: newProj });
      state.rebuildTimeline();
    }
    setCustomWord('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e0f] border-l border-[#1c1c20]">
      <div className="p-4 border-b border-[#1c1c20]">
        <h2 className="text-xs font-bold text-[#eee] tracking-widest mb-1">REMOVER VÍCIOS</h2>
        <p className="text-[10px] text-[#888]">Limpeza contextual de palavras de preenchimento.</p>
      </div>
      
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        <button
          onClick={() => removeFillers()}
          className="w-full py-2.5 bg-[#10b981] text-[#0e0e0f] text-[11px] font-bold uppercase tracking-wider rounded hover:bg-[#0ea5e9] transition-colors"
        >
          APLICAR
        </button>

        <div className="space-y-2">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Palavras na Mira (Padrão)</h3>
          <div className="flex flex-wrap gap-1.5">
            {defaultFillers.map(word => (
              <span key={word} className="px-2 py-1 bg-[#1a1a24] border border-[#333] text-[#888] text-[10px] rounded-full">
                {word}
              </span>
            ))}
            <span className="px-2 py-1 bg-[#1a1a24] border border-[#333] text-[#888] text-[10px] rounded-full">...e mais</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#1c1c20]">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Riscar Palavra Específica</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={customWord}
              onChange={e => setCustomWord(e.target.value)}
              placeholder="Ex: entende"
              className="flex-1 bg-[#1a1a24] border border-[#333] rounded px-2 text-xs text-white outline-none focus:border-[#10b981]"
              onKeyDown={e => e.key === 'Enter' && handleAddWord()}
            />
            <button
              onClick={handleAddWord}
              className="px-3 py-1 bg-[#2a2a35] text-white text-[10px] rounded hover:bg-[#3a3a45] transition-colors"
            >
              RISCAR
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#1c1c20]">
          <h3 className="text-[10px] text-[#aaa] font-bold uppercase tracking-wider">Palavras Riscadas no Projeto</h3>
          <div className="flex flex-wrap gap-1.5">
            {uniqueRemoved.map(word => (
              <span key={word} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-full flex items-center gap-1">
                {word}
              </span>
            ))}
            {uniqueRemoved.length === 0 && <span className="text-[10px] text-[#555]">Nenhuma palavra removida ainda.</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
