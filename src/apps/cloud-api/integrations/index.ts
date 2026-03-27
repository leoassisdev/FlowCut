/**
 * @module cloud-api — Integrations
 * SCAFFOLD — External provider wrappers.
 * PLACEHOLDER: All throw.
 */

export class OpenAIIntegration {
  async analyzeTranscriptForBroll(_text: string): Promise<string[]> {
    throw new Error('PLACEHOLDER — requer OpenAI API key e implementação real');
  }
}

export class StockVideoIntegration {
  async search(_query: string): Promise<unknown[]> {
    throw new Error('PLACEHOLDER — requer API de stock video (Pexels, Pixabay, etc)');
  }
}
