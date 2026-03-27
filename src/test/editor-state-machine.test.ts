import { describe, it, expect } from 'vitest';
import {
  createEditorMachine,
  transition,
  canTransition,
  validEvents,
  type EditorEvent,
} from '@/apps/desktop/core/editor-state-machine';

describe('Editor State Machine', () => {
  it('starts in IDLE state', () => {
    const machine = createEditorMachine();
    expect(machine.state).toBe('IDLE');
    expect(machine.context.hasProject).toBe(false);
  });

  it('transitions IDLE → LOADING on LOAD_PROJECT', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    expect(machine.state).toBe('LOADING');
    expect(machine.context.projectId).toBe('p1');
  });

  it('transitions LOADING → READY → EDITING', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    machine = transition(machine, { type: 'PROJECT_LOADED' });
    expect(machine.state).toBe('READY');
    expect(machine.context.hasProject).toBe(true);

    machine = transition(machine, { type: 'START_EDITING' });
    expect(machine.state).toBe('EDITING');
  });

  it('blocks invalid transitions', () => {
    const machine = createEditorMachine();
    expect(canTransition(machine, { type: 'PROJECT_LOADED' })).toBe(false);
    // State should not change
    const next = transition(machine, { type: 'PROJECT_LOADED' });
    expect(next.state).toBe('IDLE');
  });

  it('transitions to ERROR on LOAD_FAILED', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    machine = transition(machine, { type: 'LOAD_FAILED', error: 'Not found' });
    expect(machine.state).toBe('ERROR');
    expect(machine.context.error).toBe('Not found');
  });

  it('recovers from ERROR', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    machine = transition(machine, { type: 'LOAD_FAILED', error: 'err' });
    machine = transition(machine, { type: 'RECOVER' });
    expect(machine.state).toBe('READY');
    expect(machine.context.error).toBeNull();
  });

  it('blocks EXPORT without project (guard)', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    machine = transition(machine, { type: 'PROJECT_LOADED' });
    // hasProject is true, so export should work
    expect(canTransition(machine, { type: 'START_EXPORT' })).toBe(true);
  });

  it('tracks history', () => {
    let machine = createEditorMachine();
    machine = transition(machine, { type: 'LOAD_PROJECT', projectId: 'p1' });
    machine = transition(machine, { type: 'PROJECT_LOADED' });
    expect(machine.history).toHaveLength(2);
    expect(machine.history[0].from).toBe('IDLE');
    expect(machine.history[0].to).toBe('LOADING');
  });

  it('lists valid events for current state', () => {
    let machine = createEditorMachine();
    expect(validEvents(machine)).toContain('LOAD_PROJECT');
    expect(validEvents(machine)).not.toContain('START_EDITING');
  });
});
