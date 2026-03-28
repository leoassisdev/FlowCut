import { useProjectStore } from '../store/project-store';
import { Video, Type } from 'lucide-react';

export default function SemanticTimelinePanel() {
  const project = useProjectStore((s) => s.project);
  const currentPlaybackMs = useProjectStore((s) => (s as any).currentPlaybackMs);
  const isRebuilding = useProjectStore((s) => (s as any).isRebuilding);

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
    // Aumentei o espaço total (h-[320px]) para deixar a timeline super folgada e agradável
    <div className="h-[320px] bg-[#0a0a0c] border-t border-[#1a1a20] flex flex-col select-none">
      
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

      <div className={`flex-1 relative overflow-hidden flex flex-col transition-opacity duration-300 ${isRebuilding ? 'opacity-50' : 'opacity-100'}`}>
        
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

        {/* Adicionei um padding-bottom gigante (pb-24) para não ficar espremido no final da tela */}
        <div className="flex-1 relative flex flex-col py-4 pb-24 gap-2 overflow-y-auto overflow-x-hidden bg-[#0a0a0c]">
          
          <div className="relative h-12 w-full bg-[#111115] border-y border-[#1a1a20] group">
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
                  key={`a-${cut.id}`}
                  className="absolute h-full bg-[#10b981]/10 border border-[#10b981]/30 rounded-sm flex items-center px-1 overflow-hidden"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <span className="text-[8px] text-[#10b981]/80 font-mono truncate whitespace-nowrap">{cut.label}</span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Agulha Laser */}
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