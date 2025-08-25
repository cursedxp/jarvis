import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { FineTuningManager } from '../../services/fine-tuning';

// Import all handlers
import { ChatHandler } from './chat-handler';
import { ModelHandler } from './model-handler';
import { PreferencesHandler } from './preferences-handler';
import { KnowledgeHandler } from './knowledge-handler';
import { TrainingHandler } from './training-handler';

export class CommandRegistry {
  private handlers: Map<string, BaseHandler>;
  private commandMap: Map<string, BaseHandler>;

  constructor(
    orchestrator: Orchestrator,
    userPreferences: UserPreferenceManager,
    knowledgeBase: KnowledgeBase,
    fineTuningManager: FineTuningManager,
    _io?: any
  ) {
    this.handlers = new Map();
    this.commandMap = new Map();
    
    // Initialize all handlers
    this.initializeHandlers(orchestrator, userPreferences, knowledgeBase, fineTuningManager);
  }

  private initializeHandlers(
    orchestrator: Orchestrator,
    userPreferences: UserPreferenceManager,
    knowledgeBase: KnowledgeBase,
    fineTuningManager: FineTuningManager
  ): void {
    // Create handler instances
    const chatHandler = new ChatHandler(orchestrator, userPreferences, knowledgeBase);
    const modelHandler = new ModelHandler(orchestrator);
    const preferencesHandler = new PreferencesHandler(orchestrator, userPreferences);
    const knowledgeHandler = new KnowledgeHandler(knowledgeBase);
    const trainingHandler = new TrainingHandler(fineTuningManager);

    // Register handlers
    this.registerHandler(chatHandler);
    this.registerHandler(modelHandler);
    this.registerHandler(preferencesHandler);
    this.registerHandler(knowledgeHandler);
    this.registerHandler(trainingHandler);
  }

  private registerHandler(handler: BaseHandler): void {
    const handlerName = handler.getHandlerName();
    this.handlers.set(handlerName, handler);
    
    // Map each command to its handler
    const commands = handler.getCommands();
    commands.forEach(command => {
      if (this.commandMap.has(command)) {
        console.warn(`Command '${command}' is already registered with ${this.commandMap.get(command)?.getHandlerName()}. Overriding with ${handlerName}.`);
      }
      this.commandMap.set(command, handler);
    });
  }

  /**
   * Handle a command by routing it to the appropriate handler
   */
  async handle(command: Command): Promise<any> {
    const handler = this.commandMap.get(command.type);
    
    if (!handler) {
      throw new Error(`Unknown command type: ${command.type}. Available commands: ${Array.from(this.commandMap.keys()).join(', ')}`);
    }
    
    try {
      return await handler.handle(command);
    } catch (error) {
      console.error(`Error handling command '${command.type}' with ${handler.getHandlerName()}:`, error);
      
      return {
        type: 'command-error',
        success: false,
        command: command.type,
        handler: handler.getHandlerName(),
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get all available commands
   */
  getAvailableCommands(): string[] {
    return Array.from(this.commandMap.keys()).sort();
  }

  /**
   * Get all registered handlers
   */
  getRegisteredHandlers(): { name: string; commands: string[] }[] {
    return Array.from(this.handlers.values()).map(handler => ({
      name: handler.getHandlerName(),
      commands: handler.getCommands()
    }));
  }

  /**
   * Get handler for a specific command
   */
  getHandlerForCommand(commandType: string): BaseHandler | undefined {
    return this.commandMap.get(commandType);
  }

  /**
   * Check if a command is supported
   */
  isCommandSupported(commandType: string): boolean {
    return this.commandMap.has(commandType);
  }

  /**
   * Get command statistics
   */
  getCommandStats(): { totalCommands: number; totalHandlers: number; commandsPerHandler: Record<string, number> } {
    const commandsPerHandler: Record<string, number> = {};
    
    this.handlers.forEach((handler, name) => {
      commandsPerHandler[name] = handler.getCommands().length;
    });
    
    return {
      totalCommands: this.commandMap.size,
      totalHandlers: this.handlers.size,
      commandsPerHandler
    };
  }
}