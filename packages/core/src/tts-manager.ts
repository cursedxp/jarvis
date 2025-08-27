import { spawn } from 'child_process';
import { createLogger } from './utils/logger';

const logger = createLogger('tts-manager');

export class TTSManager {
  private useSystemTTS: boolean = false;
  private currentVoice: string = 'en-US-AriaNeural';
  private socketIO: any = null;

  constructor(socketIO?: any) {
    // Default to Edge TTS mode to match frontend settings
    this.useSystemTTS = false;
    this.socketIO = socketIO;
  }

  setTTSMode(mode: 'system' | 'edge') {
    this.useSystemTTS = mode === 'system';
    logger.info(`TTS mode set to: ${mode === 'system' ? 'Browser TTS' : 'Edge-TTS'}`);
    
    // Reset to appropriate default voice when switching modes
    if (!this.useSystemTTS) {
      // Switching to Edge-TTS, ensure we have a valid Edge voice
      const edgeVoices = this.getAvailableVoices();
      if (edgeVoices.length > 0 && !edgeVoices.includes(this.currentVoice)) {
        this.currentVoice = 'en-US-AriaNeural';
        logger.info(`Voice reset to Edge-TTS default: ${this.currentVoice}`);
      }
    }
  }

  getTTSMode(): 'system' | 'edge' {
    return this.useSystemTTS ? 'system' : 'edge';
  }

  setVoice(voice: string) {
    this.currentVoice = voice;
    logger.info(`Voice set to: ${voice}`);
  }

  setSpeechRate(rate: number) {
    // Speech rate setting - implementation placeholder
    logger.info(`Speech rate set to: ${rate}`);
  }

  getAvailableVoices(): string[] {
    if (this.useSystemTTS) {
      // Browser voices - actual voices will be loaded on the client side
      return [];
    } else {
      // Edge-TTS voices
      return [
        'en-US-AriaNeural',
        'en-US-JennyNeural', 
        'en-US-GuyNeural',
        'en-US-AndrewNeural',
        'en-US-BrianNeural',
        'en-US-EmmaNeural',
        'en-GB-LibbyNeural',
        'en-GB-RyanNeural'
      ];
    }
  }

  async speak(text: string): Promise<void> {
    if (this.useSystemTTS) {
      // Browser TTS - handled by frontend
      logger.info('Using browser TTS (handled by frontend)');
      return;
    } else {
      // Edge-TTS
      return this.speakWithEdgeTTS(text);
    }
  }

  private async speakWithEdgeTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputFile = `/tmp/jarvis_tts_${Date.now()}.wav`;
      
      logger.info('🎤 Starting Edge-TTS generation...');
      const edgeTTS = spawn('/Users/anilozsoy/.local/bin/edge-tts', [
        '--voice', this.currentVoice,
        '--text', text,
        '--write-media', outputFile
      ]);

      edgeTTS.on('close', (code) => {
        if (code === 0) {
          logger.info('🎵 Edge-TTS generation complete, starting playback...');
          
          // Emit event that audio is about to start
          if (this.socketIO) {
            this.socketIO.emit('audio_starting', {
              timestamp: Date.now(),
              voice: this.currentVoice
            });
            logger.info('📡 Emitted audio_starting event');
          }
          
          // Play the audio file
          const player = spawn('afplay', [outputFile]);
          
          player.on('close', () => {
            logger.info('🔚 Audio playback finished');
            
            // Emit event that audio finished
            if (this.socketIO) {
              this.socketIO.emit('audio_finished', {
                timestamp: Date.now()
              });
              logger.info('📡 Emitted audio_finished event');
            }
            
            // Clean up temp file
            spawn('rm', [outputFile]);
            resolve();
          });
          
          player.on('error', (error) => {
            logger.error('Audio playbook error:', error);
            reject(error);
          });
        } else {
          logger.error(`Edge-TTS failed with code: ${code}`);
          reject(new Error(`Edge-TTS failed with code: ${code}`));
        }
      });

      edgeTTS.on('error', (error) => {
        logger.error('Edge-TTS error:', error);
        reject(error);
      });
    });
  }

  stopSpeaking() {
    // Kill any running TTS processes
    logger.info('🛑 Killing TTS processes (edge-tts|afplay)');
    spawn('pkill', ['-f', 'edge-tts|afplay']);
    
    // Emit stop event via WebSocket
    if (this.socketIO) {
      this.socketIO.emit('audio_stopped', {
        timestamp: Date.now(),
        reason: 'user_stop'
      });
      logger.info('📡 Emitted audio_stopped event');
    }
    
    logger.info('✅ TTS stop command completed');
  }
}