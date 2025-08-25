import { FastifyInstance } from 'fastify';
import { TTSManager } from '../../tts-manager';
import { createLogger } from '../../utils/logger';
import '../../types/fastify';

const logger = createLogger('tts-routes');

interface SpeakBody {
  text: string;
}

interface VoiceBody {
  voice: string;
}

interface ModeBody {
  mode: 'system' | 'edge';
}

export async function ttsRoutes(fastify: FastifyInstance, options: { ttsManager: TTSManager }) {
  const { ttsManager } = options;

  // Speak text using current TTS configuration
  fastify.post<{ Body: SpeakBody }>('/api/tts/speak', {
    schema: {
      body: {
        type: 'object',
        required: ['text'],
        properties: {
          text: { type: 'string', minLength: 1, maxLength: 5000 }
        }
      }
    }
  }, async (request) => {
    const { text } = request.body;
    
    if (!text.trim()) {
      throw fastify.httpErrors.badRequest('Text cannot be empty');
    }
    
    try {
      const startTime = Date.now();
      await ttsManager.speak(text);
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      
      logger.info(`Text spoken via TTS in ${actualDuration}ms`);
      
      return {
        success: true,
        ttsDuration: actualDuration,
        ttsStartTime: startTime,
        ttsEndTime: endTime,
        textLength: text.length,
        mode: ttsManager.getTTSMode(),
        message: 'TTS completed successfully'
      };
    } catch (error) {
      logger.warn('TTS failed:', error);
      throw fastify.httpErrors.internalServerError(`TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Stop current TTS playback
  fastify.post('/api/tts/stop', async () => {
    try {
      logger.info('🛑 Stop TTS request received');
      ttsManager.stopSpeaking();
      
      return { 
        success: true, 
        message: 'TTS stopped successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to stop TTS:', error);
      throw fastify.httpErrors.internalServerError('Failed to stop TTS playback');
    }
  });

  // Set TTS voice
  fastify.post<{ Body: VoiceBody }>('/api/tts/voice', {
    schema: {
      body: {
        type: 'object',
        required: ['voice'],
        properties: {
          voice: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request) => {
    const { voice } = request.body;
    
    try {
      const availableVoices = ttsManager.getAvailableVoices();
      
      // Validate voice is available (for Edge TTS mode)
      if (ttsManager.getTTSMode() === 'edge' && !availableVoices.includes(voice)) {
        throw fastify.httpErrors.badRequest(`Voice '${voice}' is not available. Available voices: ${availableVoices.join(', ')}`);
      }
      
      ttsManager.setVoice(voice);
      
      return { 
        success: true, 
        voice, 
        mode: ttsManager.getTTSMode(),
        availableVoices,
        message: `Voice successfully changed to ${voice}` 
      };
    } catch (error: any) {
      logger.error('Failed to change voice:', error);
      if (error.statusCode) throw error; // Re-throw HTTP errors
      throw fastify.httpErrors.internalServerError('Failed to change TTS voice');
    }
  });

  // Get available voices
  fastify.get('/api/tts/voices', async () => {
    try {
      const voices = ttsManager.getAvailableVoices();
      const mode = ttsManager.getTTSMode();
      
      return { 
        success: true,
        voices,
        mode,
        voiceCount: voices.length,
        message: `${voices.length} voices available in ${mode} mode`
      };
    } catch (error) {
      logger.error('Failed to get available voices:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve available voices');
    }
  });

  // Set TTS mode (system/edge)
  fastify.post<{ Body: ModeBody }>('/api/tts/mode', {
    schema: {
      body: {
        type: 'object',
        required: ['mode'],
        properties: {
          mode: { type: 'string', enum: ['system', 'edge'] }
        }
      }
    }
  }, async (request) => {
    const { mode } = request.body;
    
    try {
      ttsManager.setTTSMode(mode);
      const voices = ttsManager.getAvailableVoices();
      
      return {
        success: true,
        mode,
        voices,
        voiceCount: voices.length,
        message: `TTS mode successfully set to ${mode === 'system' ? 'Browser TTS' : 'Edge-TTS'}`
      };
    } catch (error) {
      logger.error('Failed to change TTS mode:', error);
      throw fastify.httpErrors.badRequest(`Failed to change TTS mode: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  // Get current TTS mode
  fastify.get('/api/tts/mode', async () => {
    try {
      const mode = ttsManager.getTTSMode();
      const voices = ttsManager.getAvailableVoices();
      
      return {
        success: true,
        mode,
        voices,
        voiceCount: voices.length,
        modeDescription: mode === 'system' ? 'Browser TTS' : 'Edge-TTS'
      };
    } catch (error) {
      logger.error('Failed to get TTS mode:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve TTS mode information');
    }
  });

  // Get TTS status and configuration
  fastify.get('/api/tts/status', async () => {
    try {
      const mode = ttsManager.getTTSMode();
      const voices = ttsManager.getAvailableVoices();
      
      return {
        success: true,
        status: 'ready',
        mode,
        voices,
        voiceCount: voices.length,
        capabilities: {
          canStop: true,
          canChangeVoice: true,
          canChangeMode: true,
          supportedModes: ['system', 'edge']
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get TTS status:', error);
      throw fastify.httpErrors.internalServerError('Failed to retrieve TTS status');
    }
  });
}