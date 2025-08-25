import { OpenAIAdapter } from './openai-adapter';
import { AnthropicAdapter } from './anthropic-adapter';
import { OllamaAdapter } from './ollama-adapter';
import { LLMAdapter } from './base';
import { createLogger } from '../utils/logger';

const logger = createLogger('adapters');

export async function initializeAdapters(): Promise<Map<string, LLMAdapter>> {
  const adapters = new Map<string, LLMAdapter>();
  
  try {
    // Ollama (local LLM) - prioritize this since user wants local
    if (process.env.OLLAMA_MODEL || process.env.USE_LOCAL_LLM === 'true') {
      const ollama = new OllamaAdapter({
        apiKey: '', // Not needed for Ollama
        model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      });
      adapters.set('ollama', ollama);
      adapters.set('local', ollama); // Alias for convenience
      logger.info(`Ollama adapter initialized with model: ${process.env.OLLAMA_MODEL || 'llama3.2:latest'}`);
    }
    
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAIAdapter({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4'
      });
      adapters.set('openai', openai);
      logger.info('OpenAI adapter initialized');
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      const anthropic = new AnthropicAdapter({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229'
      });
      adapters.set('anthropic', anthropic);
      logger.info('Anthropic adapter initialized');
    }
    
    if (adapters.size === 0) {
      logger.warn('No LLM adapters initialized. Install Ollama and set USE_LOCAL_LLM=true, or set API keys in .env file');
    }
    
  } catch (error) {
    logger.error('Failed to initialize adapters:', error);
    throw error;
  }
  
  return adapters;
}