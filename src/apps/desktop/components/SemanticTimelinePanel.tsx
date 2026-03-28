import { useProjectStore } from '../store/project-store';
import { Video, Type, Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function SemanticTimelinePanel() {
  const project = useProjectStore((s) => s.project);
  const currentPlaybackMs = useProjectStore((s) => (s as any).currentPlaybackMs);
  const isRebuilding = useProjectStore((s) => (s as any).isRebuilding);

  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // 1. Resolve a URL do Áudio (Lendo do Disco via Tauri)
  useEffect(() => {
    if (!project?.sourceVideo?.audioPath) {
      setAudioUrl(null);
      return;
    }
    
    if (IS_TAURI) {
      import('@tauri-apps/api/core').then(({ convertFileSrc }) => {
        setAudioUrl(convertFileSrc(project.sourceVideo.audioPath!));
      });
    } else {
      setAudioUrl(project.sourceVideo.audioPath);
    }
  }, [project?.sourceVideo?.audioPath]);

  // 2. Inicializa o WaveSurfer para desenhar a onda sonora linda
  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f6ef7', // Azul Tech que você pediu
      progressColor: 'transparent', // Escondemos o progresso dele pra usar a nossa Agulha Laser
      cursorWidth: 0,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 48,
      interact: false, // Desativa o clique nele para não brigar com o nosso player
      normalize: true,
    });

    wavesurfer.current.load(audioUrl);

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  if (!project || !project.semanticTimeline) {
    return (
      <div className="h-[320px] bg-[#0a0a0c] border-t border-[#1a1a20] flex flex-col">
        <div className="flex px-4 py-2 border-b border-[#1a1a20] shrink-0 gap-6">
          <span className="text-[10px] font-bold tracking-wider text-primary border-b-2 border-primary pb-2 -mb-[9px] uppercase">Timeline</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-[#333] font-mono tracking-widest uppercase">No timeline data</p>
        </div>
      </div>
    );
  }

  const totalDuration = project.sourceVideo.durationMs || 1;
  const progressPct = Math.max(0, Math.min(100, (currentPlaybackMs / totalDuration) * 100));
  const ticks = Array.from({ length: 20 }).map((_, i) => i * (totalDuration / 20));

  return (
    <div className="h-[320px] bg-[#0a0a0c] border-t border-[#1a1a20] flex flex-col select-none">
      
      {/* ─── Header ─── */}
      <div className="flex px-4 py-2 border-b border-[#1a1a20] shrink-0 justify-between items-center bg-[#070708]">
        <div className="flex gap-6">
          <span className="text-[10px] font-bold tracking-wider text-primary border-b-2 border-primary pb-2 -mb-[9px] uppercase">Timeline</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#555]">
            {Math.round(project.semanticTimeline.totalDurationMs / 1000)}s editado / {Math.round(totalDuration / 1000)}s original
          </span>
        </div>
      </div>

      {/* ─── Corpo da Timeline ─── */}
      <div className={`flex-1 relative overflow-hidden flex flex-col transition-opacity duration-300 ${isRebuilding ? 'opacity-50' : 'opacity-100'}`}>
        
        {/* Régua Superior */}
        <div className="h-6 border-b border-[#1a1a20] bg-[#0c0c0f] relative overflow-hidden flex-shrink-0">
          {ticks.map((tick, i) => (
            <div 
              key={i} 
              className="absolute top-0 bottom-0 border-l border-[#2a2a35] flex flex-col justify-end pb-1 pl-1"
              style={{ left: `${(tick / totalDuration) * 100}%` }}
            >
              <span className="text-[8px] font-mono text-[#555] leading-none">
                00:{(tick / 1000).toFixed(0).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        <div className="flex-1 relative flex flex-col py-4 pb-24 gap-2 overflow-y-auto overflow-x-hidden bg-[#0a0a0c]">
          
          {/* TRILHA 1: VÍDEO */}
          <div className="relative h-10 w-full bg-[#111115] border-y border-[#1a1a20] group">
            <div className="absolute left-2 top-0 bottom-0 flex items-center z-10 w-16 opacity-50 group-hover:opacity-100 transition-opacity">
              <Video className="w-3 h-3 text-[#aaa] mr-1" />
              <span className="text-[9px] font-mono text-[#aaa]">V1</span>
            </div>
            {project.semanticTimeline.cuts.map((cut) => {
              const leftPct = (cut.startMs / totalDuration) * 100;
              const widthPct = ((cut.endMs - cut.startMs) / totalDuration) * 100;
              return (
                <div
                  key={`v-${cut.id}`}
                  className="absolute h-full bg-[#4f6ef7]/20 border border-[#4f6ef7]/40 rounded-sm overflow-hidden flex items-center"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div className="w-full h-full opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)' }} />
                </div>
              );
            })}
          </div>

          {/* TRILHA 2: ONDAS DE ÁUDIO (A MÁGICA ESTÁ AQUI) */}
          <div className="relative h-12 w-full bg-[#0d0d10] border-y border-[#1a1a20] group overflow-hidden">
            
            {/* Label da Trilha */}
            <div className="absolute left-2 top-0 bottom-0 flex items-center z-30 w-16 opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Mic className="w-3 h-3 text-[#aaa] mr-1" />
              <span className="text-[9px] font-mono text-[#aaa]">A1</span>
            </div>

            {/* Container do WaveSurfer */}
            <div className="absolute inset-0 w-full h-full z-0 opacity-80 mix-blend-screen">
              <div ref={waveformRef} className="w-full h-full" />
            </div>

            {/* Overlay dos Cortes Mantidos (Fica verde por cima do áudio que sobrou) */}
            {project.semanticTimeline.cuts.map((cut) => {
              const leftPct = (cut.startMs / totalDuration) * 100;
              const widthPct = ((cut.endMs - cut.startMs) / totalDuration) * 100;
              return (
                <div
                  key={`a1-${cut.id}`}
                  className="absolute h-full border-x border-[#10b981]/40 z-10 pointer-events-none"
                  style={{ 
                    left: `${leftPct}%`, 
                    width: `${widthPct}%`, 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)' 
                  }}
                />
              );
            })}
          </div>

          {/* TRILHA 3: TEXTO (CORTES) */}
          <div className="relative h-8 w-full bg-[#111115] border-y border-[#1a1a20] group">
            <div className="absolute left-2 top-0 bottom-0 flex items-center z-10 w-16 opacity-50 group-hover:opacity-100 transition-opacity">
              <Type className="w-3 h-3 text-[#aaa] mr-1" />
              <span className="text-[9px] font-mono text-[#aaa]">TXT</span>
            </div>
            {project.semanticTimeline.cuts.map((cut) => {
              const leftPct = (cut.startMs / totalDuration) * 100;
              const widthPct = ((cut.endMs - cut.startMs) / totalDuration) * 100;
              return (
                <div
                  key={`t-${cut.id}`}
                  className="absolute h-full bg-[#10b981]/10 border border-[#10b981]/30 rounded-sm flex items-center px-1 overflow-hidden"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <span className="text-[8px] text-[#10b981]/80 font-mono truncate whitespace-nowrap">{cut.label}</span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Agulha Laser em Tempo Real */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-primary z-50 pointer-events-none transition-all duration-75 ease-linear"
          style={{ left: `${progressPct}%` }}
        >
          <div className="absolute top-0 -left-1.5 w-3 h-3 bg-primary" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          <div className="absolute inset-0 w-full h-full shadow-[0_0_10px_rgba(79,110,247,0.8)]" />
        </div>

      </div>
    </div>
  );
}