/**
 * Diagnostics panel — displays in-app logs with filtering.
 */

import { useState, useEffect, useRef } from 'react';
import { logger, type LogEntry, type LogLevel } from '@/apps/desktop/core/logger';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Terminal, Trash2 } from 'lucide-react';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-muted-foreground',
  info: 'text-status-info',
  warn: 'text-status-warning',
  error: 'text-status-error',
};

export default function DiagnosticsPanel() {
  const [entries, setEntries] = useState<LogEntry[]>(logger.getEntries());
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = logger.subscribe(() => {
      setEntries([...logger.getEntries()]);
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries.length]);

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium">Diagnostics</h3>
        <div className="flex-1" />
        {(['all', 'info', 'warn', 'error', 'debug'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              filter === level
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {level.toUpperCase()}
          </button>
        ))}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { logger.clear(); setEntries([]); }}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-2 space-y-0.5 font-mono text-[11px]">
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-4">Nenhum log</p>
          )}
          {filtered.map((entry) => (
            <div key={entry.id} className="flex gap-2 leading-tight">
              <span className="text-muted-foreground/50 flex-shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className={`flex-shrink-0 w-10 uppercase ${LEVEL_COLORS[entry.level]}`}>
                {entry.level}
              </span>
              <span className="text-muted-foreground flex-shrink-0">[{entry.source}]</span>
              <span className="text-foreground">{entry.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
