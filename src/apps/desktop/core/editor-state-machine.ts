/**
 * @module editor-state-machine
 * Real state machine for the editor with typed events, guards, and explicit transitions.
 * Separate from project pipeline state — this manages the editor UI state.
 */

// ─── Editor States ──────────────────────────────────────────────────

export type EditorState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'EDITING'
  | 'PREVIEWING'
  | 'EXPORTING'
  | 'ERROR';

// ─── Editor Events ──────────────────────────────────────────────────

export type EditorEvent =
  | { type: 'LOAD_PROJECT'; projectId: string }
  | { type: 'PROJECT_LOADED' }
  | { type: 'LOAD_FAILED'; error: string }
  | { type: 'START_EDITING' }
  | { type: 'START_PREVIEW' }
  | { type: 'STOP_PREVIEW' }
  | { type: 'START_EXPORT' }
  | { type: 'EXPORT_COMPLETE' }
  | { type: 'EXPORT_FAILED'; error: string }
  | { type: 'RESET' }
  | { type: 'RECOVER' };

// ─── Transition Table ───────────────────────────────────────────────

interface Transition {
  from: EditorState;
  event: EditorEvent['type'];
  to: EditorState;
  guard?: (ctx: EditorContext) => boolean;
}

const TRANSITIONS: Transition[] = [
  { from: 'IDLE', event: 'LOAD_PROJECT', to: 'LOADING' },
  { from: 'LOADING', event: 'PROJECT_LOADED', to: 'READY' },
  { from: 'LOADING', event: 'LOAD_FAILED', to: 'ERROR' },
  { from: 'READY', event: 'START_EDITING', to: 'EDITING' },
  { from: 'READY', event: 'START_PREVIEW', to: 'PREVIEWING' },
  { from: 'READY', event: 'START_EXPORT', to: 'EXPORTING', guard: (ctx) => ctx.hasProject },
  { from: 'EDITING', event: 'START_PREVIEW', to: 'PREVIEWING' },
  { from: 'EDITING', event: 'START_EXPORT', to: 'EXPORTING', guard: (ctx) => ctx.hasProject },
  { from: 'EDITING', event: 'RESET', to: 'READY' },
  { from: 'PREVIEWING', event: 'STOP_PREVIEW', to: 'EDITING' },
  { from: 'PREVIEWING', event: 'START_EDITING', to: 'EDITING' },
  { from: 'EXPORTING', event: 'EXPORT_COMPLETE', to: 'READY' },
  { from: 'EXPORTING', event: 'EXPORT_FAILED', to: 'ERROR' },
  { from: 'ERROR', event: 'RECOVER', to: 'READY' },
  { from: 'ERROR', event: 'RESET', to: 'IDLE' },
];

// ─── Context ────────────────────────────────────────────────────────

export interface EditorContext {
  hasProject: boolean;
  error: string | null;
  projectId: string | null;
}

const initialContext: EditorContext = {
  hasProject: false,
  error: null,
  projectId: null,
};

// ─── State Machine ──────────────────────────────────────────────────

export interface EditorMachineState {
  state: EditorState;
  context: EditorContext;
  history: Array<{ from: EditorState; event: EditorEvent['type']; to: EditorState; timestamp: number }>;
}

export function createEditorMachine(): EditorMachineState {
  return {
    state: 'IDLE',
    context: { ...initialContext },
    history: [],
  };
}

export function canTransition(machine: EditorMachineState, event: EditorEvent): boolean {
  return TRANSITIONS.some(
    (t) =>
      t.from === machine.state &&
      t.event === event.type &&
      (!t.guard || t.guard(machine.context))
  );
}

export function transition(machine: EditorMachineState, event: EditorEvent): EditorMachineState {
  const t = TRANSITIONS.find(
    (tr) =>
      tr.from === machine.state &&
      tr.event === event.type &&
      (!tr.guard || tr.guard(machine.context))
  );

  if (!t) {
    return machine; // No valid transition — stay in current state
  }

  // Update context based on event
  const newContext = updateContext(machine.context, event);

  return {
    state: t.to,
    context: newContext,
    history: [
      ...machine.history,
      { from: machine.state, event: event.type, to: t.to, timestamp: Date.now() },
    ],
  };
}

function updateContext(ctx: EditorContext, event: EditorEvent): EditorContext {
  switch (event.type) {
    case 'LOAD_PROJECT':
      return { ...ctx, projectId: event.projectId, error: null };
    case 'PROJECT_LOADED':
      return { ...ctx, hasProject: true, error: null };
    case 'LOAD_FAILED':
      return { ...ctx, hasProject: false, error: event.error };
    case 'EXPORT_FAILED':
      return { ...ctx, error: event.error };
    case 'RESET':
      return { ...initialContext };
    case 'RECOVER':
      return { ...ctx, error: null };
    default:
      return ctx;
  }
}

/** Returns all valid events for the current state */
export function validEvents(machine: EditorMachineState): EditorEvent['type'][] {
  return TRANSITIONS
    .filter((t) => t.from === machine.state && (!t.guard || t.guard(machine.context)))
    .map((t) => t.event);
}
