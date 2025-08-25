import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { LLMAdapter } from '../adapters/base';

const logger = createLogger('model-registry');

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'anthropic';
  capabilities: string[];
  description: string;
  recommendedFor: string[];
  performance: 'fast' | 'balanced' | 'powerful';
}

export class ModelRegistry extends EventEmitter {
  private models: Map<string, ModelInfo> = new Map();
  private adapters: Map<string, LLMAdapter> = new Map();
  private activeModel: string = 'llama3.2:3b';
  
  constructor() {
    super();
    this.initializeDefaultModels();
  }
  
  private initializeDefaultModels() {
    // Local Ollama models
    this.models.set('llama3.2:3b', {
      id: 'llama3.2:3b',
      name: 'Llama 3.2 3B',
      provider: 'ollama',
      capabilities: ['chat', 'general', 'reasoning'],
      description: 'Fast and efficient general-purpose model',
      recommendedFor: ['general chat', 'quick questions', 'everyday tasks'],
      performance: 'fast'
    });
    
    this.models.set('codellama:7b', {
      id: 'codellama:7b',
      name: 'CodeLlama 7B',
      provider: 'ollama',
      capabilities: ['code', 'programming', 'debugging', 'refactoring'],
      description: 'Specialized for code generation and programming tasks',
      recommendedFor: ['code explanation', 'refactoring', 'debugging', 'code generation'],
      performance: 'balanced'
    });
    
    this.models.set('mistral:7b', {
      id: 'mistral:7b',
      name: 'Mistral 7B',
      provider: 'ollama',
      capabilities: ['chat', 'reasoning', 'analysis'],
      description: 'High-quality general model with strong reasoning',
      recommendedFor: ['complex reasoning', 'analysis', 'detailed explanations'],
      performance: 'powerful'
    });
    
    logger.info(`Initialized ${this.models.size} models in registry`);
  }
  
  setAdapters(adapters: Map<string, LLMAdapter>) {
    this.adapters = adapters;
    logger.info(`Set ${adapters.size} adapters in registry`);
  }
  
  getAllModels(): ModelInfo[] {
    return Array.from(this.models.values());
  }
  
  getModel(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }
  
  getActiveModel(): string {
    return this.activeModel;
  }
  
  getActiveModelInfo(): ModelInfo | undefined {
    return this.models.get(this.activeModel);
  }
  
  async switchModel(modelId: string): Promise<boolean> {
    if (!this.models.has(modelId)) {
      logger.error(`Model ${modelId} not found in registry`);
      return false;
    }
    
    const model = this.models.get(modelId)!;
    const adapterKey = this.getAdapterKeyForModel(model);
    
    if (!this.adapters.has(adapterKey)) {
      logger.error(`No adapter found for model ${modelId} (adapter: ${adapterKey})`);
      return false;
    }
    
    // Test the adapter to make sure it's working
    try {
      const adapter = this.adapters.get(adapterKey)!;
      if (adapter.setModel) {
        adapter.setModel(modelId);
      }
      
      const prevModel = this.activeModel;
      this.activeModel = modelId;
      
      logger.info(`Switched from ${prevModel} to ${modelId}`);
      this.emit('model-changed', { from: prevModel, to: modelId, model });
      
      return true;
    } catch (error) {
      logger.error(`Failed to switch to model ${modelId}:`, error);
      return false;
    }
  }
  
  getRecommendedModelFor(task: string): ModelInfo | undefined {
    for (const model of this.models.values()) {
      if (model.recommendedFor.some(rec => 
        rec.toLowerCase().includes(task.toLowerCase()) ||
        task.toLowerCase().includes(rec.toLowerCase())
      )) {
        return model;
      }
    }
    
    // Fallback to current model
    return this.getActiveModelInfo();
  }
  
  private getAdapterKeyForModel(model: ModelInfo): string {
    switch (model.provider) {
      case 'ollama':
        return 'local';
      case 'openai':
        return 'openai';
      case 'anthropic':
        return 'anthropic';
      default:
        return 'local';
    }
  }
  
  // Auto-select best model for task
  autoSelectModel(taskType: string): string {
    let bestModel = this.activeModel;
    
    switch (taskType.toLowerCase()) {
      case 'code':
      case 'explain':
      case 'refactor':
      case 'test':
        // Prefer CodeLlama for coding tasks
        if (this.models.has('codellama:7b')) {
          bestModel = 'codellama:7b';
        }
        break;
        
      case 'chat':
      case 'general':
        // Use fastest model for general chat
        if (this.models.has('llama3.2:3b')) {
          bestModel = 'llama3.2:3b';
        }
        break;
        
      case 'analysis':
      case 'complex':
        // Use most powerful model for complex tasks
        if (this.models.has('mistral:7b')) {
          bestModel = 'mistral:7b';
        }
        break;
    }
    
    return bestModel;
  }
}