import { Play, Pause, Square, SkipBack, SkipForward, Maximize2, Volume2, VolumeX, Scissors } from 'lucide-react';
import type { SourceVideo } from '@/packages/shared-types';
import { formatDuration } from '@/apps/desktop/services/mappers';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useProjectStore } from '../store/project-store';

const IS_TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface Props {
  sourceVideo: SourceVideo | null;
}

export default function PreviewPlayer({ sourceVideo }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubRef = useRef<HTMLDivElement>(null);

  const project = useProjectStore(s => s.project);
  const isRebuilding = useProjectStore(s => (s as any).isRebuilding);
  const rebuildProgress = useProjectStore(s => (s as any).rebuildProgress);
  const setCurrentPlaybackMs = useProjectStore(s => (s as any).setCurrentPlaybackMs);

  const totalMs = sourceVideo?.durationMs ?? 0;

  useEffect(() => {
    if (!sourceVideo?.proxyPath) { setVideoSrc(null); return; }
    if (IS_TAURI) {
      import('@tauri-apps/api/core').then(({ convertFileSrc }) => {
        setVideoSrc(convertFileSrc(sourceVideo.proxyPath!));
      });
    } else { setVideoSrc(sourceVideo.proxyPath); }
  }, [sourceVideo?.proxyPath]);

  // ─── LÓGICA DE PULO CIRÚRGICO CORRIGIDA ───
  useEffect(() => {
    let animationFrameId: number;
    
    const updateProgress = () => {
      if (videoRef.current) {
        let timeMs = videoRef.current.currentTime * 1000;
        
        const cuts = project?.semanticTimeline?.cuts || [];
        if (isPlaying && cuts.length > 0) {
          // Verifica se o tempo atual está dentro de um trecho "bom"
          const isKeeping = cuts.some(c => timeMs >= c.startMs && timeMs < c.endMs);
          
          if (!isKeeping) {
            // Caiu num buraco! Acha o próximo trecho bom imediatamente.
            // Adicionei uma margem de +10ms para garantir que ele não caia no buraco de novo
            const nextCut = cuts.find(c => c.startMs > timeMs);
            if (nextCut) {
              videoRef.current.currentTime = (nextCut.startMs + 10) / 1000;
              timeMs = nextCut.startMs + 10;
            } else {
              // Se não tem mais nada pra frente, o vídeo acabou (Stop).
              videoRef.current.pause();
              videoRef.current.currentTime = totalMs / 1000;
              setIsPlaying(false);
              timeMs = totalMs;
            }
          }
        }

        setCurrentMs(timeMs);
        setCurrentPlaybackMs(timeMs);
        if (totalMs > 0) setProgress(timeMs / totalMs);
      }
      
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    } else {
      updateProgress();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, totalMs, setCurrentPlaybackMs, project?.semanticTimeline?.cuts]);

  const handleScrubClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRef.current || !videoRef.current || totalMs === 0) return;
    const rect = scrubRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = (pct * totalMs) / 1000;
    
    setProgress(pct);
    setCurrentMs(pct * totalMs);
    setCurrentPlaybackMs(pct * totalMs);
  }, [totalMs, setCurrentPlaybackMs]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
  };

  // NOVO: Botão Stop zera o vídeo
  const stopPlayback = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
    setProgress(0);
    setCurrentMs(0);
    setCurrentPlaybackMs(0);
  };

  const changeSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const frame = Math.floor((ms % 1000) / (1000 / 30));
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}:${String(frame).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0c] overflow-hidden">
      <div className="flex-1 flex items-center justify-center relative bg-[#070708] min-h-0">
        <div className="relative w-full h-full max-h-full max-w-[90%] aspect-video bg-[#0d0d10] border border-[#1a1a20] rounded-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">

          {isRebuilding && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
              <span className="text-white mb-3 font-mono tracking-widest text-sm">RECONSTRUINDO TIMELINE... {rebuildProgress}%</span>
              <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-75" style={{ width: `${rebuildProgress}%` }} />
              </div>
            </div>
          )}

          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => { setIsPlaying(false); stopPlayback(); }}
              muted={isMuted}
              onClick={togglePlay}
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] via-[#080810] to-[#0a0a0d]" />
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)' }} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#1e1e28] flex items-center justify-center">
                  <Play className="w-4 h-4 text-[#2a2a35] ml-0.5" />
                </div>
                <p className="text-[10px] font-mono text-[#222228] tracking-widest">NENHUM VÍDEO CARREGADO</p>
              </div>
            </>
          )}

          <div className="absolute top-2 left-3">
            <span className="font-mono text-[11px] text-[#4f6ef7]/60 tracking-widest bg-black/40 px-1.5 py-0.5 rounded-sm">
              {formatMs(currentMs)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 bg-[#0c0c0f] border-t border-[#181820]">
        <div ref={scrubRef} className="h-1.5 bg-[#111116] cursor-pointer relative group" onClick={handleScrubClick}>
          <div className="absolute left-0 top-0 h-full bg-[#4f6ef7]/70" style={{ width: `${progress * 100}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#4f6ef7] rounded-full shadow-[0_0_6px_rgba(79,110,247,0.8)] opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2" style={{ left: `${progress * 100}%` }} />
        </div>

        <div className="h-10 flex items-center px-3 gap-1">
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Skip to start" onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; } }}>
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 text-[#4f6ef7] hover:bg-[#4f6ef7]/20 transition-all" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          
          {/* NOVO: Botão Stop */}
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#ef4444] transition-colors" title="Stop" onClick={stopPlayback}>
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Skip to end" onClick={() => { if (videoRef.current && totalMs) { videoRef.current.currentTime = totalMs / 1000; } }}>
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="ml-2 flex items-center gap-1">
            <span className="font-mono text-[11px] text-[#aaa] tracking-wider">{formatMs(currentMs)}</span>
            <span className="font-mono text-[11px] text-[#333]">/</span>
            <span className="font-mono text-[11px] text-[#333] tracking-wider">{sourceVideo ? formatDuration(sourceVideo.durationMs) : '00:00'}</span>
          </div>

          <div className="flex-1" />

          <button className={`w-7 h-7 flex items-center justify-center transition-colors ${isMuted ? 'text-destructive/80 hover:text-destructive' : 'text-[#333] hover:text-[#888]'}`} title="Mute" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Split at playhead">
            <Scissors className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Fullscreen" onClick={() => videoRef.current?.requestFullscreen()}>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="ml-1 flex gap-0.5">
            {[1, 1.5, 2].map((speed) => (
              <button key={speed} onClick={() => changeSpeed(speed)} className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${playbackRate === speed ? 'bg-[#1e1e28] text-[#666]' : 'text-[#2a2a35] hover:text-[#555]'}`}>
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}