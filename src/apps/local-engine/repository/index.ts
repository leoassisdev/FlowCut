/**
 * @module local-engine — Repository
 * SCAFFOLD — Repository handles persistence only.
 * In production: SQLite via Tauri, filesystem, or IndexedDB.
 * PLACEHOLDER: All methods throw — no real persistence.
 */

import type { VideoProject, ProcessingJob, ProjectSnapshot } from '@/packages/shared-types';

export interface IProjectRepository {
  save(project: VideoProject): Promise<void>;
  findById(id: string): Promise<VideoProject | null>;
  findAll(): Promise<VideoProject[]>;
  delete(id: string): Promise<void>;
}

export interface IJobRepository {
  save(job: ProcessingJob): Promise<void>;
  findByProjectId(projectId: string): Promise<ProcessingJob[]>;
  findById(id: string): Promise<ProcessingJob | null>;
  updateStatus(id: string, status: ProcessingJob['status'], progress: number): Promise<void>;
}

export interface ISnapshotRepository {
  save(snapshot: ProjectSnapshot): Promise<void>;
  findByProjectId(projectId: string): Promise<ProjectSnapshot[]>;
  findLatest(projectId: string): Promise<ProjectSnapshot | null>;
}

/** PLACEHOLDER — In-memory implementation for development */
export class InMemoryProjectRepository implements IProjectRepository {
  private store = new Map<string, VideoProject>();

  async save(project: VideoProject): Promise<void> {
    this.store.set(project.id, project);
  }

  async findById(id: string): Promise<VideoProject | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<VideoProject[]> {
    return Array.from(this.store.values());
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
