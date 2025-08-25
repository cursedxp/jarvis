import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server } from 'socket.io';
import { Orchestrator } from './orchestrator/orchestrator';
import { createLogger } from './utils/logger';
import { TTSManager } from './tts-manager';

const logger = createLogger('server');

interface ServerOptions {
  orchestrator: Orchestrator;
  port: number;
}

export async function createServer(options: ServerOptions) {
  const { orchestrator, port } = options;
  
  const fastify = Fastify({
    logger: false
  });
  
  // Register CORS for Next.js frontend
  await fastify.register(fastifyCors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  });
  
  
  const io = new Server(fastify.server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });
  
  // Initialize TTS Manager with Socket.IO for real-time events
  const ttsManager = new TTSManager(io);
  
  fastify.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });
  
  fastify.post('/command', async (request) => {
    const result = await orchestrator.handleCommand(request.body as any);
    
    // Don't auto-speak anymore - let frontend control TTS timing for proper animation sync
    return { ...result, ttsMode: ttsManager.getTTSMode() };
  });
  
  // Model management endpoints
  fastify.get('/models', async () => {
    const models = orchestrator.getAvailableModels();
    const currentModel = orchestrator.getCurrentModel();
    return { models, currentModel };
  });
  
  fastify.post('/models/switch', async (request) => {
    const { model } = request.body as any;
    const success = await orchestrator.switchToModel(model);
    return { 
      success, 
      model, 
      message: success ? `Switched to ${model}` : `Failed to switch to ${model}` 
    };
  });
  
  fastify.get('/models/current', async () => {
    const currentModel = orchestrator.getCurrentModel();
    const modelInfo = orchestrator.getModelRegistry().getActiveModelInfo();
    return { model: currentModel, info: modelInfo };
  });
  
  fastify.post('/models/auto-select', async (request) => {
    const { taskType } = request.body as any;
    const recommendedModel = orchestrator.autoSelectModelForTask(taskType);
    const switched = await orchestrator.switchToModel(recommendedModel);
    return {
      taskType,
      model: recommendedModel,
      switched,
      message: `${switched ? 'Switched to' : 'Recommended'} ${recommendedModel} for ${taskType} tasks`
    };
  });

  // TTS Control endpoints
  fastify.post('/api/tts/speak', async (request) => {
    const { text } = request.body as any;
    
    if (!text) {
      return { success: false, message: 'No text provided' };
    }
    
    try {
      const startTime = Date.now();
      await ttsManager.speak(text);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      logger.info(`Text spoken via Edge-TTS in ${actualDuration}ms`);
      
      return { 
        success: true, 
        ttsDuration: actualDuration,
        ttsStartTime: startTime,
        ttsEndTime: endTime,
        message: 'TTS completed successfully'
      };
    } catch (error) {
      logger.warn('TTS failed:', error);
      return { 
        success: false, 
        ttsError: true,
        message: 'TTS failed: ' + (error as Error).message
      };
    }
  });

  fastify.post('/api/tts/stop', async () => {
    try {
      logger.info('🛑 Stop TTS request received');
      ttsManager.stopSpeaking();
      return { success: true, message: 'TTS stopped' };
    } catch (error) {
      logger.error('Failed to stop TTS:', error);
      return { success: false, message: 'Failed to stop TTS' };
    }
  });

  fastify.post('/api/tts/voice', async (request) => {
    const { voice } = request.body as any;
    try {
      ttsManager.setVoice(voice);
      return { success: true, voice, message: `Voice changed to ${voice}` };
    } catch (error) {
      return { success: false, message: 'Failed to change voice' };
    }
  });

  fastify.get('/api/tts/voices', async () => {
    return { 
      voices: ttsManager.getAvailableVoices(),
      mode: ttsManager.getTTSMode()
    };
  });

  fastify.post('/api/tts/mode', async (request) => {
    const { mode } = request.body as any;
    try {
      if (mode === 'system' || mode === 'edge') {
        ttsManager.setTTSMode(mode);
        return { 
          success: true, 
          mode,
          voices: ttsManager.getAvailableVoices(),
          message: `TTS mode set to ${mode === 'system' ? 'Browser TTS' : 'Edge-TTS'}` 
        };
      } else {
        throw new Error('Invalid TTS mode. Use "system" or "edge".');
      }
    } catch (error) {
      return { success: false, message: 'Failed to change TTS mode: ' + (error as Error).message };
    }
  });

  fastify.get('/api/tts/mode', async () => {
    return { 
      mode: ttsManager.getTTSMode(),
      voices: ttsManager.getAvailableVoices()
    };
  });

  
  io.on('connection', (socket) => {
    logger.info('Client connected:', socket.id);
    
    socket.on('command', async (data, callback) => {
      try {
        const result = await orchestrator.handleCommand(data);
        callback({ success: true, data: result });
      } catch (error) {
        logger.error('Command error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    });
    
    socket.on('disconnect', () => {
      logger.info('Client disconnected:', socket.id);
    });
  });
  
  return {
    start: async () => {
      await fastify.listen({ port, host: '0.0.0.0' });
      logger.info(`Server listening on port ${port}`);
    },
    stop: async () => {
      io.close();
      await fastify.close();
    },
    io: io  // Expose the Socket.IO instance
  };
}