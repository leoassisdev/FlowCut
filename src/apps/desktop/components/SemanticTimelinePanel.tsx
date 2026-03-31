import { useProjectStore } from '../store/project-store';
import { Video, Mic, Scissors, MousePointer2, Crosshair, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export default function SemanticTimelinePanel() {
  const project = useProjectStore((s) => s.project);
  const currentPlaybackMs = useProjectStore((s) => s.currentPlaybackMs);
  const requestSeek = useProjectStore((s) => s.requestSeek);
  const isRebuilding = useProjectStore((s) => s.isRebuilding);
  const activeTool = useProjectStore((s) => s.activeTool);
  const setActiveTool = useProjectStore((s) => s.setActiveTool);
  const splitCut = useProjectStore((s) => s.splitCut);
  const rippleTrim = useProjectStore((s) => s.rippleTrim);
  const updateCutBounds = useProjectStore((s) => s.updateCutBounds);
  const setCutVolume = useProjectStore((s) => s.setCutVolume);
  const selectedCutId = useProjectStore((s) => s.selectedCutId);
  const setSelectedCutId = useProjectStore((s) => s.setSelectedCutId);
  const deleteCut = useProjectStore((s) => s.deleteCut);
  const isPlaying = useProjectStore((s) => s.isPlaying);

  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hoverMs, setHoverMs] = useState(0);
  const [isSnapMode, setIsSnapMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [selectedCutIds, setSelectedCutIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ startPct: number; endPct: number } | null>(null);
  const marqueeStartPctRef = useRef(0);
  const marqueeCurrentPctRef = useRef(0);
  const isMarqueeActiveRef = useRef(false);
  const didMarqueeDragRef = useRef(false);
  const suppressClickRef = useRef(false);

  const totalDuration = project?.sourceVideo?.durationMs || 1;
  const cuts = project?.semanticTimeline?.cuts || [];
  const thumbsDir = (project?.sourceVideo as any)?.thumbsDir;

  const clampZoom = useCallback((z: number) => Math.max(1, Math.min(20, z)), []);

  const getPctFromMouseEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!scrollContainerRef.current) return 0;
    const rect = scrollContainerRef.current.getBoundingClientRect();
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const totalWidth = scrollContainerRef.current.scrollWidth;
    const xInContainer = e.clientX - rect.left + scrollLeft;
    return Math.max(0, Math.min(1, xInContainer / totalWidth));
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const pct = getPctFromMouseEvent(e);
    const timeMs = pct * totalDuration;
    setHoverMs(timeMs);
    if (isSnapMode && !isPlaying) requestSeek(timeMs);
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== 'selection' || e.button !== 0) return;

    const target = e.target as HTMLElement;
    if (target.closest('[data-cut-item="true"]')) return;

    const startPct = getPctFromMouseEvent(e);
    marqueeStartPctRef.current = startPct;
    marqueeCurrentPctRef.current = startPct;
    isMarqueeActiveRef.current = true;
    didMarqueeDragRef.current = false;
    setMarquee({ startPct, endPct: startPct });

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isMarqueeActiveRef.current) return;
      const currentPct = getPctFromMouseEvent(moveEvent);
      marqueeCurrentPctRef.current = currentPct;
      if (Math.abs(currentPct - marqueeStartPctRef.current) > 0.002) {
        didMarqueeDragRef.current = true;
      }
      setMarquee({ startPct: marqueeStartPctRef.current, endPct: currentPct });
    };

    const onMouseUp = () => {
      if (didMarqueeDragRef.current) {
        const minPct = Math.min(marqueeStartPctRef.current, marqueeCurrentPctRef.current);
        const maxPct = Math.max(marqueeStartPctRef.current, marqueeCurrentPctRef.current);
        const minMs = minPct * totalDuration;
        const maxMs = maxPct * totalDuration;

        const ids = cuts
          .filter((cut) => cut.endMs >= minMs && cut.startMs <= maxMs)
          .map((cut) => cut.id);

        setSelectedCutIds(ids);
        setSelectedCutId(ids[0] ?? null);
        suppressClickRef.current = true;
      }

      isMarqueeActiveRef.current = false;
      setMarquee(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.5 : 0.5;
        setZoomLevel((prev) => clampZoom(prev + delta));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [clampZoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'v') setActiveTool('selection');
      if (key === 'b') setActiveTool('blade');
      if (key === 's') setIsSnapMode((prev) => !prev);
      if (key === 'q') rippleTrim(isSnapMode ? hoverMs : currentPlaybackMs, 'left');
      if (key === 'w') rippleTrim(isSnapMode ? hoverMs : currentPlaybackMs, 'right');

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCutIds.length > 0) {
          selectedCutIds.forEach((id) => deleteCut(id));
          setSelectedCutIds([]);
          setSelectedCutId(null);
        } else if (selectedCutId) {
          deleteCut(selectedCutId);
          setSelectedCutIds([]);
          setSelectedCutId(null);
        }
      }

      if (e.shiftKey) {
        if (e.key === 'ArrowLeft') requestSeek(0);
        if (e.key === 'ArrowRight') requestSeek(totalDuration);
      } else if (e.metaKey || e.ctrlKey) {
        if (e.key === 'ArrowLeft') {
          const prevCut = [...cuts].reverse().find((c) => c.startMs < currentPlaybackMs - 100);
          if (prevCut) requestSeek(prevCut.startMs);
        }
        if (e.key === 'ArrowRight') {
          const nextCut = cuts.find((c) => c.startMs > currentPlaybackMs + 100);
          if (nextCut) requestSeek(nextCut.startMs);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentPlaybackMs,
    hoverMs,
    isSnapMode,
    selectedCutId,
    selectedCutIds,
    setActiveTool,
    rippleTrim,
    requestSeek,
    deleteCut,
    cuts,
    totalDuration,
    setSelectedCutId,
  ]);

  useEffect(() => {
    if (!project?.sourceVideo?.audioPath) {
      setAudioUrl(null);
      return;
    }

    if (IS_TAURI) {
      import('@tauri-apps/api/core').then(({ convertFileSrc }) =>
        setAudioUrl(convertFileSrc(project.sourceVideo!.audioPath!)),
      );
    } else {
      setAudioUrl(project.sourceVideo.audioPath);
    }
  }, [project?.sourceVideo?.audioPath]);

  useEffect(() => {
    if (!waveformRef.current || !audioUrl) return;

    wavesurfer.current = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4f6ef7',
      progressColor: 'transparent',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      height: 48,
      interact: false,
      normalize: true,
    });

    wavesurfer.current.load(audioUrl);
    return () => wavesurfer.current?.destroy();
  }, [audioUrl]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (activeTool === 'blade') {
      const pct = getPctFromMouseEvent(e);
      splitCut(pct * totalDuration);
      setActiveTool('selection');
      setSelectedCutIds([]);
      setSelectedCutId(null);
      return;
    }

    if (activeTool === 'selection') {
      setSelectedCutIds([]);
      setSelectedCutId(null);
    }
  };

  const handleDragEdge = (
    e: React.MouseEvent,
    cutId: string,
    edge: 'left' | 'right',
    currentStart: number,
    currentEnd: number,
  ) => {
    e.stopPropagation();
    if (activeTool !== 'selection') return;

    const startX = e.clientX;

    const onMouseMoveWindow = (moveEvent: MouseEvent) => {
      if (!scrollContainerRef.current) return;
      const totalWidth = scrollContainerRef.current.scrollWidth;
      const deltaX = moveEvent.clientX - startX;
      const deltaMs = (deltaX / totalWidth) * totalDuration;

      if (edge === 'left') {
        updateCutBounds(cutId, Math.min(currentStart + deltaMs, currentEnd - 100), currentEnd);
      } else {
        updateCutBounds(cutId, currentStart, Math.max(currentEnd + deltaMs, currentStart + 100));
      }
    };

    const onMouseUpWindow = () => {
      window.removeEventListener('mousemove', onMouseMoveWindow);
      window.removeEventListener('mouseup', onMouseUpWindow);
    };

    window.addEventListener('mousemove', onMouseMoveWindow);
    window.addEventListener('mouseup', onMouseUpWindow);
  };

  const handleVolumeDrag = (e: React.MouseEvent, cutId: string, currentVol: number) => {
    e.stopPropagation();

    const startY = e.clientY;
    const onMouseMoveWindow = (moveEvent: MouseEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newVol = Math.max(0, Math.min(2.0, currentVol + deltaY / 50));
      setCutVolume(cutId, newVol);
    };

    const onMouseUpWindow = () => {
      window.removeEventListener('mousemove', onMouseMoveWindow);
      window.removeEventListener('mouseup', onMouseUpWindow);
    };

    window.addEventListener('mousemove', onMouseMoveWindow);
    window.addEventListener('mouseup', onMouseUpWindow);
  };

  const getThumbnailSrc = (timeMs: number) => {
    if (!thumbsDir || !IS_TAURI) return undefined;
    const second = Math.floor(timeMs / 1000) + 1;
    const pad = String(second).padStart(4, '0');
    return `asset://${thumbsDir}/thumb_${pad}.jpg`;
  };

  if (!project || !project.semanticTimeline) {
    return (
      <div className="h-[320px] bg-[#0a0a0c] border-t border-[#1a1a20] flex-col">
        <div className="flex-1 flex items-center justify-center text-xs text-[#333] font-mono tracking-widest uppercase">
          No timeline data
        </div>
      </div>
    );
  }

  const progressPct = Math.max(0, Math.min(100, (currentPlaybackMs / totalDuration) * 100));
  const tickCount = Math.max(20, Math.round(20 * zoomLevel));
  const ticks = Array.from({ length: tickCount }).map((_, i) => i * (totalDuration / tickCount));

  return (
    <div className="h-[320px] bg-[#0a0a0c] border-t border-[#1a1a20] flex flex-col select-none">
      <div className="flex px-4 py-2 border-b border-[#1a1a20] shrink-0 justify-between items-center bg-[#070708]">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTool('selection')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors ${
              activeTool === 'selection'
                ? 'bg-primary/20 text-primary'
                : 'text-[#666] hover:bg-[#1a1a20] hover:text-[#aaa]'
            }`}
          >
            <MousePointer2 className="w-3 h-3" /> Seleção (V)
          </button>

          <button
            onClick={() => setActiveTool('blade')}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors ${
              activeTool === 'blade'
                ? 'bg-destructive/20 text-destructive'
                : 'text-[#666] hover:bg-[#1a1a20] hover:text-[#aaa]'
            }`}
          >
            <Scissors className="w-3 h-3" /> Cortar (B)
          </button>

          <button
            onClick={() => setIsSnapMode(!isSnapMode)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider transition-colors ${
              isSnapMode
                ? 'bg-emerald-500/20 text-emerald-500'
                : 'text-[#666] hover:bg-[#1a1a20] hover:text-[#aaa]'
            }`}
          >
            <Crosshair className="w-3 h-3" /> Snap (S)
          </button>

          <div className="w-px h-5 bg-[#1c1c20] mx-1" />

          <button
            onClick={() => setZoomLevel(clampZoom(zoomLevel - 1))}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#666] hover:bg-[#1a1a20] hover:text-[#aaa] transition-colors"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono text-[#555] flex items-center">{zoomLevel.toFixed(1)}x</span>
          <button
            onClick={() => setZoomLevel(clampZoom(zoomLevel + 1))}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-[#666] hover:bg-[#1a1a20] hover:text-[#aaa] transition-colors"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-[#555]">
            {Math.round(project.semanticTimeline.totalDurationMs / 1000)}s editado
          </span>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onMouseDown={handleTimelineMouseDown}
        onMouseMove={handleMouseMove}
        onClick={handleTimelineClick}
        className={`flex-1 relative overflow-x-auto overflow-y-hidden transition-opacity duration-300 ${
          isRebuilding ? 'opacity-50' : 'opacity-100'
        } ${activeTool === 'blade' ? 'cursor-crosshair' : ''}`}
      >
        <div ref={timelineRef} style={{ width: `${zoomLevel * 100}%`, minWidth: '100%' }} className="h-full relative flex flex-col">
          <div className="h-6 border-b border-[#1a1a20] bg-[#0c0c0f] relative flex-shrink-0">
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

          {marquee && (
            <div
              className="absolute top-0 bottom-0 border border-primary/60 bg-primary/15 pointer-events-none z-40"
              style={{
                left: `${Math.min(marquee.startPct, marquee.endPct) * 100}%`,
                width: `${Math.abs(marquee.endPct - marquee.startPct) * 100}%`,
              }}
            />
          )}

          <div className="flex-1 relative flex flex-col py-4 pb-24 gap-2 bg-[#0a0a0c]">
            <div className="relative h-10 w-full bg-[#111115] border-y border-[#1a1a20] group">
              <div className="absolute left-2 top-0 bottom-0 flex items-center z-10 w-16 opacity-50 pointer-events-none">
                <Video className="w-3 h-3 text-[#aaa] mr-1" />
                <span className="text-[9px] font-mono text-[#aaa]">V1</span>
              </div>

              {cuts.map((cut, i) => {
                if (i === 0) return null;
                const prevCut = cuts[i - 1];
                if (cut.startMs > prevCut.endMs) {
                  return (
                    <div
                      key={`gap-${i}`}
                      className="absolute h-full bg-destructive/10 border-x border-destructive/20 z-0 pointer-events-none"
                      style={{
                        left: `${(prevCut.endMs / totalDuration) * 100}%`,
                        width: `${((cut.startMs - prevCut.endMs) / totalDuration) * 100}%`,
                      }}
                    />
                  );
                }
                return null;
              })}

              {cuts.map((cut) => {
                const isSelected = selectedCutId === cut.id || selectedCutIds.includes(cut.id);
                const thumbUrl = getThumbnailSrc(cut.startMs);

                return (
                  <div
                    data-cut-item="true"
                    key={`v-${cut.id}`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (suppressClickRef.current) {
                        suppressClickRef.current = false;
                        return;
                      }

                      if (activeTool === 'blade') {
                        const pct = getPctFromMouseEvent(e);
                        splitCut(pct * totalDuration);
                        setActiveTool('selection');
                        setSelectedCutIds([]);
                        setSelectedCutId(null);
                      } else if (activeTool === 'selection') {
                        setSelectedCutIds([cut.id]);
                        setSelectedCutId(cut.id);
                      }
                    }}
                    className={`absolute h-full bg-[#4f6ef7]/20 border rounded-sm flex items-center group/clip transition-colors cursor-pointer overflow-hidden ${
                      isSelected
                        ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)] z-20'
                        : 'border-[#4f6ef7]/40 hover:border-[#4f6ef7] z-10'
                    }`}
                    style={{
                      left: `${(cut.startMs / totalDuration) * 100}%`,
                      width: `${((cut.endMs - cut.startMs) / totalDuration) * 100}%`,
                    }}
                  >
                    {thumbUrl ? (
                      <div
                        className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
                        style={{
                          backgroundImage: `url('${thumbUrl}')`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'left center',
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 opacity-10 pointer-events-none"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.1) 5px, rgba(255,255,255,0.1) 10px)',
                        }}
                      />
                    )}

                    {activeTool === 'selection' && (
                      <>
                        <div
                          onMouseDown={(e) => handleDragEdge(e, cut.id, 'left', cut.startMs, cut.endMs)}
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-yellow-400 opacity-0 group-hover/clip:opacity-100 transition-opacity z-30"
                        />
                        <div
                          onMouseDown={(e) => handleDragEdge(e, cut.id, 'right', cut.startMs, cut.endMs)}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-yellow-400 opacity-0 group-hover/clip:opacity-100 transition-opacity z-30"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative h-12 w-full bg-[#0d0d10] border-y border-[#1a1a20] overflow-hidden group">
              <div className="absolute left-2 top-0 bottom-0 flex items-center z-30 w-16 opacity-50 pointer-events-none">
                <Mic className="w-3 h-3 text-[#aaa] mr-1" />
                <span className="text-[9px] font-mono text-[#aaa]">A1</span>
              </div>

              <div className="absolute inset-0 w-full h-full z-0 opacity-80 mix-blend-screen pointer-events-none">
                <div ref={waveformRef} className="w-full h-full" />
              </div>

              {cuts.map((cut) => {
                const isSelected = selectedCutId === cut.id || selectedCutIds.includes(cut.id);
                const vol = (cut as any).volume ?? 1.0;
                const lineY = Math.max(0, Math.min(100, (1 - vol / 2) * 100));
                const isClipping = vol > 1.2;

                return (
                  <div
                    key={`a1-${cut.id}`}
                    className="absolute h-full border-x border-[#10b981]/40 z-10 overflow-hidden"
                    style={{
                      left: `${(cut.startMs / totalDuration) * 100}%`,
                      width: `${((cut.endMs - cut.startMs) / totalDuration) * 100}%`,
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    {isClipping && (
                      <div
                        className="absolute inset-0 bg-gradient-to-b from-red-500/60 via-transparent to-red-500/60 pointer-events-none mix-blend-screen"
                        style={{ opacity: Math.min(1, (vol - 1.2) * 2) }}
                      />
                    )}

                    {isSelected && (
                      <div
                        className="absolute left-0 right-0 h-4 -mt-2 cursor-ns-resize flex items-center justify-center group/vol z-50"
                        style={{ top: `${lineY}%` }}
                        onMouseDown={(e) => handleVolumeDrag(e, cut.id, vol)}
                      >
                        <div className="w-full h-px bg-yellow-400 group-hover/vol:h-0.5 transition-all shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
                        <span className="absolute -top-4 text-[8px] bg-black/80 text-yellow-400 px-1 rounded opacity-0 group-hover/vol:opacity-100 pointer-events-none">
                          {Math.round(vol * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute top-0 bottom-0 w-px bg-primary z-50 pointer-events-none" style={{ left: `${progressPct}%` }}>
            <div className="absolute top-0 -left-1.5 w-3 h-3 bg-primary" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
            <div className="absolute inset-0 w-full h-full shadow-[0_0_10px_rgba(79,110,247,0.8)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
