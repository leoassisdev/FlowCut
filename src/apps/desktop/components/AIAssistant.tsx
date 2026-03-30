import { useState } from 'react';
import { ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { useProjectStore } from '../store/project-store';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const applyAutoCut = useProjectStore(s => s.applyAutoCut);
  const removeFillers = useProjectStore(s => s.removeFillers);

  return (
    <div className="fixed bottom-6 left-16 z-50 flex flex-col items-start">
      
      {isOpen && (
         <div className="mb-3 w-80 bg-[#111115] border border-[#222] rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono">
            <div className="flex items-center justify-between p-3 border-b border-[#222] bg-[#1a1a20]">
               <div className="flex items-center gap-2 text-[#4f6ef7]">
                 <Cpu className="w-4 h-4" />
                 <span className="text-[11px] font-bold">AI FLOW ASSISTANT</span>
               </div>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            
            <div className="p-3 space-y-4">
               <div className="space-y-2">
                  <p className="text-[10px] text-[#ccc] leading-relaxed">
                    <span className="text-yellow-500 mr-1">●</span>
                    Longas pausas detectadas no áudio. Removê-las melhora a retenção do vídeo.
                  </p>
                  <button onClick={() => { applyAutoCut(); setIsOpen(false); }} className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[9px] uppercase tracking-wider rounded hover:bg-yellow-500/20 transition-colors">
                    Remover Silêncios
                  </button>
               </div>
               
               <div className="w-full h-px bg-[#222]" />
               
               <div className="space-y-2">
                  <p className="text-[10px] text-[#ccc] leading-relaxed">
                    <span className="text-emerald-500 mr-1">●</span>
                    Encontradas 8 palavras de preenchimento (ééé, hum, tipo). O corte poupará 12s.
                  </p>
                  <button onClick={() => { removeFillers(); setIsOpen(false); }} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] uppercase tracking-wider rounded hover:bg-emerald-500/20 transition-colors">Remover Vícios</button>
               </div>
               
               <div className="w-full h-px bg-[#222]" />
               
               <div className="space-y-2">
                  <p className="text-[10px] text-[#ccc] leading-relaxed">
                    <span className="text-blue-500 mr-1">●</span>
                    Baixo nível de engajamento detectado no trecho 00:02. Considere adicionar um B-Roll.
                  </p>
                  <button className="w-full py-1.5 bg-[#1a1a20] border border-[#333] text-[#888] text-[9px] uppercase tracking-wider rounded hover:bg-[#222] hover:text-[#eee] transition-colors">
                    Re-analisar Projeto
                  </button>
               </div>
            </div>
         </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[#111115] border border-[#222] rounded-full pr-4 py-1 pl-1 hover:border-[#444] transition-colors shadow-lg group"
      >
        <div className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#0a0a0c]">
           <img src="/mascote.ico" alt="Mascot" className="w-8 h-8 rounded-full object-cover z-10" />
           <div className="absolute inset-0 rounded-full border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
           <div className="absolute w-10 h-10 animate-[spin_3s_linear_infinite] z-20">
              <div className="w-2 h-2 bg-red-500 rounded-full absolute -top-1 left-1/2 -translate-x-1/2 shadow-[0_0_5px_rgba(239,68,68,1)]" />
           </div>
        </div>

        <div className="flex flex-col items-start">
           <span className="text-[11px] font-bold text-[#eee] tracking-widest group-hover:text-white transition-colors">FLOW ASSISTANT</span>
        </div>
        
        <div className="w-5 h-5 bg-[#222] rounded-full flex items-center justify-center ml-2">
           <span className="text-[9px] text-[#aaa]">3</span>
        </div>
        
        {isOpen ? <ChevronUp className="w-4 h-4 text-[#888]" /> : <ChevronDown className="w-4 h-4 text-[#888]" />}
      </button>
    </div>
  );
}
