/**
 * Caption panel — style editor, mode selector, preview, and safe area guides.
 * MOCK: Captions are generated from mock transcript data.
 */

import { useState } from 'react';
import { useProjectStore } from '@/apps/desktop/store/project-store';
import type { CaptionStyle } from '@/packages/shared-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Subtitles, Palette, Monitor } from 'lucide-react';

type CaptionMode = 'simple' | 'karaoke' | 'animated-planned';

const CAPTION_MODES: { value: CaptionMode; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simples', desc: 'Texto estático por segmento' },
  { value: 'karaoke', label: 'Karaoke', desc: 'Destaque palavra a palavra' },
  { value: 'animated-planned', label: 'Animado (Planejado)', desc: 'PLACEHOLDER — animações futuras' },
];

const POSITIONS: CaptionStyle['position'][] = ['bottom', 'center', 'top'];
const ANIMATIONS: CaptionStyle['animation'][] = ['none', 'word-highlight', 'karaoke'];

export default function CaptionPanel() {
  const { project, generateCaptions, updateCaptionStyle } = useProjectStore();
  const [mode, setMode] = useState<CaptionMode>('simple');
  const captionTrack = project?.captionTrack;

  if (!captionTrack) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Subtitles className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Legendas</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
          <p className="text-sm text-muted-foreground text-center">
            Nenhuma legenda gerada.
          </p>
          <Button size="sm" variant="outline" onClick={generateCaptions} className="gap-1">
            <Subtitles className="w-3 h-3" /> Gerar Legendas (Mock)
          </Button>
        </div>
      </div>
    );
  }

  const style = captionTrack.style;

  const handleStyleChange = (partial: Partial<CaptionStyle>) => {
    updateCaptionStyle({ ...style, ...partial });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Subtitles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium">Legendas</h3>
        <span className="text-xs text-muted-foreground ml-auto font-mono">{captionTrack.segments.length} cues</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Modo</label>
            <div className="grid grid-cols-1 gap-1.5">
              {CAPTION_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`text-left p-2 rounded border text-xs transition-colors ${
                    mode === m.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-muted-foreground mt-0.5">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Style Editor */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3 h-3" /> Estilo
            </label>

            {/* Position */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Posição</span>
              <div className="flex gap-1">
                {POSITIONS.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => handleStyleChange({ position: pos })}
                    className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                      style.position === pos
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Animação</span>
              <div className="flex gap-1">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim}
                    onClick={() => handleStyleChange({ animation: anim })}
                    className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                      style.animation === anim
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    {anim === 'none' ? 'Nenhuma' : anim === 'word-highlight' ? 'Destaque' : 'Karaoke'}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Tamanho: {style.fontSize}px</span>
              <input
                type="range"
                min={24}
                max={96}
                value={style.fontSize}
                onChange={(e) => handleStyleChange({ fontSize: Number(e.target.value) })}
                className="w-full accent-primary h-1"
              />
            </div>
          </div>

          {/* Preview Mock */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Preview
            </label>
            <div className="relative bg-background rounded-lg border border-border aspect-video flex items-end justify-center overflow-hidden">
              {/* Safe area guides */}
              <div className="absolute inset-[10%] border border-dashed border-muted-foreground/20 rounded pointer-events-none" />
              <div className="absolute top-1 left-1 text-[8px] text-muted-foreground/30 font-mono">SAFE AREA</div>

              {/* Caption preview */}
              <div
                className={`px-3 py-1.5 rounded text-center max-w-[80%] ${
                  style.position === 'top' ? 'absolute top-[12%]' :
                  style.position === 'center' ? 'absolute top-1/2 -translate-y-1/2' :
                  'mb-[12%]'
                }`}
                style={{
                  fontSize: `${Math.max(style.fontSize / 5, 8)}px`,
                  backgroundColor: style.backgroundColor,
                  color: style.color,
                  fontFamily: style.fontFamily,
                }}
              >
                {captionTrack.segments[0]?.text.slice(0, 60) ?? 'Legenda de exemplo'}
              </div>
            </div>
          </div>

          {/* Caption Cues List */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cues</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {captionTrack.segments.slice(0, 10).map((seg, i) => (
                <div key={i} className="p-2 rounded bg-card border border-border text-xs">
                  <span className="text-muted-foreground font-mono">
                    {Math.floor(seg.startMs / 1000)}s–{Math.floor(seg.endMs / 1000)}s
                  </span>
                  <p className="mt-0.5 text-foreground truncate">{seg.text}</p>
                </div>
              ))}
              {captionTrack.segments.length > 10 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{captionTrack.segments.length - 10} mais
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-status-warning font-mono bg-muted p-2 rounded">
            ⚠ MOCK — Legendas geradas de dados fictícios
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
