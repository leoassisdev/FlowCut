/** @module cloud-api — Factory. SCAFFOLD. */
import type { BrollCue } from '@/packages/shared-types';

export class BrollCueFactory {
  static create(keyword: string, startMs: number, endMs: number): BrollCue {
    return {
      id: crypto.randomUUID(),
      timelineCutId: '',
      keyword,
      suggestedQuery: keyword,
      startMs,
      endMs,
      status: 'suggested',
      assetId: null,
    };
  }
}
