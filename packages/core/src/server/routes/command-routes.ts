import { FastifyInstance } from 'fastify';
import { Orchestrator } from '../../orchestrator/orchestrator';
import { TTSManager } from '../../tts-manager';
import { createLogger } from '../../utils/logger';
import '../../types/fastify';

const logger = createLogger('command-routes');

interface CommandBody {
  type: string;
  payload: any;
}

export async function commandRoutes(
  fastify: FastifyInstance, 
  options: { orchestrator: Orchestrator; ttsManager: TTSManager }
) {
  const { orchestrator, ttsManager } = options;

  // Main command processing endpoint
  fastify.post<{ Body: CommandBody }>('/command', {
    schema: {
      body: {
        type: 'object',
        required: ['type', 'payload'],
        properties: {
          type: { type: 'string', minLength: 1 },
          payload: { type: 'object' }
        }
      }
    }
  }, async (request) => {
    const { type, payload } = request.body;
    
    logger.info(`Processing command: ${type}`);
    
    try {
      const startTime = Date.now();
      const result = await orchestrator.handleCommand({ type, payload });
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      logger.info(`Command '${type}' processed in ${processingTime}ms`);
      
      return {
        ...result,
        ttsMode: ttsManager.getTTSMode(),
        processingTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Command '${type}' failed:`, error);
      throw fastify.httpErrors.internalServerError(`Command processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Batch command processing
  fastify.post<{ Body: { commands: CommandBody[] } }>('/commands/batch', {
    schema: {
      body: {
        type: 'object',
        required: ['commands'],
        properties: {
          commands: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'payload'],
              properties: {
                type: { type: 'string', minLength: 1 },
                payload: { type: 'object' }
              }
            },
            maxItems: 10 // Limit batch size
          }
        }
      }
    }
  }, async (request) => {
    const { commands } = request.body;
    
    logger.info(`Processing batch of ${commands.length} commands`);
    
    const results = [];
    const startTime = Date.now();
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      try {
        const commandStartTime = Date.now();
        const result = await orchestrator.handleCommand(command);
        const commandEndTime = Date.now();
        
        results.push({
          index: i,
          command: command.type,
          success: true,
          result,
          processingTime: commandEndTime - commandStartTime
        });
      } catch (error) {
        logger.error(`Batch command ${i} (${command.type}) failed:`, error);
        results.push({
          index: i,
          command: command.type,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    return {
      success: true,
      totalCommands: commands.length,
      successfulCommands: results.filter(r => r.success).length,
      failedCommands: results.filter(r => !r.success).length,
      results,
      totalProcessingTime: totalTime,
      averageProcessingTime: totalTime / commands.length,
      timestamp: new Date().toISOString()
    };
  });

  // Get available command types
  fastify.get('/commands/types', async () => {
    try {
      // If using the new command handler, get available commands
      const commandHandler = (orchestrator as any).getCommandHandler?.();
      let availableCommands: string[] = [];
      
      if (commandHandler && typeof commandHandler.getSystemInfo === 'function') {
        const systemInfo = commandHandler.getSystemInfo();
        availableCommands = systemInfo.availableCommands || [];
      } else {
        // Fallback to hardcoded list for old handler
        availableCommands = [
          'chat', 'explain', 'refactor', 'test', 'install',
          'switchModel', 'listModels', 'getCurrentModel', 'autoSelectModel',
          'setPersonality', 'setPreferences', 'getPreferences',
          'addKnowledge', 'searchKnowledge',
          'startFineTuning', 'getTrainingStatus', 'stopTraining'
        ];
      }
      
      return {
        success: true,
        commands: availableCommands.sort(),
        totalCount: availableCommands.length,
        categories: {
          chat: ['chat', 'explain', 'refactor', 'test', 'install'],
          model: ['switchModel', 'listModels', 'getCurrentModel', 'autoSelectModel'],
          preferences: ['setPersonality', 'setPreferences', 'getPreferences'],
          knowledge: ['addKnowledge', 'searchKnowledge'],
          training: ['startFineTuning', 'getTrainingStatus', 'stopTraining']
        }
      };
    } catch (error) {
      logger.error('Failed to get command types:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve available command types');
    }
  });

  // Validate command structure
  fastify.post<{ Body: CommandBody }>('/commands/validate', async (request) => {
    const { type, payload } = request.body;
    
    try {
      const commandHandler = (orchestrator as any).getCommandHandler?.();
      let isSupported = false;
      
      if (commandHandler && typeof commandHandler.isCommandSupported === 'function') {
        isSupported = commandHandler.isCommandSupported(type);
      } else {
        // Fallback validation
        const supportedCommands = [
          'chat', 'explain', 'refactor', 'test', 'install',
          'switchModel', 'listModels', 'getCurrentModel', 'autoSelectModel',
          'setPersonality', 'setPreferences', 'getPreferences',
          'addKnowledge', 'searchKnowledge',
          'startFineTuning', 'getTrainingStatus', 'stopTraining'
        ];
        isSupported = supportedCommands.includes(type);
      }
      
      const validation: any = {
        valid: isSupported,
        command: type,
        payloadProvided: !!payload,
        payloadType: typeof payload
      };
      
      if (!isSupported) {
        validation.error = `Unsupported command type: ${type}`;
      }
      
      return {
        success: true,
        validation
      };
    } catch (error) {
      logger.error('Command validation failed:', error);
      throw fastify.httpErrors.internalServerError('Command validation failed');
    }
  });
}