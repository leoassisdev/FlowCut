/**
 * @module local-engine — API layer
 * SCAFFOLD — Rotas e handlers do local-engine.
 * Em produção, este módulo seria um servidor Rust/Python (Tauri sidecar) ou HTTP local.
 */

// ─── Route definitions ─────────────────────────────────────────────
// PLACEHOLDER: Cada rota aqui seria um endpoint real no local-engine.

export const LOCAL_ENGINE_ROUTES = {
  // Project
  'POST /projects': 'createProject',
  'GET /projects/:id': 'getProject',
  'GET /projects': 'listProjects',

  // Import & Proxy
  'POST /projects/:id/import': 'importVideo',
  'POST /projects/:id/proxy': 'generateProxy',

  // Transcription
  'POST /projects/:id/transcribe': 'startTranscription',
  'POST /projects/:id/align': 'alignWords',

  // Edit
  'POST /projects/:id/edit': 'applyEdit',
  'POST /projects/:id/rebuild-timeline': 'rebuildTimeline',

  // Auto-cut
  'POST /projects/:id/auto-cut': 'analyzeAutoCut',
  'POST /projects/:id/apply-preset': 'applyPreset',

  // Export
  'POST /projects/:id/export': 'startExport',

  // Jobs
  'GET /projects/:id/jobs': 'listJobs',
  'GET /jobs/:jobId': 'getJobStatus',
} as const;

/**
 * PLACEHOLDER — Handler interface.
 * Cada handler recebe um Request DTO e retorna um Response DTO.
 * Nenhuma regra de negócio existe aqui — toda lógica fica em Services.
 */
export interface RouteHandler<TReq, TRes> {
  (request: TReq): Promise<TRes>;
}
