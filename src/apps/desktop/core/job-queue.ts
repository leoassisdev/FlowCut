/**
 * @module job-queue
 * MOCK — Job orchestration with queue, progress, cancel, retry, and per-job logs.
 * No real processing — all jobs are simulated with timers.
 */

import type { ProcessingJob } from '@/packages/shared-types';
import { logger } from './logger';

export interface JobQueueEntry {
  job: ProcessingJob;
  logs: string[];
  cancelToken: { cancelled: boolean };
  intervalId?: ReturnType<typeof setInterval>;
}

export type JobQueueListener = (jobs: JobQueueEntry[]) => void;

const _queue: JobQueueEntry[] = [];
const _listeners: Set<JobQueueListener> = new Set();

function notify() {
  const snapshot = _queue.map((e) => ({ ...e, job: { ...e.job }, logs: [...e.logs] }));
  _listeners.forEach((fn) => fn(snapshot));
}

let _jid = 100;
function juid() { return `job-${++_jid}`; }

export function enqueueJob(type: ProcessingJob['type'], label?: string): string {
  const id = juid();
  const job: ProcessingJob = {
    id,
    type,
    status: 'queued',
    progress: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  };
  const entry: JobQueueEntry = { job, logs: [`Enqueued: ${label ?? type}`], cancelToken: { cancelled: false } };
  _queue.push(entry);
  logger.info('job-queue', `Job enqueued: ${type}`, { id });
  notify();
  // Auto-start if no running jobs
  processNext();
  return id;
}

function processNext() {
  const running = _queue.find((e) => e.job.status === 'running');
  if (running) return;
  const next = _queue.find((e) => e.job.status === 'queued');
  if (!next) return;
  startJob(next);
}

function startJob(entry: JobQueueEntry) {
  entry.job.status = 'running';
  entry.job.startedAt = new Date().toISOString();
  entry.logs.push(`Started at ${entry.job.startedAt}`);
  logger.info('job-queue', `Job started: ${entry.job.type}`, { id: entry.job.id });
  notify();

  // MOCK: simulate progress
  entry.intervalId = setInterval(() => {
    if (entry.cancelToken.cancelled) {
      clearInterval(entry.intervalId);
      entry.job.status = 'cancelled';
      entry.logs.push('Cancelled by user');
      logger.warn('job-queue', `Job cancelled: ${entry.job.type}`, { id: entry.job.id });
      notify();
      processNext();
      return;
    }
    entry.job.progress = Math.min(entry.job.progress + 8 + Math.floor(Math.random() * 7), 100);
    entry.logs.push(`Progress: ${entry.job.progress}%`);
    notify();
    if (entry.job.progress >= 100) {
      clearInterval(entry.intervalId);
      entry.job.status = 'completed';
      entry.job.completedAt = new Date().toISOString();
      entry.logs.push(`Completed at ${entry.job.completedAt}`);
      logger.info('job-queue', `Job completed: ${entry.job.type}`, { id: entry.job.id });
      notify();
      processNext();
    }
  }, 600);
}

export function cancelJob(id: string) {
  const entry = _queue.find((e) => e.job.id === id);
  if (entry && (entry.job.status === 'running' || entry.job.status === 'queued')) {
    entry.cancelToken.cancelled = true;
    if (entry.job.status === 'queued') {
      entry.job.status = 'cancelled';
      entry.logs.push('Cancelled before start');
      notify();
    }
  }
}

export function retryJob(id: string): string | null {
  const entry = _queue.find((e) => e.job.id === id);
  if (!entry || (entry.job.status !== 'failed' && entry.job.status !== 'cancelled')) return null;
  logger.info('job-queue', `Retrying job: ${entry.job.type}`, { originalId: id });
  return enqueueJob(entry.job.type, `Retry: ${entry.job.type}`);
}

export function getJobLogs(id: string): string[] {
  return _queue.find((e) => e.job.id === id)?.logs ?? [];
}

export function getQueueSnapshot(): JobQueueEntry[] {
  return _queue.map((e) => ({ ...e, job: { ...e.job }, logs: [...e.logs] }));
}

export function subscribeQueue(listener: JobQueueListener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function clearCompletedJobs() {
  const remaining = _queue.filter((e) => e.job.status === 'running' || e.job.status === 'queued');
  _queue.length = 0;
  _queue.push(...remaining);
  notify();
}
