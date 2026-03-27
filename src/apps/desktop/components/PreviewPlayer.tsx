import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, Scissors } from 'lucide-react';
import type { SourceVideo } from '@/packages/shared-types';
import { formatDuration } from '@/apps/desktop/services/mappers';
import { useState, useRef, useCallback } from 'react';

interface Props {
  sourceVideo: SourceVideo | null;
}

export default function PreviewPlayer({ sourceVideo }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0.33);
  const [isDragging, setIsDragging] = useState(false);
  const scrubRef = useRef<HTMLDivElement>(null);

  const totalMs = sourceVideo?.durationMs ?? 185000;
  const currentMs = Math.round(progress * totalMs);

  const handleScrubClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRef.current) return;
    const rect = scrubRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setProgress(pct);
  }, []);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const frame = Math.floor((ms % 1000) / (1000 / 30));
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-hidden">

      {/* ── Video Canvas ── */}
      <div className="flex-1 flex items-center justify-center relative bg-[#070708] min-h-0">
        <div className="relative w-full max-w-[720px] aspect-video bg-[#0d0d10] border border-[#1a1a20] rounded-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">

          {/* Mock video frame with scanline effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] via-[#080810] to-[#0a0a0d]" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
            }}
          />

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border border-[#1e1e28] flex items-center justify-center">
              <Play className="w-4 h-4 text-[#2a2a35] ml-0.5" />
            </div>
            {sourceVideo && (
              <p className="text-[10px] font-mono text-[#222228] tracking-widest">
                {sourceVideo.fileName} · {sourceVideo.width}×{sourceVideo.height} · {sourceVideo.fps}fps
              </p>
            )}
          </div>

          {/* Timecode overlay */}
          <div className="absolute top-2 left-3">
            <span className="font-mono text-[11px] text-[#4f6ef7]/60 tracking-widest bg-black/40 px-1.5 py-0.5 rounded-sm">
              {formatMs(currentMs)}
            </span>
          </div>

          {/* Caption preview overlay */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-black/70 px-4 py-1.5 rounded-sm max-w-[80%]">
              <p className="text-[13px] text-white/90 text-center font-medium leading-relaxed tracking-wide">
                {isPlaying ? 'Playing preview...' : 'Caption overlay preview'}
              </p>
            </div>
          </div>

          {/* MOCK badge */}
          <div className="absolute top-2 right-3">
            <span className="text-[9px] font-mono text-[#f7804f]/40 tracking-widest">MOCK</span>
          </div>
        </div>
      </div>

      {/* ── Transport Bar ── */}
      <div className="flex-shrink-0 bg-[#0c0c0f] border-t border-[#181820]">

        {/* Scrub bar */}
        <div
          ref={scrubRef}
          className="h-1.5 bg-[#111116] cursor-pointer relative group"
          onClick={handleScrubClick}
        >
          {/* Played */}
          <div
            className="absolute left-0 top-0 h-full bg-[#4f6ef7]/70 transition-all"
            style={{ width: `${progress * 100}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#4f6ef7] rounded-full shadow-[0_0_6px_rgba(79,110,247,0.8)] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
            style={{ left: `${progress * 100}%` }}
          />
          {/* Cut markers (mock) */}
          {[0.15, 0.42, 0.67, 0.88].map((p) => (
            <div
              key={p}
              className="absolute top-0 h-full w-px bg-[#2a2a35]"
              style={{ left: `${p * 100}%` }}
            />
          ))}
        </div>

        {/* Controls row */}
        <div className="h-10 flex items-center px-3 gap-1">
          {/* Transport */}
          <button
            className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors"
            title="Skip to start"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            className="w-8 h-8 flex items-center justify-center rounded bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 text-[#4f6ef7] hover:bg-[#4f6ef7]/20 transition-all"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying
              ? <Pause className="w-3.5 h-3.5" />
              : <Play className="w-3.5 h-3.5 ml-0.5" />
            }
          </button>

          <button
            className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors"
            title="Skip to end"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Timecode */}
          <div className="ml-2 flex items-center gap-1">
            <span className="font-mono text-[11px] text-[#aaa] tracking-wider">{formatMs(currentMs)}</span>
            <span className="font-mono text-[11px] text-[#333]">/</span>
            <span className="font-mono text-[11px] text-[#333] tracking-wider">
              {sourceVideo ? formatDuration(sourceVideo.durationMs) : '00:00'}
            </span>
          </div>

          <div className="flex-1" />

          {/* Right controls */}
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Volume">
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Split at playhead">
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Fullscreen">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Playback mode */}
          <div className="ml-1 flex gap-0.5">
            {['1x', '1.5x', '2x'].map((speed) => (
              <button
                key={speed}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  speed === '1x' ? 'bg-[#1e1e28] text-[#666]' : 'text-[#2a2a35] hover:text-[#555]'
                }`}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
