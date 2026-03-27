/**
 * @module local-engine — Schemas
 * SCAFFOLD — Validation schemas for request DTOs.
 * In production, use Zod for runtime validation at the API boundary.
 */

import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  filePath: z.string().min(1),
});

export const StartTranscriptionSchema = z.object({
  projectId: z.string().uuid(),
  engine: z.enum(['whisper.cpp', 'whisperx', 'cloud']),
  language: z.string().optional(),
});

export const ApplyEditSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['remove_word', 'remove_segment', 'reorder', 'insert_pause', 'insert_broll']),
  targetId: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const StartExportSchema = z.object({
  projectId: z.string().uuid(),
  profileId: z.string(),
  outputPath: z.string().min(1),
});

export const ApplyPresetSchema = z.object({
  projectId: z.string().uuid(),
  presetId: z.string(),
});
