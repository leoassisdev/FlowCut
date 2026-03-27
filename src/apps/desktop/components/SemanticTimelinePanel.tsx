import type { SemanticTimeline, TimelineCut } from '@/packages/shared-types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface Props {
  timeline: SemanticTimeline | null;
}

const CUT_COLORS: Record<TimelineCut['type'], string> = {
  keep: 'bg-primary/60',
  remove: 'bg-destructive/40',
  broll: 'bg-secondary/60',
  pause: 'bg-muted',
};

/**
 * MOCK — Semantic timeline visualization.
 * Renders cuts as colored blocks proportional to duration.
 */
export default function SemanticTimelinePanel({ timeline }: Props) {
  if (!timeline) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Timeline vazia</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-timeline-foreground">Semantic Timeline</h3>
        <span className="text-xs font-mono text-muted-foreground">
          {Math.floor(timeline.totalDurationMs / 1000)}s / {Math.floor(timeline.originalDurationMs / 1000)}s original
        </span>
      </div>
      <ScrollArea className="flex-1 px-4 pb-2">
        <div className="flex gap-1 items-end h-24 min-w-max">
          {timeline.cuts.map((cut) => {
            const widthPct = Math.max(
              ((cut.endMs - cut.startMs) / timeline.totalDurationMs) * 100,
              0.5
            );
            return (
              <div
                key={cut.id}
                className={`${CUT_COLORS[cut.type]} rounded-sm flex-shrink-0 relative group cursor-pointer hover:opacity-80 transition-opacity`}
                style={{ width: `${Math.max(widthPct * 8, 24)}px`, height: '80%' }}
                title={cut.label}
              >
                <div className="absolute bottom-full mb-1 left-0 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-card max-w-48 whitespace-normal z-10 border border-border">
                  <p className="font-mono text-muted-foreground">{cut.type.toUpperCase()}</p>
                  <p className="truncate">{cut.label}</p>
                  <p className="text-muted-foreground">{Math.round((cut.endMs - cut.startMs) / 1000)}s</p>
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
