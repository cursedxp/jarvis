export interface LLMConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export abstract class LLMAdapter {
  protected config: LLMConfig;
  
  constructor(config: LLMConfig) {
    this.config = config;
  }
  
  abstract complete(prompt: string, options?: CompletionOptions): Promise<string>;
  
  abstract streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
    options?: CompletionOptions
  ): Promise<void>;
  
  abstract listModels(): Promise<string[]>;
  
  getModel(): string {
    return this.config.model;
  }
  
  setModel(model: string): void {
    this.config.model = model;
  }
}