import { EventEmitter } from 'eventemitter3';
import { Logger } from 'winston';
import { LLMAdapter } from '../adapters/base';
import { CommandHandler } from './command-handler';
import { ContextManager } from './context-manager';
import { ModelRegistry } from '../services/model-registry';

export interface OrchestratorConfig {
  adapters: Map<string, LLMAdapter>;
  logger: Logger;
  io?: any;
}

export interface Command {
  type: string;
  payload: any;
  context?: any;
}

export class Orchestrator extends EventEmitter {
  private adapters: Map<string, LLMAdapter>;
  private logger: Logger;
  private commandHandler: CommandHandler;
  private contextManager: ContextManager;
  private modelRegistry: ModelRegistry;
  private currentAdapter: string = 'local';
  
  constructor(config: OrchestratorConfig) {
    super();
    this.adapters = config.adapters;
    this.logger = config.logger;
    this.modelRegistry = new ModelRegistry();
    this.modelRegistry.setAdapters(config.adapters);
    this.commandHandler = new CommandHandler(this, config.io);
    this.contextManager = new ContextManager();
    
    // Listen to model changes
    this.modelRegistry.on('model-changed', (event) => {
      this.logger.info(`Model changed from ${event.from} to ${event.to}`);
      this.emit('model-changed', event);
    });
  }
  
  setSocketIO(io: any) {
    this.commandHandler = new CommandHandler(this, io);
  }
  
  async handleCommand(command: Command): Promise<any> {
    this.logger.info('Handling command:', command.type);
    
    try {
      const context = await this.contextManager.getContext(command.context);
      const enrichedCommand = { ...command, context };
      
      const result = await this.commandHandler.handle(enrichedCommand);
      
      this.emit('command:completed', { command, result });
      
      return result;
    } catch (error) {
      this.logger.error('Command failed:', error);
      this.emit('command:failed', { command, error });
      throw error;
    }
  }
  
  async switchAdapter(adapterName: string): Promise<void> {
    if (!this.adapters.has(adapterName)) {
      throw new Error(`Adapter ${adapterName} not found`);
    }
    
    this.currentAdapter = adapterName;
    this.logger.info(`Switched to adapter: ${adapterName}`);
  }
  
  getAdapter(name?: string): LLMAdapter {
    const adapterName = name || this.currentAdapter;
    const adapter = this.adapters.get(adapterName);
    
    if (!adapter) {
      throw new Error(`Adapter ${adapterName} not found`);
    }
    
    return adapter;
  }
  
  async processWithLLM(prompt: string, options: any = {}): Promise<string> {
    const adapter = this.getAdapter();
    return adapter.complete(prompt, options);
  }
  
  // Model management methods
  getModelRegistry(): ModelRegistry {
    return this.modelRegistry;
  }
  
  async switchToModel(modelId: string): Promise<boolean> {
    return await this.modelRegistry.switchModel(modelId);
  }
  
  getCurrentModel(): string {
    return this.modelRegistry.getActiveModel();
  }
  
  getAvailableModels() {
    return this.modelRegistry.getAllModels();
  }
  
  autoSelectModelForTask(taskType: string): string {
    const recommended = this.modelRegistry.autoSelectModel(taskType);
    if (recommended !== this.getCurrentModel()) {
      this.logger.info(`Auto-selecting ${recommended} for ${taskType} task`);
    }
    return recommended;
  }
}