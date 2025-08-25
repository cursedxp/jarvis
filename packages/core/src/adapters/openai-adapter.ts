import OpenAI from 'openai';
import { LLMAdapter, LLMConfig, CompletionOptions } from './base';

export class OpenAIAdapter extends LLMAdapter {
  private client: OpenAI;
  
  constructor(config: LLMConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey
    });
  }
  
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7
    });
    
    return response.choices[0]?.message?.content || '';
  }
  
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: CompletionOptions = {}
  ): Promise<void> {
    const stream = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        ...(options.systemPrompt ? [{ role: 'system' as const, content: options.systemPrompt }] : []),
        { role: 'user' as const, content: prompt }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      stream: true
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }
  }
  
  async listModels(): Promise<string[]> {
    const models = await this.client.models.list();
    return models.data
      .filter(model => model.id.startsWith('gpt'))
      .map(model => model.id);
  }
}