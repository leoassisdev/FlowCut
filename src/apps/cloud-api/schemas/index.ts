/** @module cloud-api — Schemas. SCAFFOLD. */
import { z } from 'zod';

export const GenerateBrollCuesSchema = z.object({ projectId: z.string().uuid() });
export const GenerateCaptionsSchema = z.object({ projectId: z.string().uuid(), format: z.enum(['srt', 'vtt', 'ass', 'burned']) });
export const CloudTranscribeSchema = z.object({ audioUrl: z.string().url(), language: z.string().optional() });
