import Anthropic from '@anthropic-ai/sdk';
import { LLMAdapter, LLMConfig, CompletionOptions } from './base';

export class AnthropicAdapter extends LLMAdapter {
  private client: Anthropic;
  
  constructor(config: LLMConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey
    });
  }
  
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {})
    });
    
    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }
  
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: CompletionOptions = {}
  ): Promise<void> {
    const stream = await this.client.messages.create({
      model: this.config.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      stream: true,
      ...(options.systemPrompt ? { system: options.systemPrompt } : {})
    });
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
  }
  
  async listModels(): Promise<string[]> {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-instant-1.2'
    ];
  }
}