import { Play, Pause, SkipBack, SkipForward, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SourceVideo } from '@/packages/shared-types';
import { formatDuration } from '@/apps/desktop/services/mappers';
import { useState } from 'react';

interface Props {
  sourceVideo: SourceVideo | null;
}

/**
 * MOCK — Preview player that displays a placeholder instead of real video.
 * In production, this would use Tauri + native video playback or a WebView player.
 */
export default function PreviewPlayer({ sourceVideo }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex-1 flex flex-col">
      {/* Video area */}
      <div className="flex-1 bg-background flex items-center justify-center relative">
        <div className="w-full max-w-2xl aspect-video bg-muted rounded-lg flex items-center justify-center border border-border">
          <div className="text-center space-y-2">
            <Play className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">MOCK PLAYER</p>
            {sourceVideo && (
              <p className="text-xs text-muted-foreground font-mono">
                {sourceVideo.fileName} · {sourceVideo.width}×{sourceVideo.height} · {sourceVideo.fps}fps
              </p>
            )}
            <p className="text-xs text-status-warning font-mono">
              ⚠ Placeholder — sem reprodução real de vídeo
            </p>
          </div>
        </div>
      </div>

      {/* Transport controls */}
      <div className="h-12 border-t border-border flex items-center justify-center gap-2 px-4 bg-panel">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <SkipForward className="w-4 h-4" />
        </Button>
        <div className="flex-1 h-1 bg-muted rounded mx-4 relative">
          <div className="absolute left-0 top-0 h-full w-1/3 gradient-primary rounded" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          1:02 / {sourceVideo ? formatDuration(sourceVideo.durationMs) : '0:00'}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
