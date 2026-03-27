/**
 * @module local-engine — Services
 * SCAFFOLD — Service layer for the local-engine.
 * Services orchestrate use cases. They call Domain, Factory, Repository, Integrations.
 * PLACEHOLDER: Nenhuma lógica real implementada.
 */

/** PLACEHOLDER — Orchestrates video import, proxy generation, audio extraction */
export class ImportService {
  // TODO: Inject Repository, FFmpegIntegration
  async importVideo(_filePath: string): Promise<void> {
    throw new Error('PLACEHOLDER — ImportService.importVideo não implementado');
  }

  async generateProxy(_videoId: string): Promise<void> {
    throw new Error('PLACEHOLDER — ImportService.generateProxy não implementado');
  }

  async extractAudio(_videoId: string): Promise<void> {
    throw new Error('PLACEHOLDER — ImportService.extractAudio não implementado');
  }
}

/** PLACEHOLDER — Orchestrates transcription and word alignment */
export class TranscriptionService {
  // TODO: Inject WhisperIntegration, AlignmentIntegration, Repository
  async transcribe(_audioPath: string, _engine: string): Promise<void> {
    throw new Error('PLACEHOLDER — TranscriptionService.transcribe não implementado');
  }

  async alignWords(_transcriptId: string): Promise<void> {
    throw new Error('PLACEHOLDER — TranscriptionService.alignWords não implementado');
  }
}

/** PLACEHOLDER — Orchestrates edit decisions and timeline rebuilding */
export class EditService {
  // TODO: Inject TimelineFactory, Repository
  async applyEdit(_projectId: string, _editType: string, _targetId: string): Promise<void> {
    throw new Error('PLACEHOLDER — EditService.applyEdit não implementado');
  }

  async rebuildTimeline(_projectId: string): Promise<void> {
    throw new Error('PLACEHOLDER — EditService.rebuildTimeline não implementado');
  }
}

/** PLACEHOLDER — Orchestrates auto-cut analysis and preset application */
export class AutoCutService {
  async analyze(_projectId: string): Promise<void> {
    throw new Error('PLACEHOLDER — AutoCutService.analyze não implementado');
  }

  async applyPreset(_projectId: string, _presetId: string): Promise<void> {
    throw new Error('PLACEHOLDER — AutoCutService.applyPreset não implementado');
  }
}

/** PLACEHOLDER — Orchestrates export rendering */
export class ExportService {
  // TODO: Inject FFmpegIntegration, Repository
  async startExport(_projectId: string, _profileId: string, _outputPath: string): Promise<void> {
    throw new Error('PLACEHOLDER — ExportService.startExport não implementado');
  }
}
