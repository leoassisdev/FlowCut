/**
 * @module cloud-api — API routes
 * SCAFFOLD — Cloud API route definitions.
 * In production: Express, Fastify, or edge functions.
 */

export const CLOUD_API_ROUTES = {
  // Presets
  'GET /presets': 'listPresets',
  'GET /presets/:id': 'getPreset',

  // B-Roll AI suggestions
  'POST /projects/:id/broll-cues': 'generateBrollCues',
  'POST /broll/search': 'searchBrollAssets',

  // Caption generation
  'POST /projects/:id/captions': 'generateCaptions',

  // Cloud transcription (alternative to local)
  'POST /projects/:id/transcribe': 'cloudTranscribe',

  // User & auth
  'POST /auth/login': 'login',
  'POST /auth/register': 'register',
  'GET /auth/me': 'getProfile',

  // Usage & billing
  'GET /usage': 'getUsage',
  'GET /billing': 'getBilling',
} as const;
