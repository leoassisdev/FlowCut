/**
 * @module local-engine — Factory
 * SCAFFOLD — Factory is the only entry point for creating domain entities.
 * No other module should instantiate entities directly.
 */

import type { VideoProject, SourceVideo, Transcript, SemanticTimeline, ProcessingJob, EditDecision } from '@/packages/shared-types';

/** PLACEHOLDER — Creates new VideoProject entities */
export class ProjectFactory {
  static create(name: string): VideoProject {
    return {
      id: crypto.randomUUID(),
      name,
      state: 'DRAFT',
      sourceVideo: null,
      transcript: null,
      semanticTimeline: null,
      editDecisions: [],
      captionTrack: null,
      reframePlan: null,
      audioPostPlan: null,
      exportProfile: null,
      appliedPreset: null,
      brollCues: [],
      generatedAssets: [],
      jobs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/** PLACEHOLDER — Creates ProcessingJob entities */
export class JobFactory {
  static create(type: ProcessingJob['type']): ProcessingJob {
    return {
      id: crypto.randomUUID(),
      type,
      status: 'queued',
      progress: 0,
      startedAt: null,
      completedAt: null,
      error: null,
    };
  }
}

/** PLACEHOLDER — Creates EditDecision entities */
export class EditDecisionFactory {
  static create(type: EditDecision['type'], targetId: string, payload?: Record<string, unknown>): EditDecision {
    return {
      id: crypto.randomUUID(),
      type,
      targetId,
      payload: payload ?? {},
      timestamp: new Date().toISOString(),
    };
  }
}
