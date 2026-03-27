import { useProjectStore } from '@/apps/desktop/store/project-store';
import { ALL_PRESETS } from '@/packages/shared-presets';
import type { StylePreset } from '@/packages/shared-types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Podcast, Youtube, Smartphone, Presentation } from 'lucide-react';

interface Props {
  appliedPreset: StylePreset | null;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  podcast: Podcast,
  youtube: Youtube,
  short: Smartphone,
  presentation: Presentation,
  custom: Sparkles,
};

/**
 * Presets panel — domain-level editing presets, NOT visual themes.
 * MOCK: Applies preset to project state without real processing.
 */
export default function PresetsPanel({ appliedPreset }: Props) {
  const { applyPreset } = useProjectStore();

  return (
    <div className="flex flex-col h-1/2">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Presets</h3>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {ALL_PRESETS.map((preset) => {
            const Icon = CATEGORY_ICONS[preset.category] ?? Sparkles;
            const isActive = appliedPreset?.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 glow-primary'
                    : 'border-border hover:border-muted-foreground/30 bg-card'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-sm font-medium">{preset.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
