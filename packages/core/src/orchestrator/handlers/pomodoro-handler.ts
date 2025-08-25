import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { intentAnalyzer } from '../../services/intent-analyzer';
import { PomodoroService } from '../../services/pomodoro-service';

export class PomodoroHandler extends BaseHandler {
  private io?: any;
  private pomodoroService?: PomodoroService;
  
  constructor(_orchestrator: Orchestrator, io?: any) {
    super();
    this.io = io;
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
          if (analysis.entities.pomodoroDuration) {
            const duration = analysis.entities.pomodoroDuration;
            console.log(`🍅 POMODORO HANDLER: Starting ${duration}-minute Pomodoro session from duration response`);
            const session = this.pomodoroService!.startWorkSession(duration);
            
            return {
              type: 'pomodoro-response',
              content: `Your Pomodoro is set for ${duration} minutes. Focus on the task, and when done, type "break" to take a short rest.`,
              success: true
            };
          }
          break;

        case 'POMODORO':
          console.log(`🍅 POMODORO HANDLER: Processing Pomodoro ${analysis.entities.pomodoroAction} command`);
          
          if (analysis.entities.pomodoroAction === 'start') {
            // Check if user provided duration or ask for it
            const duration = PomodoroService.parseDuration(message);
            if (duration > 0 && message.match(/\d+/)) {
              // Duration provided, start session
              console.log(`🍅 POMODORO HANDLER: Starting ${duration}-minute Pomodoro session`);
              const session = this.pomodoroService!.startWorkSession(duration);
              
              return {
                type: 'pomodoro-response',
                content: `Your ${duration}-minute Pomodoro session has started! Focus on your task. I'll let you know when it's time for a break.`,
                success: true
              };
            } else {
              // Ask for duration
              return {
                type: 'pomodoro-response', 
                content: 'Your first Pomodoro session has started. I\'ll guide you through it. How many minutes would you like your Pomodoro to be?',
                success: true
              };
            }
          } else if (analysis.entities.pomodoroAction === 'continue') {
            console.log('🍅 POMODORO HANDLER: Continuing to next Pomodoro session');
            const session = this.pomodoroService!.continueToNextSession(25);
            return {
              type: 'pomodoro-response',
              content: 'Starting your next 25-minute Pomodoro session! Stay focused.',
              success: true
            };
          } else if (analysis.entities.pomodoroAction === 'stop') {
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