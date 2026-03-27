/**
 * @module local-api-client
 * PLACEHOLDER — Client for communicating with the local-engine (Tauri sidecar).
 * In production, this would use Tauri's invoke() or HTTP to localhost.
 * Currently returns mock data.
 */

import type { ApiResponse, CreateProjectRequest, CreateProjectResponse, StartTranscriptionRequest, TranscriptionResponse, RebuildTimelineResponse, ListJobsResponse, ExportResponse, StartExportRequest } from '@/packages/shared-contracts';
import { MOCK_PROJECT, MOCK_TRANSCRIPT, MOCK_TIMELINE, MOCK_JOBS } from '@/apps/desktop/mocks/mock-data';

/** PLACEHOLDER: All methods return mock data. Real implementation will call local-engine via Tauri IPC. */
export const localApiClient = {
  async createProject(_req: CreateProjectRequest): Promise<ApiResponse<CreateProjectResponse>> {
    return { success: true, data: { project: MOCK_PROJECT }, error: null, timestamp: new Date().toISOString() };
  },

  async startTranscription(_req: StartTranscriptionRequest): Promise<ApiResponse<TranscriptionResponse>> {
    return {
      success: true,
      data: { transcript: MOCK_TRANSCRIPT, job: MOCK_JOBS[1] },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },

  async rebuildTimeline(_projectId: string): Promise<ApiResponse<RebuildTimelineResponse>> {
    return { success: true, data: { timeline: MOCK_TIMELINE }, error: null, timestamp: new Date().toISOString() };
  },

  async listJobs(_projectId: string): Promise<ApiResponse<ListJobsResponse>> {
    return { success: true, data: { jobs: MOCK_JOBS }, error: null, timestamp: new Date().toISOString() };
  },

  async startExport(_req: StartExportRequest): Promise<ApiResponse<ExportResponse>> {
    return {
      success: true,
      data: { job: MOCK_JOBS[3], estimatedDurationMs: 30000 },
      error: null,
      timestamp: new Date().toISOString(),
    };
  },
};
