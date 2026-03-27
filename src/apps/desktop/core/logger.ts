/**
 * @module logger
 * In-app diagnostics and logging system.
 * Stores logs in memory for display in the diagnostics panel.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

export type LogListener = (entry: LogEntry) => void;

let _logId = 0;
const _entries: LogEntry[] = [];
const _listeners: Set<LogListener> = new Set();
const MAX_ENTRIES = 500;

function emit(level: LogLevel, source: string, message: string, data?: unknown) {
  const entry: LogEntry = {
    id: `log-${++_logId}`,
    level,
    source,
    message,
    data,
    timestamp: Date.now(),
  };
  _entries.push(entry);
  if (_entries.length > MAX_ENTRIES) _entries.shift();
  _listeners.forEach((fn) => fn(entry));
}

export const logger = {
  debug: (source: string, message: string, data?: unknown) => emit('debug', source, message, data),
  info: (source: string, message: string, data?: unknown) => emit('info', source, message, data),
  warn: (source: string, message: string, data?: unknown) => emit('warn', source, message, data),
  error: (source: string, message: string, data?: unknown) => emit('error', source, message, data),

  getEntries: () => [..._entries],
  subscribe: (listener: LogListener) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },
  clear: () => {
    _entries.length = 0;
  },
};
