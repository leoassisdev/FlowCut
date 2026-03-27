import type { ProcessingJob } from '@/packages/shared-types';
import { jobStatusLabel, jobTypeLabel } from '@/apps/desktop/services/mappers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Clock, Loader2, XCircle, AlertCircle } from 'lucide-react';

interface Props {
  jobs: ProcessingJob[];
}

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

export default function JobsPanel({ jobs }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium">Jobs</h3>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {jobs.map((job) => {
            const Icon = STATUS_ICON[job.status] ?? Clock;
            return (
              <div key={job.id} className="flex items-center gap-3 p-2 rounded bg-card border border-border">
                <Icon className={`w-4 h-4 flex-shrink-0 ${STATUS_CLASS[job.status]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{jobTypeLabel(job)}</p>
                  <p className="text-xs text-muted-foreground">{jobStatusLabel(job)}</p>
                </div>
                {job.status === 'running' && (
                  <span className="text-xs font-mono text-status-info">{job.progress}%</span>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
