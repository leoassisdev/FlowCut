import { useProjectStore } from '@/apps/desktop/store/project-store';
import { visibleSegmentText } from '@/apps/desktop/services/mappers';
import type { Transcript, WordToken } from '@/packages/shared-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface Props {
  transcript: Transcript | null;
}

/**
 * Transcript panel — displays word-level transcript with click-to-remove.
 * MOCK: Uses mock transcript data. No real transcription.
 */
export default function TranscriptPanel({ transcript }: Props) {
  const { removeWord, rebuildTimeline } = useProjectStore();

  if (!transcript) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-sm text-muted-foreground text-center">
          Nenhuma transcrição disponível.<br />
          Importe um vídeo para começar.
        </p>
      </div>
    );
  }

  const handleWordClick = (word: WordToken) => {
    if (!word.isRemoved) {
      removeWord(word.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium">Transcrição</h3>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={rebuildTimeline}>
          <RefreshCw className="w-3 h-3" />
          Reconstruir
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {transcript.segments.map((segment) => (
            <div key={segment.id} className="space-y-1">
              <p className="text-xs text-muted-foreground font-mono">
                {Math.floor(segment.startMs / 1000)}s — Speaker {segment.speakerId ?? '?'}
              </p>
              <p className="text-sm leading-relaxed">
                {segment.words.map((word) => (
                  <span
                    key={word.id}
                    onClick={() => handleWordClick(word)}
                    className={`cursor-pointer rounded px-0.5 transition-colors ${
                      word.isRemoved
                        ? 'line-through text-destructive/50'
                        : word.isFillerWord
                        ? 'text-status-warning hover:bg-status-warning/10'
                        : 'hover:bg-primary/10'
                    }`}
                    title={word.isRemoved ? 'Removida' : word.isFillerWord ? 'Filler word — clique para remover' : 'Clique para remover'}
                  >
                    {word.word}{' '}
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-status-warning font-mono mt-6 bg-muted p-2 rounded">
          ⚠ MOCK — Transcrição gerada com dados fictícios
        </p>
      </ScrollArea>
    </div>
  );
}
