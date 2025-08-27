import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { FineTuningManager } from '../../services/fine-tuning';
import { IntelligentRouter } from '../../services/intelligent-router';

// Import all handlers
import { ChatHandler } from './chat-handler';
import { ModelHandler } from './model-handler';
import { PreferencesHandler } from './preferences-handler';
import { KnowledgeHandler } from './knowledge-handler';
import { TrainingHandler } from './training-handler';
import { PomodoroHandler } from './pomodoro-handler';
import { MusicHandler } from './music-handler';
import { PlanningHandler } from './planning-handler';
import { createSpotifyService } from '../../services/spotify-service';

export class CommandRegistry {
  private handlers: Map<string, BaseHandler>;
  private commandMap: Map<string, BaseHandler>;
  private intelligentRouter: IntelligentRouter;
  private io?: any;

  constructor(
    orchestrator: Orchestrator,
    userPreferences: UserPreferenceManager,
    knowledgeBase: KnowledgeBase,
    fineTuningManager: FineTuningManager,
    io?: any
  ) {
    this.handlers = new Map();
    this.commandMap = new Map();
    this.intelligentRouter = new IntelligentRouter(orchestrator);
    this.io = io;
    
    // Initialize all handlers
    this.initializeHandlers(orchestrator, userPreferences, knowledgeBase, fineTuningManager, io);
  }

  private initializeHandlers(
    orchestrator: Orchestrator,
    userPreferences: UserPreferenceManager,
    knowledgeBase: KnowledgeBase,
    fineTuningManager: FineTuningManager,
    io?: any
  ): void {
    // Create handler instances
    const chatHandler = new ChatHandler(orchestrator, userPreferences, knowledgeBase);
    const modelHandler = new ModelHandler(orchestrator);
    const preferencesHandler = new PreferencesHandler(orchestrator, userPreferences);
    const knowledgeHandler = new KnowledgeHandler(knowledgeBase);
    const trainingHandler = new TrainingHandler(fineTuningManager);
    
    // Create specialized handlers with Socket.IO
    const pomodoroHandler = new PomodoroHandler(orchestrator, io);
    const planningHandler = new PlanningHandler(orchestrator, io);
    
    // Create Spotify service for music handler
    const spotifyService = createSpotifyService(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || '',
      process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:7777/auth/spotify/callback'
    );
    const musicHandler = new MusicHandler(orchestrator, userPreferences, spotifyService, io);

    // Register handlers
    this.registerHandler(chatHandler);
    this.registerHandler(modelHandler);
    this.registerHandler(preferencesHandler);
    this.registerHandler(knowledgeHandler);
    this.registerHandler(trainingHandler);
    this.registerHandler(pomodoroHandler);
    this.registerHandler(planningHandler);
    this.registerHandler(musicHandler);
    
    // Set command registry reference in chat handler for routing
    chatHandler.setCommandRegistry(this);
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
    // Use intelligent routing for chat commands
    if (command.type === 'chat') {
      return await this.handleChatWithIntelligentRouting(command);
    }
    
    // Standard routing for non-chat commands
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
   * Handle chat commands with intelligent routing
   */
  private async handleChatWithIntelligentRouting(command: Command): Promise<any> {
    try {
      const { message, sessionId, conversationHistory } = command.payload;
      
      // Use intelligent routing to determine best handler
      const routingDecision = await this.intelligentRouter.routeWithSession(
        message,
        sessionId || 'default',
        { conversationHistory }
      );

      // Emit routing decision if Socket.IO is available
      if (this.io && routingDecision.shouldRoute) {
        this.io.emit('intelligent_routing_decision', {
          intent: routingDecision.intent,
          handler: routingDecision.handler,
          confidence: routingDecision.confidence,
          processingTime: routingDecision.processingTime,
          sessionId: sessionId || 'default',
          timestamp: new Date().toISOString()
        });
      }

      // Route to the determined handler
      if (routingDecision.shouldRoute && routingDecision.action !== 'chat') {
        const targetHandler = this.commandMap.get(routingDecision.action);
        if (targetHandler) {
          const routedCommand = {
            type: routingDecision.action,
            payload: command.payload
          };
          
          const result = await targetHandler.handle(routedCommand);
          
          // Add routing metadata to result
          return {
            ...result,
            intent: routingDecision.intent,
            confidence: routingDecision.confidence,
            entities: routingDecision.entities,
            routingMetrics: {
              processingTime: routingDecision.processingTime,
              cacheHit: routingDecision.processingTime < 50, // Assume cache hit if very fast
              intent: routingDecision.intent,
              confidence: routingDecision.confidence
            }
          };
        }
      }

      // Fallback to regular chat handling
      const chatHandler = this.commandMap.get('chat');
      if (chatHandler) {
        return await chatHandler.handle(command);
      }

      throw new Error('Chat handler not found');
      
    } catch (error) {
      console.error('🚨 Intelligent routing failed, falling back to regular chat:', error);
      
      // Fallback to regular chat processing
      const chatHandler = this.commandMap.get('chat');
      if (chatHandler) {
        return await chatHandler.handle(command);
      }
      
      return {
        type: 'command-error',
        success: false,
        command: command.type,
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

  /**
   * Get handler capabilities for intelligent routing
   */
  getHandlerCapabilities(): { name: string; commands: string[] }[] {
    return Array.from(this.handlers.values()).map(handler => ({
      name: handler.getHandlerName(),
      commands: handler.getCommands()
    }));
  }

  /**
   * Get intent to handler mapping for intelligent routing
   */
  getIntentHandlerMap(): Record<string, string> {
    return {
      'CREATE_TASK': 'PlanningHandler',
      'DELETE_TASK': 'PlanningHandler',
      'UPDATE_TASK': 'PlanningHandler',
      'COMPLETE_TASK': 'PlanningHandler',
      'LIST_TASKS': 'PlanningHandler',
      'PLAY_MUSIC': 'MusicHandler',
      'PAUSE_MUSIC': 'MusicHandler',
      'STOP_MUSIC': 'MusicHandler',
      'SKIP_MUSIC': 'MusicHandler',
      'PREVIOUS_MUSIC': 'MusicHandler',
      'START_TIMER': 'PomodoroHandler',
      'STOP_TIMER': 'PomodoroHandler',
      'PAUSE_TIMER': 'PomodoroHandler',
      'RESET_TIMER': 'PomodoroHandler',
      'GENERAL_CHAT': 'ChatHandler',
      'EXPLAIN': 'ChatHandler',
      'HELP': 'ChatHandler'
    };
  }

  /**
   * Get intelligent router instance
   */
  getIntelligentRouter(): IntelligentRouter {
    return this.intelligentRouter;
  }
}