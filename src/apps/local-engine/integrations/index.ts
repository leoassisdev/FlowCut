/**
 * @module local-engine — Integrations
 * SCAFFOLD — Isolates external providers and engines.
 * Each integration wraps a specific external dependency.
 * PLACEHOLDER: All methods throw — no real integration.
 */

/** PLACEHOLDER — Wraps FFmpeg CLI for transcoding, proxy generation, export */
export class FFmpegIntegration {
  async generateProxy(_inputPath: string, _outputPath: string): Promise<void> {
    throw new Error('PLACEHOLDER — FFmpegIntegration.generateProxy requer FFmpeg real');
  }

  async extractAudio(_inputPath: string, _outputPath: string): Promise<void> {
    throw new Error('PLACEHOLDER — FFmpegIntegration.extractAudio requer FFmpeg real');
  }

  async renderExport(_timelineJson: string, _outputPath: string): Promise<void> {
    throw new Error('PLACEHOLDER — FFmpegIntegration.renderExport requer FFmpeg real');
  }

  async getMediaInfo(_filePath: string): Promise<Record<string, unknown>> {
    throw new Error('PLACEHOLDER — FFmpegIntegration.getMediaInfo requer FFprobe real');
  }
}

/** PLACEHOLDER — Wraps whisper.cpp for local transcription */
export class WhisperIntegration {
  async transcribe(_audioPath: string, _model: string, _language: string): Promise<string> {
    throw new Error('PLACEHOLDER — WhisperIntegration.transcribe requer whisper.cpp real');
  }
}

/** PLACEHOLDER — Wraps WhisperX for word-level alignment */
export class AlignmentIntegration {
  async alignWords(_audioPath: string, _transcript: string): Promise<unknown> {
    throw new Error('PLACEHOLDER — AlignmentIntegration.alignWords requer WhisperX real');
  }
}

/** PLACEHOLDER — Wraps MediaPipe / OpenCV for face detection and reframing */
export class ReframeIntegration {
  async detectFaces(_videoPath: string): Promise<unknown[]> {
    throw new Error('PLACEHOLDER — ReframeIntegration.detectFaces requer MediaPipe/OpenCV real');
  }
}
