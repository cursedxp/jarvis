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
  private activeModel: string = 'llama3.2:latest';
  
  constructor() {
    super();
    // Initialize with fallback models first
    this.initializeFallbackModels();
    // Discover available models in background
    this.discoverAvailableModels().catch(err => 
      logger.warn('Background model discovery failed:', err)
    );
  }
  
  async initialize() {
    // Public method to fully initialize with discovered models
    await this.discoverAvailableModels();
    logger.info(`Initialized ${this.models.size} models in registry`);
  }

  private async discoverAvailableModels() {
    try {
      // Try to get available models from Ollama
      const response = await fetch('http://localhost:11434/api/tags').catch(() => null);
      
      if (response && response.ok) {
        const data = await response.json() as { models?: any[] };
        const availableModels = data.models || [];
        
        for (const model of availableModels) {
          const modelInfo = this.analyzeModelCapabilities(model.name);
          if (modelInfo) {
            this.models.set(model.name, modelInfo);
          }
        }
        
        logger.info(`Discovered ${availableModels.length} models from Ollama`);
      } else {
        // Fallback to common model patterns if Ollama is not available
        this.initializeFallbackModels();
      }
      
      // Set default active model to best available general model
      this.activeModel = this.findBestModelForTask('general') || 'llama3.2:latest';
      
    } catch (error) {
      logger.warn('Failed to discover models, using fallback:', error);
      this.initializeFallbackModels();
    }
  }

  private analyzeModelCapabilities(modelName: string): ModelInfo | null {
    const name = modelName.toLowerCase();
    
    // Coding-focused models
    if (name.includes('codellama') || name.includes('code') || name.includes('starcoder')) {
      return {
        id: modelName,
        name: this.formatModelName(modelName),
        provider: 'ollama',
        capabilities: ['code', 'programming', 'debugging', 'refactoring'],
        description: 'Specialized for code generation and programming tasks',
        recommendedFor: ['code explanation', 'refactoring', 'debugging', 'code generation'],
        performance: name.includes('13b') || name.includes('34b') ? 'powerful' : 'balanced'
      };
    }
    
    // General conversation models
    if (name.includes('llama') || name.includes('alpaca') || name.includes('vicuna')) {
      return {
        id: modelName,
        name: this.formatModelName(modelName),
        provider: 'ollama',
        capabilities: ['chat', 'general', 'reasoning'],
        description: 'General-purpose conversational model',
        recommendedFor: ['general chat', 'quick questions', 'everyday tasks'],
        performance: name.includes('13b') || name.includes('70b') ? 'powerful' : 'fast'
      };
    }
    
    // Analysis/reasoning models
    if (name.includes('mistral') || name.includes('mixtral') || name.includes('wizard')) {
      return {
        id: modelName,
        name: this.formatModelName(modelName),
        provider: 'ollama',
        capabilities: ['chat', 'reasoning', 'analysis'],
        description: 'High-quality model with strong reasoning capabilities',
        recommendedFor: ['complex reasoning', 'analysis', 'detailed explanations'],
        performance: name.includes('8x7b') || name.includes('13b') ? 'powerful' : 'balanced'
      };
    }
    
    // Default for unknown models
    return {
      id: modelName,
      name: this.formatModelName(modelName),
      provider: 'ollama',
      capabilities: ['chat', 'general'],
      description: 'General-purpose model',
      recommendedFor: ['general tasks'],
      performance: 'balanced'
    };
  }

  private formatModelName(modelName: string): string {
    return modelName
      .split(':')[0]
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private initializeFallbackModels() {
    // Only register models that actually exist, not hypothetical ones
    logger.info('Using discovered models only, no fallback models');
  }

  private findBestModelForTask(taskType: string): string | null {
    const models = Array.from(this.models.values());
    
    switch (taskType) {
      case 'coding':
        return models.find(m => m.capabilities.includes('code'))?.id || null;
      case 'general':
      case 'conversation':
        return models.find(m => m.capabilities.includes('chat'))?.id || null;
      case 'analysis':
        return models.find(m => m.capabilities.includes('analysis'))?.id || null;
      default:
        return models[0]?.id || null;
    }
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
  
  // Auto-select best model for task (dynamic)
  autoSelectModel(taskType: string): string {
    let bestModel = this.activeModel;
    
    switch (taskType.toLowerCase()) {
      case 'coding':
      case 'code':
      case 'explain':
      case 'refactor': 
      case 'test':
        bestModel = this.findBestModelByCapability(['code', 'programming']) || bestModel;
        break;
        
      case 'conversation':
      case 'chat':
      case 'general':
        bestModel = this.findBestModelByCapability(['chat', 'general']) || bestModel;
        break;
        
      case 'technical':
      case 'analysis':
      case 'complex':
        bestModel = this.findBestModelByCapability(['analysis', 'reasoning']) || 
                   this.findBestModelByCapability(['code', 'programming']) || bestModel;
        break;
        
      case 'creative':
        bestModel = this.findBestModelByCapability(['chat', 'general']) || bestModel;
        break;
    }
    
    logger.info(`Auto-selecting model for '${taskType}' task: ${bestModel}`);
    return bestModel;
  }

  private findBestModelByCapability(capabilities: string[]): string | null {
    const models = Array.from(this.models.values());
    
    // Find models that have any of the required capabilities
    const suitableModels = models.filter(model => 
      capabilities.some(cap => model.capabilities.includes(cap))
    );
    
    if (suitableModels.length === 0) return null;
    
    // Prefer models with 'latest' tag, then by performance
    const prioritized = suitableModels.sort((a, b) => {
      // Prioritize 'latest' models
      if (a.id.includes('latest') && !b.id.includes('latest')) return -1;
      if (!a.id.includes('latest') && b.id.includes('latest')) return 1;
      
      // Then by performance
      const perfOrder = { 'powerful': 3, 'balanced': 2, 'fast': 1 };
      return (perfOrder[b.performance] || 1) - (perfOrder[a.performance] || 1);
    });
    
    return prioritized[0].id;
  }
}