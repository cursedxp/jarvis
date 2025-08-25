import { FastifyInstance } from 'fastify';
import { Orchestrator } from '../../orchestrator/orchestrator';

interface ModelSwitchBody {
  model: string;
}

interface AutoSelectBody {
  taskType: string;
}

export async function modelRoutes(fastify: FastifyInstance, options: { orchestrator: Orchestrator }) {
  const { orchestrator } = options;

  // Get all available models
  fastify.get('/models', async () => {
    try {
      const models = orchestrator.getAvailableModels();
      const currentModel = orchestrator.getCurrentModel();
      
      return {
        success: true,
        models,
        currentModel,
        totalCount: models.length
      };
    } catch (error: any) {
      fastify.log.error('Failed to get models:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve models');
    }
  });

  // Switch to a specific model
  fastify.post<{ Body: ModelSwitchBody }>('/models/switch', {
    schema: {
      body: {
        type: 'object',
        required: ['model'],
        properties: {
          model: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request) => {
    const { model } = request.body;
    
    try {
      const success = await orchestrator.switchToModel(model);
      
      if (!success) {
        throw fastify.httpErrors.badRequest(`Failed to switch to model: ${model}`);
      }
      
      return {
        success: true,
        model,
        currentModel: orchestrator.getCurrentModel(),
        message: `Successfully switched to ${model}`
      };
    } catch (error: any) {
      fastify.log.error('Model switch failed:', error);
      if (error.statusCode) throw error; // Re-throw HTTP errors
      throw fastify.httpErrors.internalServerError(`Failed to switch to model: ${model}`);
    }
  });

  // Get current model information
  fastify.get('/models/current', async () => {
    try {
      const currentModel = orchestrator.getCurrentModel();
      const modelRegistry = orchestrator.getModelRegistry();
      const modelInfo = modelRegistry ? modelRegistry.getActiveModelInfo() : null;
      
      return {
        success: true,
        model: currentModel,
        info: modelInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      fastify.log.error('Failed to get current model:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve current model information');
    }
  });

  // Auto-select model based on task type
  fastify.post<{ Body: AutoSelectBody }>('/models/auto-select', {
    schema: {
      body: {
        type: 'object',
        required: ['taskType'],
        properties: {
          taskType: { 
            type: 'string', 
            enum: ['coding', 'creative', 'technical', 'conversation'] 
          }
        }
      }
    }
  }, async (request) => {
    const { taskType } = request.body;
    
    try {
      const recommendedModel = orchestrator.autoSelectModelForTask(taskType);
      const switched = await orchestrator.switchToModel(recommendedModel);
      
      return {
        success: true,
        taskType,
        recommendedModel,
        switched,
        currentModel: orchestrator.getCurrentModel(),
        message: `${switched ? 'Switched to' : 'Recommended'} ${recommendedModel} for ${taskType} tasks`
      };
    } catch (error: any) {
      fastify.log.error('Auto model selection failed:', error);
      throw fastify.httpErrors.internalServerError(`Failed to auto-select model for task: ${taskType}`);
    }
  });

  // Get model capabilities and information
  fastify.get('/models/:modelName/info', async (request) => {
    const { modelName } = request.params as { modelName: string };
    
    try {
      const models = orchestrator.getAvailableModels();
      const modelExists = models.some((model: any) => model === modelName || (typeof model === 'object' && model.name === modelName));
      
      if (!modelExists) {
        throw fastify.httpErrors.notFound();
      }
      
      const modelRegistry = orchestrator.getModelRegistry();
      const modelInfo = modelRegistry ? modelRegistry.getModel?.(modelName) : null;
      
      return {
        success: true,
        model: modelName,
        info: modelInfo,
        available: true
      };
    } catch (error: any) {
      fastify.log.error(`Failed to get model info for ${modelName}:`, error);
      if (error.statusCode) throw error; // Re-throw HTTP errors
      throw fastify.httpErrors.internalServerError(`Failed to get information for model: ${modelName}`);
    }
  });
}