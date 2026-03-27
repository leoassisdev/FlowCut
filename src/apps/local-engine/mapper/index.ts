/**
 * @module local-engine — Mapper
 * Converts domain entities to Response DTOs.
 * Mappers ensure internal entity structure never leaks to API consumers.
 */

import type { VideoProject, ProcessingJob } from '@/packages/shared-types';
import type { VideoProjectSummary, GetProjectResponse, ListProjectsResponse, JobStatusResponse } from '@/packages/shared-contracts';

export class ProjectMapper {
  static toResponse(project: VideoProject): GetProjectResponse {
    return { project };
  }

  static toSummary(project: VideoProject): VideoProjectSummary {
    return {
      id: project.id,
      name: project.name,
      state: project.state,
      thumbnailUrl: null,
      durationMs: project.sourceVideo?.durationMs ?? 0,
      updatedAt: project.updatedAt,
    };
  }

  static toListResponse(projects: VideoProject[]): ListProjectsResponse {
    return { projects: projects.map(ProjectMapper.toSummary) };
  }
}

export class JobMapper {
  static toResponse(job: ProcessingJob): JobStatusResponse {
    return { job };
  }
}
