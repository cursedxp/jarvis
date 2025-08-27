import { ChatHandler } from '../handlers/chat-handler';
import { Orchestrator } from '../orchestrator';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { CommandRegistry } from '../handlers/command-registry';

// Mock dependencies
jest.mock('../../services/user-preferences');
jest.mock('../../services/knowledge-base');

const MockUserPreferenceManager = UserPreferenceManager as jest.MockedClass<typeof UserPreferenceManager>;
const MockKnowledgeBase = KnowledgeBase as jest.MockedClass<typeof KnowledgeBase>;

// Mock Orchestrator
const mockOrchestrator = {
  processWithLLM: jest.fn().mockResolvedValue('Test LLM response'),
  getCurrentModel: () => 'test-model',
  getAdapter: () => ({ complete: jest.fn() }),
  autoSelectModelForTask: () => 'test-model',
  switchToModel: jest.fn()
} as unknown as Orchestrator;

// Mock CommandRegistry
const mockCommandRegistry = {
  handle: jest.fn()
} as unknown as CommandRegistry;

describe('ChatHandler with Intelligent Routing', () => {
  let chatHandler: ChatHandler;
  let mockUserPrefs: jest.Mocked<UserPreferenceManager>;
  let mockKnowledgeBase: jest.Mocked<KnowledgeBase>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUserPrefs = new MockUserPreferenceManager() as jest.Mocked<UserPreferenceManager>;
    mockKnowledgeBase = new MockKnowledgeBase() as jest.Mocked<KnowledgeBase>;
    
    // Mock methods
    mockUserPrefs.getModelSpecificPrompt = jest.fn().mockReturnValue('Test system prompt');
    mockKnowledgeBase.generateContext = jest.fn().mockReturnValue('Test knowledge context');
    
    chatHandler = new ChatHandler(mockOrchestrator, mockUserPrefs, mockKnowledgeBase);
    chatHandler.setCommandRegistry(mockCommandRegistry);
  });

  describe('Task Management Routing', () => {
    test('should route clear task management requests to planning handler', async () => {
      mockCommandRegistry.handle = jest.fn().mockResolvedValue({
        type: 'planning',
        success: true,
        data: { task: 'Task created successfully' }
      });

      const command = {
        type: 'chat',
        payload: { message: 'add task finish project' }
      };

      const result = await chatHandler.handle(command);

      expect(mockCommandRegistry.handle).toHaveBeenCalledWith({
        type: 'planning',
        payload: { message: 'add task finish project' }
      });
      
      expect(result.type).toBe('planning');
      expect(result.success).toBe(true);
    });

    test('should detect various task management keywords', async () => {
      const taskMessages = [
        'create task buy groceries',
        'add new task call mom', 
        'make a task for tomorrow',
        'delete task old project',
        'remove task cleanup',
        'complete task presentation',
        'mark task done',
        'show my tasks',
        'list all tasks',
        'view tasks',
        'clear all tasks'
      ];

      mockCommandRegistry.handle = jest.fn().mockResolvedValue({
        type: 'planning',
        success: true
      });

      for (const message of taskMessages) {
        await chatHandler.handle({
          type: 'chat',
          payload: { message }
        });
      }

      expect(mockCommandRegistry.handle).toHaveBeenCalledTimes(taskMessages.length);
      taskMessages.forEach((_, index) => {
        expect(mockCommandRegistry.handle).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            type: 'planning'
          })
        );
      });
    });

    test('should NOT route vague task requests', async () => {
      const vagueMessages = [
        'i need some tasks',
        'tasks for tomorrow', 
        'help with tasks',
        'what should i do',
        'give me something to do'
      ];

      // These should go to regular chat processing
      for (const message of vagueMessages) {
        await chatHandler.handle({
          type: 'chat',
          payload: { message }
        });
      }

      // Should not route to planning handler
      expect(mockCommandRegistry.handle).not.toHaveBeenCalled();
      
      // Should process with LLM instead
      expect(mockOrchestrator.processWithLLM).toHaveBeenCalledTimes(vagueMessages.length);
    });
  });

  describe('Natural Language Processing', () => {
    test('should handle general conversation naturally', async () => {
      const command = {
        type: 'chat',
        payload: { message: 'how are you doing today?' }
      };

      const result = await chatHandler.handle(command);

      expect(mockCommandRegistry.handle).not.toHaveBeenCalled();
      expect(mockOrchestrator.processWithLLM).toHaveBeenCalled();
      expect(result.type).toBe('chat');
      expect(result.content).toBe('Test LLM response');
    });

    test('should include conversation history in natural chat', async () => {
      const command = {
        type: 'chat',
        payload: { 
          message: 'what do you think about that?',
          conversationHistory: [
            { role: 'user', content: 'I love programming' },
            { role: 'assistant', content: 'That\'s great! What do you enjoy most?' }
          ]
        }
      };

      await chatHandler.handle(command);

      expect(mockOrchestrator.processWithLLM).toHaveBeenCalledWith(
        expect.stringContaining('Previous conversation:')
      );
      
      const callArgs = (mockOrchestrator.processWithLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('user: I love programming');
      expect(callArgs).toContain('assistant: That\'s great! What do you enjoy most?');
    });

    test('should not add planning context automatically', async () => {
      const command = {
        type: 'chat',
        payload: { message: 'tell me a joke' }
      };

      await chatHandler.handle(command);

      const callArgs = (mockOrchestrator.processWithLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs).not.toContain('Today\'s Planning Context');
      expect(callArgs).not.toContain('tasks (');
    });
  });

  describe('Context and Knowledge Integration', () => {
    test('should include knowledge context in responses', async () => {
      mockKnowledgeBase.generateContext = jest.fn().mockReturnValue('Knowledge about JavaScript');
      
      const command = {
        type: 'chat',
        payload: { message: 'explain JavaScript closures' }
      };

      await chatHandler.handle(command);

      expect(mockKnowledgeBase.generateContext).toHaveBeenCalledWith('explain JavaScript closures');
      
      const callArgs = (mockOrchestrator.processWithLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('Knowledge about JavaScript');
    });

    test('should include date and time context', async () => {
      const command = {
        type: 'chat',
        payload: { message: 'what time is it?' }
      };

      await chatHandler.handle(command);

      const callArgs = (mockOrchestrator.processWithLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs).toMatch(/Current date and time: \w+, \w+ \d+, \d{4}/);
    });

    test('should use model-specific prompts', async () => {
      mockUserPrefs.getModelSpecificPrompt = jest.fn().mockReturnValue('Custom model prompt');
      
      const command = {
        type: 'chat',
        payload: { message: 'help me code' }
      };

      await chatHandler.handle(command);

      expect(mockUserPrefs.getModelSpecificPrompt).toHaveBeenCalledWith(
        'test-model',
        expect.any(String)
      );
      
      const callArgs = (mockOrchestrator.processWithLLM as jest.Mock).mock.calls[0][0];
      expect(callArgs).toContain('Custom model prompt');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should handle command registry errors gracefully', async () => {
      // Set up the mock to reject
      mockCommandRegistry.handle = jest.fn((cmd) => {
        if (cmd.type === 'planning') {
          return Promise.reject(new Error('Registry failed'));
        }
        return Promise.resolve({ type: 'test' });
      });

      const command = {
        type: 'chat',
        payload: { message: 'add task test' }
      };

      // Prevent the error from being logged during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await chatHandler.handle(command);

      // Should fallback to regular chat processing
      expect(mockOrchestrator.processWithLLM).toHaveBeenCalled();
      expect(result.type).toBe('chat');
      
      consoleSpy.mockRestore();
    });

    test('should handle missing command registry', async () => {
      const handlerWithoutRegistry = new ChatHandler(mockOrchestrator, mockUserPrefs, mockKnowledgeBase);
      
      const command = {
        type: 'chat', 
        payload: { message: 'create task test' }
      };

      const result = await handlerWithoutRegistry.handle(command);

      // Should fallback to regular processing since no registry is set
      expect(result.type).toBe('chat');
      expect(mockOrchestrator.processWithLLM).toHaveBeenCalled();
    });

    test('should provide consistent response format', async () => {
      const command = {
        type: 'chat',
        payload: { message: 'hello world' }
      };

      const result = await chatHandler.handle(command);

      expect(result).toEqual(expect.objectContaining({
        type: 'chat',
        content: expect.any(String),
        model: expect.any(String),
        taskType: expect.any(String)
      }));
    });
  });

  describe('Performance and Logging', () => {
    test('should log routing decisions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const command = {
        type: 'chat',
        payload: { message: 'add task important work' }
      };

      mockCommandRegistry.handle = jest.fn().mockResolvedValue({
        type: 'planning',
        success: true
      });

      await chatHandler.handle(command);

      // Check that both logging calls were made in order
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎯 ROUTING: Clear task action detected:'), 
        expect.any(String)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎯 Routing task management request to Planning Handler:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });

    test('should log natural language processing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const command = {
        type: 'chat',
        payload: { message: 'tell me about artificial intelligence' }
      };

      await chatHandler.handle(command);

      // Check that both logging calls were made in order
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💬 ROUTING: Keeping in chat for natural conversation:'), 
        expect.any(String)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💬 Processing message with natural intelligence:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });

    test('should maintain performance for common operations', async () => {
      const startTime = Date.now();
      
      const command = {
        type: 'chat',
        payload: { message: 'hello' }
      };

      await chatHandler.handle(command);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (1 second for testing)
      expect(processingTime).toBeLessThan(1000);
    });
  });
});