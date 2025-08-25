import { FastifyInstance } from 'fastify';
import { Orchestrator } from '../../orchestrator/orchestrator';
import '../../types/fastify';

export async function healthRoutes(fastify: FastifyInstance, options: { orchestrator: Orchestrator }) {
  const { orchestrator } = options;

  // Basic health check
  fastify.get('/health', async () => {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  });

  // Detailed health check with service status
  fastify.get('/health/detailed', async () => {
    try {
      const currentModel = orchestrator.getCurrentModel();
      const availableModels = orchestrator.getAvailableModels();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
          orchestrator: {
            status: 'healthy',
            currentModel,
            availableModelsCount: availableModels.length
          },
          models: {
            status: availableModels.length > 0 ? 'healthy' : 'warning',
            available: availableModels.length,
            current: currentModel
          }
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        services: {
          orchestrator: { status: 'error' }
        }
      };
    }
  });

  // Readiness probe for Kubernetes/Docker
  fastify.get('/ready', async () => {
    try {
      const currentModel = orchestrator.getCurrentModel();
      const availableModels = orchestrator.getAvailableModels();
      
      if (!currentModel || availableModels.length === 0) {
        throw new Error('No models available');
      }
      
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch (error: any) {
      fastify.log.error('Readiness check failed:', error);
      throw fastify.httpErrors.serviceUnavailable('Service not ready');
    }
  });

  // Liveness probe for Kubernetes/Docker
  fastify.get('/live', async () => {
    return { status: 'alive', timestamp: new Date().toISOString() };
  });
}