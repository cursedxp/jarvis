import { CommandRegistry } from '../handlers/command-registry';
import { IntelligentRouter } from '../../services/intelligent-router';
import { Orchestrator } from '../orchestrator';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { FineTuningManager } from '../../services/fine-tuning';

// Mock dependencies
jest.mock('../../services/intelligent-router');
jest.mock('../../services/user-preferences');
jest.mock('../../services/knowledge-base');
jest.mock('../../services/fine-tuning');

const MockIntelligentRouter = IntelligentRouter as jest.MockedClass<typeof IntelligentRouter>;
const MockUserPreferenceManager = UserPreferenceManager as jest.MockedClass<typeof UserPreferenceManager>;
const MockKnowledgeBase = KnowledgeBase as jest.MockedClass<typeof KnowledgeBase>;
const MockFineTuningManager = FineTuningManager as jest.MockedClass<typeof FineTuningManager>;

// Mock Orchestrator
const mockOrchestrator = {
  processWithLLM: jest.fn(),
  getCurrentModel: () => 'test-model',
  getAdapter: () => ({ complete: jest.fn() }),
  autoSelectModelForTask: () => 'test-model',
  switchToModel: jest.fn()
} as unknown as Orchestrator;

describe('CommandRegistry with Intelligent Routing', () => {
  let commandRegistry: CommandRegistry;
  let mockRouter: jest.Mocked<IntelligentRouter>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock instances
    const mockUserPrefs = new MockUserPreferenceManager() as jest.Mocked<UserPreferenceManager>;
    const mockKnowledgeBase = new MockKnowledgeBase() as jest.Mocked<KnowledgeBase>;
    const mockFineTuning = new MockFineTuningManager() as jest.Mocked<FineTuningManager>;
    
    // Create command registry
    commandRegistry = new CommandRegistry(
      mockOrchestrator,
      mockUserPrefs,
      mockKnowledgeBase,
      mockFineTuning
    );

    // Get the mocked router instance
    mockRouter = MockIntelligentRouter.mock.instances[0] as jest.Mocked<IntelligentRouter>;
  });

  describe('Intelligent Routing Integration', () => {
    test('should create IntelligentRouter instance on initialization', () => {
      expect(MockIntelligentRouter).toHaveBeenCalledWith(mockOrchestrator);
    });

    test('should handle intelligent routing for chat commands', async () => {
      // Mock router response for task creation
      mockRouter.routeWithSession.mockResolvedValue({
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: { taskName: 'test task' },
        reasoning: 'User wants to create a task',
        shouldRoute: true,
        processingTime: 150
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'create a task for tomorrow',
          sessionId: 'test-session-123'
        }
      };

      const result = await commandRegistry.handle(command);

      expect(mockRouter.routeWithSession).toHaveBeenCalledWith(
        'create a task for tomorrow',
        'test-session-123',
        expect.any(Object)
      );
      
      expect(result.type).toBe('planning-response');
      expect(result.intent).toBe('CREATE_TASK');
    });

    test('should fallback to regular chat for non-routable messages', async () => {
      // Mock router response for general chat
      mockRouter.routeWithSession.mockResolvedValue({
        intent: 'GENERAL_CHAT',
        confidence: 0.75,
        handler: 'ChatHandler',
        action: 'chat',
        entities: {},
        reasoning: 'General conversation',
        shouldRoute: false,
        processingTime: 100
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'how are you today?',
          sessionId: 'test-session-123'
        }
      };

      const result = await commandRegistry.handle(command);

      expect(mockRouter.routeWithSession).toHaveBeenCalled();
      expect(result.type).toBe('chat');
    });

    test('should handle routing errors gracefully', async () => {
      // Mock router to throw error
      mockRouter.routeWithSession.mockRejectedValue(new Error('Routing failed'));

      const command = {
        type: 'chat',
        payload: { 
          message: 'create a task',
          sessionId: 'test-session-123'
        }
      };

      const result = await commandRegistry.handle(command);

      // Should fallback to regular chat processing
      expect(result.type).toBe('chat');
    });

    test('should pass context information to router', async () => {
      mockRouter.routeWithSession.mockResolvedValue({
        intent: 'PLAY_MUSIC',
        confidence: 0.92,
        handler: 'MusicHandler',
        action: 'music',
        entities: { artist: 'Test Artist' },
        reasoning: 'User wants music',
        shouldRoute: true,
        processingTime: 120
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'play some music',
          sessionId: 'test-session-456',
          conversationHistory: [
            { role: 'user', content: 'I want to relax' }
          ]
        }
      };

      await commandRegistry.handle(command);

      expect(mockRouter.routeWithSession).toHaveBeenCalledWith(
        'play some music',
        'test-session-456',
        expect.objectContaining({
          conversationHistory: expect.any(Array)
        })
      );
    });
  });

  describe('Handler Metadata Integration', () => {
    test('should provide handler capabilities to router', () => {
      const capabilities = commandRegistry.getHandlerCapabilities();
      
      expect(capabilities).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'ChatHandler',
          commands: expect.arrayContaining(['chat'])
        }),
        expect.objectContaining({
          name: 'PlanningHandler', 
          commands: expect.arrayContaining(['planning'])
        }),
        expect.objectContaining({
          name: 'MusicHandler',
          commands: expect.arrayContaining(['music'])
        }),
        expect.objectContaining({
          name: 'PomodoroHandler',
          commands: expect.arrayContaining(['pomodoro'])
        })
      ]));
    });

    test('should provide intent-to-handler mapping', () => {
      const intentMap = commandRegistry.getIntentHandlerMap();
      
      expect(intentMap).toEqual(expect.objectContaining({
        'CREATE_TASK': 'PlanningHandler',
        'DELETE_TASK': 'PlanningHandler',
        'LIST_TASKS': 'PlanningHandler',
        'PLAY_MUSIC': 'MusicHandler',
        'PAUSE_MUSIC': 'MusicHandler',
        'START_TIMER': 'PomodoroHandler',
        'STOP_TIMER': 'PomodoroHandler',
        'GENERAL_CHAT': 'ChatHandler'
      }));
    });
  });

  describe('Performance and Monitoring', () => {
    test('should emit routing events via Socket.IO', async () => {
      const mockIo = { emit: jest.fn() };
      
      const registryWithIo = new CommandRegistry(
        mockOrchestrator,
        new MockUserPreferenceManager(),
        new MockKnowledgeBase(), 
        new MockFineTuningManager(),
        mockIo
      );

      const mockRouterWithIo = MockIntelligentRouter.mock.instances[1] as jest.Mocked<IntelligentRouter>;
      mockRouterWithIo.routeWithSession.mockResolvedValue({
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'Task creation request',
        shouldRoute: true,
        processingTime: 200
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'add a task',
          sessionId: 'test-session'
        }
      };

      await registryWithIo.handle(command);

      expect(mockIo.emit).toHaveBeenCalledWith('intelligent_routing_decision', {
        intent: 'CREATE_TASK',
        handler: 'PlanningHandler',
        confidence: 0.95,
        processingTime: 200,
        sessionId: 'test-session',
        timestamp: expect.any(String)
      });
    });

    test('should track routing performance metrics', async () => {
      mockRouter.routeWithSession.mockResolvedValue({
        intent: 'START_TIMER',
        confidence: 0.88,
        handler: 'PomodoroHandler',
        action: 'pomodoro',
        entities: { duration: '25' },
        reasoning: 'Timer request',
        shouldRoute: true,
        processingTime: 180
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'start a timer',
          sessionId: 'test-session'
        }
      };

      const result = await commandRegistry.handle(command);

      expect(result).toHaveProperty('routingMetrics');
      expect(result.routingMetrics).toEqual(expect.objectContaining({
        processingTime: 180,
        cacheHit: false,
        intent: 'START_TIMER',
        confidence: 0.88
      }));
    });

    test('should handle high confidence routing decisions', async () => {
      mockRouter.routeWithSession.mockResolvedValue({
        intent: 'DELETE_TASK',
        confidence: 0.98,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: { taskName: 'old task' },
        reasoning: 'High confidence task deletion',
        shouldRoute: true,
        processingTime: 90
      });

      const command = {
        type: 'chat',
        payload: { 
          message: 'delete the task called old task',
          sessionId: 'test-session'
        }
      };

      const result = await commandRegistry.handle(command);

      expect(result.type).toBe('planning-response');
      expect(result.confidence).toBe(0.98);
      expect(result.entities.taskName).toBe('old task');
    });
  });

  describe('Backward Compatibility', () => {
    test('should handle non-chat commands normally', async () => {
      const command = {
        type: 'switchModel',
        payload: { model: 'gpt-4' }
      };

      const result = await commandRegistry.handle(command);

      // Should not call intelligent router for non-chat commands
      expect(mockRouter.routeWithSession).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should maintain existing command structure', () => {
      const commands = commandRegistry.getAvailableCommands();
      
      expect(commands).toEqual(expect.arrayContaining([
        'chat', 'explain', 'refactor', 'test', 'install', // ChatHandler
        'switchModel', 'listModels', 'getCurrentModel', 'autoSelectModel', 'setPersonality', // ModelHandler
        'setPreferences', 'getPreferences', // PreferencesHandler
        'addKnowledge', 'searchKnowledge', // KnowledgeHandler
        'startFineTuning', 'getTrainingStatus', 'stopTraining', // TrainingHandler
        'pomodoro', // PomodoroHandler
        'planning', // PlanningHandler
        'music', 'spotify', 'play', 'pause', 'next', 'previous', 'volume' // MusicHandler
      ]));
    });
  });
});