import { LLMAdapter, LLMConfig, CompletionOptions } from './base';

interface OllamaConfig extends LLMConfig {
  baseUrl?: string;
  model: string;
}

export class OllamaAdapter extends LLMAdapter {
  private baseUrl: string;
  
  constructor(config: OllamaConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
  }
  
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: options.systemPrompt ? `${options.systemPrompt}\n\nUser: ${prompt}` : prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 150,  // Reduced from 2000 for faster responses
          num_ctx: 2048,  // Smaller context window
          repeat_penalty: 1.1,
          top_k: 20,  // Reduced for faster sampling
          top_p: 0.9
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.response || '';
  }
  
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: CompletionOptions = {}
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        prompt: options.systemPrompt ? `${options.systemPrompt}\n\nUser: ${prompt}` : prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 150,  // Reduced from 2000 for faster responses
          num_ctx: 2048,  // Smaller context window
          repeat_penalty: 1.1,
          top_k: 20,  // Reduced for faster sampling
          top_p: 0.9
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }
    
    if (!response.body) {
      throw new Error('No response body');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.response) {
              onChunk(data.response);
            }
          } catch (e) {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
  
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      return data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      return ['llama3.2:latest', 'codellama:latest', 'llama3.2:3b', 'codellama:7b']; // Fallback popular models
    }
  }
}