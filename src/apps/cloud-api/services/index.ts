/**
 * @module cloud-api — Services
 * SCAFFOLD — Cloud API services.
 * PLACEHOLDER: All methods throw.
 */

export class BrollService {
  async generateCues(_projectId: string, _transcriptText: string): Promise<void> {
    throw new Error('PLACEHOLDER — BrollService requer integração com IA real');
  }
  async searchAssets(_query: string): Promise<void> {
    throw new Error('PLACEHOLDER — BrollService.searchAssets requer API de stock/Pexels/Unsplash');
  }
}

export class CloudTranscriptionService {
  async transcribe(_audioUrl: string, _language: string): Promise<void> {
    throw new Error('PLACEHOLDER — CloudTranscriptionService requer API de transcrição cloud');
  }
}

export class CaptionService {
  async generate(_projectId: string, _format: string): Promise<void> {
    throw new Error('PLACEHOLDER — CaptionService requer processamento real');
  }
}

export class AuthService {
  async login(_email: string, _password: string): Promise<void> {
    throw new Error('PLACEHOLDER — AuthService requer implementação de auth');
  }
}
