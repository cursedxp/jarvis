import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { intentAnalyzer } from '../../services/intent-analyzer';
import { PomodoroService } from '../../services/pomodoro-service';

export class PomodoroHandler extends BaseHandler {
  // @ts-ignore - used for PomodoroService initialization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _io?: any;
  private pomodoroService?: PomodoroService;
  
  constructor(_orchestrator: Orchestrator, io?: any) {
    super();
    this._io = io;
    console.log('🍅 POMODORO HANDLER: Initialized with Socket.IO instance:', !!io);
    
    // Initialize pomodoro service with Socket.IO
    if (io) {
      this.pomodoroService = new PomodoroService(io);
      // Set up callbacks for automatic announcements
      this.pomodoroService.setCallbacks({
        onWorkComplete: () => {
          console.log('🍅 POMODORO HANDLER: Work session completed, announcing break');
        },
        onBreakComplete: () => {
          console.log('🍅 POMODORO HANDLER: Break completed, asking to continue');
        }
      });
    }
  }

  getHandlerName(): string {
    return 'PomodoroHandler';
  }

  getCommands(): string[] {
    return ['pomodoro'];
  }

  async handle(command: Command): Promise<any> {
    const { message } = command.payload;
    
    console.log('🍅 POMODORO HANDLER: Processing message:', message);
    
    try {
      // Use AI-powered intent analysis for Pomodoro commands only
      const analysis = await intentAnalyzer.analyzeIntent(message, []);
      console.log('🍅 POMODORO HANDLER: Intent analysis result:', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        entities: analysis.entities,
        reasoning: analysis.reasoning
      });
      
      // Handle Pomodoro-specific intents
      switch (analysis.intent) {
        case 'POMODORO_DURATION':
          // Handle duration from multiple possible entity fields
          const duration = analysis.entities?.pomodoroDuration || 
                           (analysis.entities?.count ? parseInt(String(analysis.entities.count)) : undefined) || 
                           PomodoroService.parseDuration(message);
          
          if (duration && duration > 0) {
            console.log(`🍅 POMODORO HANDLER: Starting ${duration}-minute Pomodoro session from duration response`);
            this.pomodoroService!.startWorkSession(duration);
            
            return {
              type: 'pomodoro-response',
              content: `Your ${duration}-minute Pomodoro work session has started! Stay focused. When time's up, I'll automatically start your 5-minute break.`,
              success: true
            };
          }
          break;

        case 'POMODORO':
          console.log(`🍅 POMODORO HANDLER: Processing Pomodoro ${analysis.entities?.pomodoroAction || 'start'} command`);
          
          const pomodoroAction = analysis.entities?.pomodoroAction || 'start'; // Default to 'start' if null
          
          if (pomodoroAction === 'start_break') {
            // Start a 5-minute break session
            console.log(`🍅 POMODORO HANDLER: Starting 5-minute break session`);
            this.pomodoroService!.startBreakSession(5);
            
            return {
              type: 'pomodoro-response',
              content: `Break time! Starting your 5-minute break. Relax and recharge!`,
              success: true
            };
          } else if (pomodoroAction === 'stop_break') {
            // Stop break and reset to 25-minute work timer (ready state)
            console.log(`🍅 POMODORO HANDLER: Stopping break and resetting to 25-minute work timer`);
            this.pomodoroService!.stopSession();
            
            // Emit sync to reset frontend widget to 25-minute work timer
            if (this._io) {
              this._io.emit('pomodoro_sync', {
                action: 'reset_to_work',
                phase: 'idle',
                duration: 25,
                timestamp: new Date()
              });
            }
            
            return {
              type: 'pomodoro-response',
              content: `Break stopped. Ready for a 25-minute work session when you are!`,
              success: true
            };
          } else if (pomodoroAction === 'start') {
            // Check if user provided duration or use default
            const duration = PomodoroService.parseDuration(message);
            if (duration > 0 && message.match(/\d+/)) {
              // Duration provided, start session
              console.log(`🍅 POMODORO HANDLER: Starting ${duration}-minute Pomodoro session`);
              this.pomodoroService!.startWorkSession(duration);
              
              return {
                type: 'pomodoro-response',
                content: `Your ${duration}-minute Pomodoro session has started! Focus on your task. I'll let you know when it's time for a break.`,
                success: true
              };
            } else {
              // Check if there's already a session running  
              const currentSession = this.pomodoroService!.getCurrentSession();
              if (currentSession) {
                // Reset and start new 25-minute session (regardless of current state)
                console.log(`🍅 POMODORO HANDLER: Resetting existing ${currentSession.phase} session and starting new 25-minute Pomodoro`);
                this.pomodoroService!.startWorkSession(25);
                
                return {
                  type: 'pomodoro-response',
                  content: `Pomodoro reset! Starting fresh 25-minute work session. Stay focused!`,
                  success: true
                };
              } else {
                // No existing session - start default 25-minute session
                console.log(`🍅 POMODORO HANDLER: Starting default 25-minute Pomodoro session`);
                this.pomodoroService!.startWorkSession(25);
                
                return {
                  type: 'pomodoro-response',
                  content: `Your 25-minute Pomodoro work session has started! Stay focused. When time's up, I'll automatically start your 5-minute break.`,
                  success: true
                };
              }
            }
          } else if (pomodoroAction === 'continue') {
            console.log('🍅 POMODORO HANDLER: Continuing to next Pomodoro session');
            this.pomodoroService!.continueToNextSession(25);
            return {
              type: 'pomodoro-response',
              content: 'Starting your next 25-minute Pomodoro session! Stay focused.',
              success: true
            };
          } else if (pomodoroAction === 'stop') {
            this.pomodoroService!.stopSession();
            return {
              type: 'pomodoro-response',
              content: 'Pomodoro session stopped.',
              success: true
            };
          }
          
          return {
            type: 'pomodoro-response',
            content: 'Pomodoro command processed.',
            success: true
          };

        default:
          return {
            type: 'pomodoro-response',
            content: 'I can help you with Pomodoro sessions. Say "start pomodoro" to begin, or "stop pomodoro" to end a session.',
            success: false
          };
      }
      
    } catch (error) {
      console.error('🍅 POMODORO HANDLER: Error processing command:', error);
      return {
        type: 'pomodoro-response',
        content: `I encountered an error while processing your Pomodoro request: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }
}