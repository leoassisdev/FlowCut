/**
 * Enhanced Jobs panel with queue, cancel, retry, and per-job logs.
 */

import { useState, useEffect } from 'react';
import type { ProcessingJob } from '@/packages/shared-types';
import {
  subscribeQueue,
  getQueueSnapshot,
  cancelJob,
  retryJob,
  clearCompletedJobs,
  type JobQueueEntry,
} from '@/apps/desktop/core/job-queue';
import { jobTypeLabel, jobStatusLabel } from '@/apps/desktop/services/mappers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  AlertCircle,
  RotateCcw,
  StopCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

const STATUS_ICON: Record<string, React.ElementType> = {
  queued: Clock,
  running: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: AlertCircle,
};

const STATUS_CLASS: Record<string, string> = {
  queued: 'text-muted-foreground',
  running: 'text-status-info animate-spin',
  completed: 'text-status-success',
  failed: 'text-status-error',
  cancelled: 'text-muted-foreground',
};

interface Props {
  /** Legacy jobs from project store (displayed alongside queue) */
  legacyJobs?: ProcessingJob[];
}

export default function JobsPanelEnhanced({ legacyJobs = [] }: Props) {
  const [queueEntries, setQueueEntries] = useState<JobQueueEntry[]>(getQueueSnapshot());
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeQueue(setQueueEntries);
    return () => { unsub(); };
  }, []);

  // Merge legacy jobs (from project) with queue jobs
  const allEntries: JobQueueEntry[] = [
    ...legacyJobs
      .filter((j) => !queueEntries.some((q) => q.job.id === j.id))
      .map((j) => ({ job: j, logs: [], cancelToken: { cancelled: false } })),
    ...queueEntries,
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium">Jobs</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearCompletedJobs}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {allEntries.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhum job</p>
          )}
          {allEntries.map(({ job, logs }) => {
            const Icon = STATUS_ICON[job.status] ?? Clock;
            const isExpanded = expandedJob === job.id;

            return (
              <div key={job.id} className="rounded bg-card border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 p-2 cursor-pointer"
                  onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${STATUS_CLASS[job.status]}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{jobTypeLabel(job)}</p>
                    <p className="text-xs text-muted-foreground">{jobStatusLabel(job)}</p>
                  </div>
                  {job.status === 'running' && (
                    <span className="text-xs font-mono text-status-info">{job.progress}%</span>
                  )}
                  {logs.length > 0 && (
                    isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>

                {/* Progress bar */}
                {job.status === 'running' && (
                  <div className="px-2 pb-2">
                    <Progress value={job.progress} className="h-1" />
                  </div>
                )}

                {/* Actions */}
                {(job.status === 'running' || job.status === 'failed' || job.status === 'cancelled') && (
                  <div className="px-2 pb-2 flex gap-1">
                    {job.status === 'running' && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={(e) => { e.stopPropagation(); cancelJob(job.id); }}>
                        <StopCircle className="w-3 h-3" /> Cancelar
                      </Button>
                    )}
                    {(job.status === 'failed' || job.status === 'cancelled') && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={(e) => { e.stopPropagation(); retryJob(job.id); }}>
                        <RotateCcw className="w-3 h-3" /> Retry
                      </Button>
                    )}
                  </div>
                )}

                {/* Logs */}
                {isExpanded && logs.length > 0 && (
                  <div className="px-2 pb-2 border-t border-border">
                    <div className="mt-1 max-h-24 overflow-y-auto space-y-0.5">
                      {logs.map((log, i) => (
                        <p key={i} className="text-[10px] font-mono text-muted-foreground">{log}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
