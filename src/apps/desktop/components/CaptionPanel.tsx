import { useProjectStore } from '../store/project-store';
import { Type, AlignLeft, AlignCenter, AlignRight, Palette, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export default function CaptionPanel() {
  const project = useProjectStore((s) => s.project);
  const updateCaptionStyle = useProjectStore((s) => s.updateCaptionStyle);
  const updateCaptionBlock = useProjectStore((s) => s.updateCaptionBlock);
  const generateCaptions = useProjectStore((s) => s.generateCaptions);

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  if (!project?.captionTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#1a1a20] flex items-center justify-center">
          <Type className="w-6 h-6 text-[#555]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#eee]">Legendas não geradas</p>
          <p className="text-xs text-[#888] mt-1">Crie as legendas sincronizadas baseadas na sua transcrição final.</p>
        </div>
        <button 
          onClick={generateCaptions}
          className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/30 rounded text-xs font-semibold transition-colors"
        >
          Gerar Legendas
        </button>
      </div>
    );
  }

  const { style, blocks } = project.captionTrack;
  const customStyle = style as any; // Cast pra pegar os novos campos

  const saveBlockEdit = () => {
    if (editingBlockId && editingText.trim()) {
      updateCaptionBlock(editingBlockId, editingText);
    }
    setEditingBlockId(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* ── STYLING CONTROLS ── */}
      <div className="p-4 border-b border-[#1c1c20] bg-[#0a0a0c] space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[#eee] uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-3.5 h-3.5 text-primary" /> Estilo e Posição
          </h3>
          <button 
            onClick={() => updateCaptionStyle({ isVisible: !customStyle.isVisible })}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${customStyle.isVisible ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[#222] text-[#888]'}`}
          >
            {customStyle.isVisible ? <><Eye className="w-3 h-3" /> Visível</> : <><EyeOff className="w-3 h-3" /> Oculto</>}
          </button>
        </div>

        {/* Linha 1: Fonte e Tamanho */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#888]">Fonte</label>
            <select 
              value={style.fontFamily}
              onChange={(e) => updateCaptionStyle({ fontFamily: e.target.value })}
              className="w-full bg-[#111115] border border-[#222] rounded px-2 py-1 text-xs text-[#eee] outline-none focus:border-primary"
            >
              <option value="Montserrat">Montserrat</option>
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Courier New">Courier New</option>
              <option value="Impact">Impact</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="flex justify-between text-[10px] text-[#888]">
              <span>Tamanho</span>
              <span className="text-primary">{customStyle.fontSize}px</span>
            </label>
            <input 
              type="range" min="12" max="72" step="2"
              value={customStyle.fontSize ?? 24}
              onChange={(e) => updateCaptionStyle({ fontSize: Number(e.target.value) })}
              className="w-full accent-primary mt-1"
            />
          </div>
        </div>

        {/* Linha 2: Cor do Texto e Cor do Fundo */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#888]">Cor do Texto</label>
            <input 
              type="color" 
              value={style.color}
              onChange={(e) => updateCaptionStyle({ color: e.target.value })}
              className="w-full h-7 bg-[#111115] border border-[#222] rounded cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex justify-between text-[10px] text-[#888] items-center">
              <span>Cor do Fundo</span>
              <input 
                type="checkbox" 
                checked={customStyle.bgEnabled ?? true}
                onChange={(e) => updateCaptionStyle({ bgEnabled: e.target.checked })}
                className="w-3 h-3 accent-primary cursor-pointer"
                title="Ativar/Desativar Fundo"
              />
            </label>
            <input 
              type="color" 
              value={customStyle.backgroundColor ?? '#000000'}
              onChange={(e) => updateCaptionStyle({ backgroundColor: e.target.value })}
              disabled={!customStyle.bgEnabled}
              className={`w-full h-7 border rounded cursor-pointer transition-opacity ${customStyle.bgEnabled ? 'bg-[#111115] border-[#222]' : 'opacity-30 pointer-events-none'}`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-[#888]">Alinhamento do Texto</label>
          <div className="flex gap-2">
            {[
              { val: 'left', icon: AlignLeft },
              { val: 'center', icon: AlignCenter },
              { val: 'right', icon: AlignRight }
            ].map(({ val, icon: Icon }) => (
              <button
                key={val}
                onClick={() => updateCaptionStyle({ alignment: val as any })}
                className={`flex-1 py-1.5 flex items-center justify-center rounded border transition-colors ${style.alignment === val ? 'bg-primary/20 border-primary text-primary' : 'bg-[#111115] border-[#222] text-[#888] hover:border-[#444] hover:text-[#eee]'}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CAPTION BLOCKS (EDITOR) ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#070708]">
        {blocks.map((block, idx) => {
          const isEditing = editingBlockId === block.id;

          return (
            <div key={block.id} className="group relative flex flex-col bg-[#111115] border border-[#1c1c20] rounded p-2.5 hover:border-[#333] transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono text-primary/60">
                  {(block.startMs / 1000).toFixed(1)}s - {(block.endMs / 1000).toFixed(1)}s
                </span>
                <span className="text-[9px] text-[#555]">#{idx + 1}</span>
              </div>
              
              {isEditing ? (
                <textarea
                  autoFocus
                  defaultValue={block.text}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={saveBlockEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveBlockEdit();
                    }
                  }}
                  className="w-full bg-[#1a1a24] text-[#eee] text-xs border border-primary rounded p-1.5 outline-none resize-none"
                  rows={2}
                />
              ) : (
                <p 
                  onClick={() => {
                    setEditingBlockId(block.id);
                    setEditingText(block.text);
                  }}
                  className="text-xs text-[#ccc] cursor-text hover:bg-[#1a1a20] rounded p-1 -ml-1 transition-colors"
                >
                  {block.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}