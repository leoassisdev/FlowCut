/** @module cloud-api — Mapper. SCAFFOLD. */
import type { BrollCue } from '@/packages/shared-types';
import type { BrollCuesResponse } from '@/packages/shared-contracts';

export class BrollMapper {
  static toResponse(cues: BrollCue[]): BrollCuesResponse {
    return { cues };
  }
}
