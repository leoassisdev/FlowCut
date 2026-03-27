/** @module cloud-api — Repository. SCAFFOLD. */
export interface ICloudProjectRepository {
  /** PLACEHOLDER */ findById(id: string): Promise<unknown>;
  /** PLACEHOLDER */ save(data: unknown): Promise<void>;
}
