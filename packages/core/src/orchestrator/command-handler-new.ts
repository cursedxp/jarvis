import { Orchestrator, Command } from './orchestrator';
import { UserPreferenceManager } from '../services/user-preferences';
import { KnowledgeBase } from '../services/knowledge-base';
import { FineTuningManager } from '../services/fine-tuning';
import { CommandRegistry } from './handlers/command-registry';

/**
 * Refactored CommandHandler using modular handler architecture
 * 
 * This new implementation replaces the monolithic 789-line command handler
 * with a clean, modular architecture that separates concerns and improves
 * maintainability, testability, and scalability.
 * 
 * Key improvements:
 * - Single Responsibility Principle: Each handler focuses on one domain
 * - Better error handling with consistent response format
 * - Easier testing with isolated handler logic
 * - Improved scalability for adding new command types
 * - Clear separation of concerns
 */
export class CommandHandler {
  private orchestrator: Orchestrator;
  private commandRegistry: CommandRegistry;
  private userPreferences: UserPreferenceManager;
  private knowledgeBase: KnowledgeBase;
  private fineTuningManager: FineTuningManager;
  private io?: any;
  
  constructor(orchestrator: Orchestrator, io?: any) {
    this.orchestrator = orchestrator;
    this.io = io;
    
    // Initialize service dependencies
    this.userPreferences = new UserPreferenceManager();
    this.knowledgeBase = new KnowledgeBase();
    this.fineTuningManager = new FineTuningManager();
    
    // Initialize the command registry with all handlers
    this.commandRegistry = new CommandRegistry(
      this.orchestrator,
      this.userPreferences,
      this.knowledgeBase,
      this.fineTuningManager,
      this.io
    );
    
    console.log('CommandHandler initialized with modular architecture');
    this.logRegistrationInfo();
  }

  getUserPreferences(): UserPreferenceManager {
    return this.userPreferences;
  }

  updateSocketIO(io: any) {
    this.io = io;
    // Reinitialize the command registry with the new Socket.IO instance
    this.commandRegistry = new CommandRegistry(
      this.orchestrator,
      this.userPreferences,
      this.knowledgeBase,
      this.fineTuningManager,
      this.io
    );
    console.log('📡 COMMAND HANDLER: Socket.IO instance updated in new modular handlers');
  }
  
  /**
   * Main command handling method - delegates to appropriate handler
   */
  async handle(command: Command): Promise<any> {
    if (!command || !command.type) {
      return {
        type: 'command-error',
        success: false,
        error: 'Invalid command: missing type',
        timestamp: new Date().toISOString()
      };
    }
    
    console.log(`Handling command: ${command.type}`);
    
    try {
      const result = await this.commandRegistry.handle(command);
      
      // Emit Socket.IO event for real-time updates if available
      if (this.io && this.shouldEmitUpdate(command.type)) {
        this.io.emit('command_processed', {
          command: command.type,
          result,
          timestamp: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Command handling error:', error);
      
      const errorResponse = {
        type: 'command-error',
        success: false,
        command: command.type,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      
      // Emit error event if Socket.IO is available
      if (this.io) {
        this.io.emit('command_error', errorResponse);
      }
      
      return errorResponse;
    }
  }
  
  /**
   * Get information about available commands and handlers
   */
  getSystemInfo(): any {
    return {
      availableCommands: this.commandRegistry.getAvailableCommands(),
      registeredHandlers: this.commandRegistry.getRegisteredHandlers(),
      commandStats: this.commandRegistry.getCommandStats(),
      currentModel: this.orchestrator.getCurrentModel(),
      availableModels: this.orchestrator.getAvailableModels()
    };
  }
  
  /**
   * Check if a command type is supported
   */
  isCommandSupported(commandType: string): boolean {
    return this.commandRegistry.isCommandSupported(commandType);
  }
  
  /**
   * Get the handler responsible for a specific command
   */
  getHandlerForCommand(commandType: string): string | null {
    const handler = this.commandRegistry.getHandlerForCommand(commandType);
    return handler ? handler.getHandlerName() : null;
  }
  
  private logRegistrationInfo(): void {
    const stats = this.commandRegistry.getCommandStats();
    console.log(`✅ Command system initialized:`);
    console.log(`   • ${stats.totalHandlers} handlers registered`);
    console.log(`   • ${stats.totalCommands} commands available`);
    
    Object.entries(stats.commandsPerHandler).forEach(([handler, count]) => {
      console.log(`   • ${handler}: ${count} commands`);
    });
  }
  
  private shouldEmitUpdate(commandType: string): boolean {
    // Define which commands should trigger real-time updates
    const updateTriggers = [
      'chat',
      'switchModel',
      'setPreferences',
      'addKnowledge',
      'startFineTuning',
      'training-status'
    ];
    
    return updateTriggers.includes(commandType);
  }
}