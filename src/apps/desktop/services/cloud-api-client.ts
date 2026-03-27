/**
 * @module cloud-api-client
 * PLACEHOLDER — Client for communicating with the cloud-api.
 * In production, this would make authenticated HTTP requests to the FlowCut cloud service.
 * Currently returns mock data.
 */

import type { ApiResponse, ListPresetsResponse, BrollCuesResponse, CaptionsResponse, GenerateCaptionsRequest } from '@/packages/shared-contracts';
import { MOCK_PRESETS, MOCK_BROLL_CUES, MOCK_CAPTION_TRACK } from '@/apps/desktop/mocks/mock-data';

/** PLACEHOLDER: All methods return mock data. Real implementation will call cloud-api over HTTPS. */
export const cloudApiClient = {
  async listPresets(): Promise<ApiResponse<ListPresetsResponse>> {
    return { success: true, data: { presets: MOCK_PRESETS }, error: null, timestamp: new Date().toISOString() };
  },

  async generateBrollCues(_projectId: string): Promise<ApiResponse<BrollCuesResponse>> {
    return { success: true, data: { cues: MOCK_BROLL_CUES }, error: null, timestamp: new Date().toISOString() };
  },

  async generateCaptions(_req: GenerateCaptionsRequest): Promise<ApiResponse<CaptionsResponse>> {
    return { success: true, data: { captionTrack: MOCK_CAPTION_TRACK }, error: null, timestamp: new Date().toISOString() };
  },
};
