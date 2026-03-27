/** @module cloud-api — Core. SCAFFOLD. */
export const CLOUD_DEFAULTS = {
  maxUploadSizeMb: 500,
  supportedFormats: ['mp4', 'mov', 'webm', 'mkv'],
  transcriptionTimeout: 300_000,
} as const;
