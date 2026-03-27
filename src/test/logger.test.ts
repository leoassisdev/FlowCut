import { describe, it, expect } from 'vitest';
import { logger } from '@/apps/desktop/core/logger';

describe('Logger', () => {
  it('logs entries at different levels', () => {
    logger.clear();
    logger.info('test', 'Info message');
    logger.warn('test', 'Warn message');
    logger.error('test', 'Error message');
    logger.debug('test', 'Debug message');

    const entries = logger.getEntries();
    expect(entries).toHaveLength(4);
    expect(entries[0].level).toBe('info');
    expect(entries[1].level).toBe('warn');
    expect(entries[2].level).toBe('error');
    expect(entries[3].level).toBe('debug');
  });

  it('notifies subscribers', () => {
    logger.clear();
    const received: string[] = [];
    const unsub = logger.subscribe((entry) => received.push(entry.message));
    logger.info('test', 'Hello');
    expect(received).toEqual(['Hello']);
    unsub();
    logger.info('test', 'After unsub');
    expect(received).toHaveLength(1);
  });
});
