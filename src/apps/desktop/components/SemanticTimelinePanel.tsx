import type { SemanticTimeline, TimelineCut } from '@/packages/shared-types';
import { useState, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Bookmark } from 'lucide-react';

interface Props {
  timeline: SemanticTimeline | null;
}

const TRACK_COLORS: Record<TimelineCut['type'], { bg: string; border: string; label: string }> = {
  keep:   { bg: 'bg-[#1a2a4a]',   border: 'border-[#2a4a8a]',   label: 'text-[#4f6ef7]' },
  remove: { bg: 'bg-[#2a1a1a]',   border: 'border-[#5a2a2a]',   label: 'text-[#cc4444]' },
  broll:  { bg: 'bg-[#1a2a1a]',   border: 'border-[#2a5a2a]',   label: 'text-[#4faa4f]' },
  pause:  { bg: 'bg-[#1e1e24]',   border: 'border-[#2a2a35]',   label: 'text-[#555]' },
};

const TRACKS = [
  { id: 'video',    label: 'VIDEO',  height: 'h-7' },
  { id: 'audio',    label: 'AUDIO',  height: 'h-5' },
  { id: 'cuts',     label: 'CUTS',   height: 'h-5' },
  { id: 'broll',    label: 'B-ROLL', height: 'h-4' },
];

export default function SemanticTimelinePanel({ timeline }: Props) {
  const [zoom, setZoom] = useState(1);
  const [playhead, setPlayhead] = useState(0.33);
  const [hoveredCut, setHoveredCut] = useState<string | null>(null);
  const [markers, setMarkers] = useState<number[]>([]);
  const railRef = useRef<HTMLDivElement>(null);

  const handleRailClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setPlayhead(pct);
  }, []);

  const addMarker = useCallback(() => {
    setMarkers(prev => [...prev, playhead]);
  }, [playhead]);

  if (!timeline) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[11px] font-mono text-[#222]">No timeline data</p>
      </div>
    );
  }

  const totalMs = timeline.originalDurationMs || 1;

  return (
    <div className="h-full flex flex-col bg-[#090909] overflow-hidden font-mono">

      {/* Controls bar */}
      <div className="h-6 flex items-center px-3 gap-2 flex-shrink-0 border-b border-[#141418]">
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.5))}
          className="w-5 h-5 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-3 h-3" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
          className="w-5 h-5 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-3 h-3" />
        </button>
        <span className="text-[9px] text-[#2a2a35]">{zoom}x</span>

        <div className="flex-1" />

        <button
          onClick={addMarker}
          className="flex items-center gap-1 text-[9px] text-[#333] hover:text-[#f7c84f] transition-colors"
          title="Add marker at playhead"
        >
          <Bookmark className="w-3 h-3" />
          Marker
        </button>

        <span className="text-[9px] text-[#222]">
          {timeline.cuts.filter(c => c.type === 'keep').length} cuts ·{' '}
          {Math.round((1 - timeline.totalDurationMs / timeline.originalDurationMs) * 100)}% removed
        </span>
      </div>

      {/* Timeline tracks */}
      <div className="flex-1 flex overflow-hidden">

        {/* Track labels */}
        <div className="w-14 flex-shrink-0 border-r border-[#141418] flex flex-col justify-around py-1">
          {TRACKS.map(track => (
            <div key={track.id} className="flex items-center px-2">
              <span className="text-[8px] text-[#2a2a35] tracking-widest">{track.label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable track area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div
            ref={railRef}
            className="h-full relative cursor-crosshair"
            style={{ minWidth: `${100 * zoom}%`, width: `${100 * zoom}%` }}
            onClick={handleRailClick}
          >
            {/* Time ruler */}
            <div className="h-4 border-b border-[#141418] flex-shrink-0 relative">
              {Array.from({ length: Math.ceil(totalMs / 5000) }).map((_, i) => {
                const pct = (i * 5000) / totalMs * 100;
                const s = i * 5;
                return (
                  <div
                    key={i}
                    className="absolute top-0 h-full flex items-center"
                    style={{ left: `${pct}%` }}
                  >
                    <div className="w-px h-2 bg-[#1e1e24]" />
                    <span className="text-[8px] text-[#2a2a35] ml-0.5">
                      {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Track rows */}
            <div className="flex flex-col gap-0.5 py-1">
              {TRACKS.map((track) => (
                <div key={track.id} className={`${track.height} relative flex items-center`}>
                  {/* Track background */}
                  <div className="absolute inset-0 bg-[#0c0c0f]" />

                  {/* Cuts */}
                  {track.id !== 'audio' && timeline.cuts.map((cut) => {
                    const left = (cut.startMs / totalMs) * 100;
                    const width = Math.max(((cut.endMs - cut.startMs) / totalMs) * 100, 0.2);
                    const colors = TRACK_COLORS[cut.type];
                    if (track.id === 'broll' && cut.type !== 'broll') return null;

                    return (
                      <div
                        key={cut.id}
                        className={`absolute top-0.5 bottom-0.5 ${colors.bg} border ${colors.border} rounded-sm cursor-pointer transition-opacity ${
                          hoveredCut === cut.id ? 'opacity-100' : 'opacity-70'
                        }`}
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '3px' }}
                        onMouseEnter={() => setHoveredCut(cut.id)}
                        onMouseLeave={() => setHoveredCut(null)}
                        title={`${cut.type.toUpperCase()} · ${cut.label} · ${Math.round((cut.endMs - cut.startMs) / 1000)}s`}
                      />
                    );
                  })}

                  {/* Audio waveform mock (audio track only) */}
                  {track.id === 'audio' && (
                    <div className="absolute inset-0 flex items-center overflow-hidden">
                      {Array.from({ length: 200 }).map((_, i) => {
                        const h = Math.abs(Math.sin(i * 0.4) * Math.cos(i * 0.15)) * 60 + 5;
                        return (
                          <div
                            key={i}
                            className="flex-1 bg-[#2a4a3a] opacity-60"
                            style={{ height: `${h}%`, minWidth: '1px' }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-10"
              style={{ left: `${playhead * 100}%` }}
            >
              <div className="w-px h-full bg-[#4f6ef7]/80" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '6px solid #4f6ef7',
                }}
              />
            </div>

            {/* Markers */}
            {markers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 pointer-events-none z-10"
                style={{ left: `${m * 100}%` }}
              >
                <div className="w-px h-full bg-[#f7c84f]/40" />
                <div className="absolute top-3 -translate-x-1/2">
                  <Bookmark className="w-2.5 h-2.5 text-[#f7c84f]/60 fill-current" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mini-map */}
      <div className="h-4 bg-[#080808] border-t border-[#141418] flex-shrink-0 relative overflow-hidden">
        <div className="h-full flex items-center gap-px px-14">
          {timeline.cuts.map((cut) => {
            const width = Math.max(((cut.endMs - cut.startMs) / totalMs) * 100, 0.2);
            return (
              <div
                key={cut.id}
                className={`h-2 flex-shrink-0 rounded-sm opacity-50 ${
                  cut.type === 'keep' ? 'bg-[#4f6ef7]' :
                  cut.type === 'remove' ? 'bg-[#cc4444]' :
                  cut.type === 'broll' ? 'bg-[#4faa4f]' : 'bg-[#333]'
                }`}
                style={{ width: `${width}%` }}
              />
            );
          })}
        </div>
        {/* Viewport indicator */}
        <div
          className="absolute top-0 h-full border border-[#4f6ef7]/30 bg-[#4f6ef7]/5 pointer-events-none"
          style={{ left: '0%', width: `${100 / zoom}%` }}
        />
      </div>
    </div>
  );
}
