/**
 * @module local-engine — Domain
 * SCAFFOLD — Domain entities for the local-engine.
 * Domain entities are pure TypeScript — no framework dependencies.
 * They contain business rules and invariants.
 */

import type { PipelineState, WordToken, TimelineCut } from '@/packages/shared-types';

/** Domain entity: Manages pipeline state transitions with validation */
export class ProjectPipeline {
  private _state: PipelineState;

  constructor(initialState: PipelineState) {
    this._state = initialState;
  }

  get state(): PipelineState {
    return this._state;
  }

  /** PLACEHOLDER — Validates state transition is legal */
  canTransitionTo(nextState: PipelineState): boolean {
    // TODO: Implement state machine with valid transitions
    // For now, all transitions are allowed
    return true;
  }

  transitionTo(nextState: PipelineState): void {
    if (!this.canTransitionTo(nextState)) {
      throw new Error(`Invalid transition: ${this._state} → ${nextState}`);
    }
    this._state = nextState;
  }
}

/** Domain entity: Handles word-level edit logic */
export class TranscriptEditor {
  /** PLACEHOLDER — Determines which words are filler */
  static isFillerWord(word: string): boolean {
    const fillers = ['uh', 'um', 'like', 'you know', 'né', 'tipo', 'assim', 'então'];
    return fillers.includes(word.toLowerCase());
  }

  /** PLACEHOLDER — Removes silence gaps and rebuilds cuts */
  static buildCutsFromWords(_words: WordToken[], _silenceThresholdMs: number): TimelineCut[] {
    throw new Error('PLACEHOLDER — TranscriptEditor.buildCutsFromWords não implementado');
  }
}
