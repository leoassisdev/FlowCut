import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, VolumeX, Scissors } from 'lucide-react';
import type { SourceVideo } from '@/packages/shared-types';
import { formatDuration } from '@/apps/desktop/services/mappers';
import { useState, useRef, useCallback, useEffect } from 'react';

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

  const totalMs = sourceVideo?.durationMs ?? 0;

  // 1. Converte o caminho do arquivo local para uma URL que o Tauri entenda
  useEffect(() => {
    if (!sourceVideo?.proxyPath) {
      setVideoSrc(null);
      return;
    }
    if (IS_TAURI) {
      import('@tauri-apps/api/core').then(({ convertFileSrc }) => {
        setVideoSrc(convertFileSrc(sourceVideo.proxyPath!));
      });
    } else {
      setVideoSrc(sourceVideo.proxyPath);
    }
  }, [sourceVideo?.proxyPath]);

  // 2. Sincroniza o tempo do vídeo com a nossa barrinha
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const timeMs = videoRef.current.currentTime * 1000;
    setCurrentMs(timeMs);
    if (totalMs > 0) {
      setProgress(timeMs / totalMs);
    }
  };

  // 3. Permite clicar na barra para avançar/voltar o vídeo
  const handleScrubClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRef.current || !videoRef.current || totalMs === 0) return;
    const rect = scrubRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    videoRef.current.currentTime = (pct * totalMs) / 1000;
    setProgress(pct);
  }, [totalMs]);

  // 4. Controle de Play/Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
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

      {/* ── Video Canvas ── */}
      <div className="flex-1 flex items-center justify-center relative bg-[#070708] min-h-0">
        <div className="relative w-full h-full max-h-full max-w-[90%] aspect-video bg-[#0d0d10] border border-[#1a1a20] rounded-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">

          {videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              muted={isMuted}
              onClick={togglePlay}
            />
          ) : (
            <>
              {/* Mock video frame com efeito visual se não tiver vídeo */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#0d0d14] via-[#080810] to-[#0a0a0d]" />
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#1e1e28] flex items-center justify-center">
                  <Play className="w-4 h-4 text-[#2a2a35] ml-0.5" />
                </div>
                <p className="text-[10px] font-mono text-[#222228] tracking-widest">NENHUM VÍDEO CARREGADO</p>
              </div>
            </>
          )}

          {/* Timecode overlay */}
          <div className="absolute top-2 left-3">
            <span className="font-mono text-[11px] text-[#4f6ef7]/60 tracking-widest bg-black/40 px-1.5 py-0.5 rounded-sm">
              {formatMs(currentMs)}
            </span>
          </div>

          {/* Info do vídeo */}
          {sourceVideo && !isPlaying && (
            <div className="absolute top-2 right-3">
              <span className="text-[9px] font-mono text-white/40 bg-black/50 px-2 py-1 rounded">
                {sourceVideo.width}×{sourceVideo.height} • {sourceVideo.fps}fps
              </span>
            </div>
          )}

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
        </div>

        {/* Controls row */}
        <div className="h-10 flex items-center px-3 gap-1">
          {/* Transport */}
          <button
            className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors"
            title="Skip to start"
            onClick={() => { if (videoRef.current) videoRef.current.currentTime = 0; }}
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            className="w-8 h-8 flex items-center justify-center rounded bg-[#4f6ef7]/10 border border-[#4f6ef7]/20 text-[#4f6ef7] hover:bg-[#4f6ef7]/20 transition-all"
            onClick={togglePlay}
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
            onClick={() => { if (videoRef.current && totalMs) videoRef.current.currentTime = totalMs / 1000; }}
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
          <button 
            className={`w-7 h-7 flex items-center justify-center transition-colors ${isMuted ? 'text-destructive/80 hover:text-destructive' : 'text-[#333] hover:text-[#888]'}`} 
            title="Mute"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Split at playhead">
            <Scissors className="w-3.5 h-3.5" />
          </button>
          
          <button className="w-7 h-7 flex items-center justify-center text-[#333] hover:text-[#888] transition-colors" title="Fullscreen" onClick={() => videoRef.current?.requestFullscreen()}>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Playback mode */}
          <div className="ml-1 flex gap-0.5">
            {[1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={`px-1.5 py-0.5 text-[9px] font-mono rounded transition-colors ${
                  playbackRate === speed ? 'bg-[#1e1e28] text-[#666]' : 'text-[#2a2a35] hover:text-[#555]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}