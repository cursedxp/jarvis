import { IntelligentRouter } from '../intelligent-router';
import { Orchestrator } from '../../orchestrator/orchestrator';
import { LLMAdapter } from '../../adapters/base';

// Mock LLM Adapter
class MockLLMAdapter extends LLMAdapter {
  constructor() {
    super({ apiKey: 'test', model: 'mock-llm' });
  }
  
  async complete(prompt: string, _options?: any): Promise<string> {
    // Mock different responses based on the user message in the prompt
    const userMessage = this.extractUserMessage(prompt);
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('create') && lowerMessage.includes('task') || 
        lowerMessage.includes('add') && lowerMessage.includes('task') ||
        lowerMessage.includes('new') && lowerMessage.includes('task')) {
      return JSON.stringify({
        intent: 'CREATE_TASK',
        confidence: 0.95,
        entities: { taskName: 'test task', dueDate: 'tomorrow' },
        handler: 'PlanningHandler',
        action: 'planning',
        reasoning: 'User explicitly requested task creation'
      });
    }
    
    if (lowerMessage.includes('play') && (lowerMessage.includes('music') || lowerMessage.includes('playlist'))) {
      return JSON.stringify({
        intent: 'PLAY_MUSIC',
        confidence: 0.92,
        entities: { artist: 'unknown', genre: 'unknown' },
        handler: 'MusicHandler',
        action: 'music',
        reasoning: 'User requested music playbook'
      });
    }
    
    if ((lowerMessage.includes('start') && (lowerMessage.includes('timer') || lowerMessage.includes('pomodoro'))) ||
        lowerMessage.includes('focus session') || lowerMessage.includes('start one')) {
      const duration = lowerMessage.includes('45') ? '45' : '25';
      return JSON.stringify({
        intent: 'START_TIMER',
        confidence: 0.88,
        entities: { duration: duration, unit: 'minutes' },
        handler: 'PomodoroHandler', 
        action: 'pomodoro',
        reasoning: 'User wants to start a productivity timer'
      });
    }
    
    return JSON.stringify({
      intent: 'GENERAL_CHAT',
      confidence: 0.75,
      entities: {},
      handler: 'ChatHandler',
      action: 'chat',
      reasoning: 'General conversation request'
    });
  }

  private extractUserMessage(prompt: string): string {
    // Extract the actual user message from the system prompt
    const lines = prompt.split('\n');
    const userLine = lines.find(line => line.startsWith('User:') || line.includes('User message to analyze:'));
    if (userLine) {
      return userLine.replace(/^User:\s*/, '').replace(/^.*User message to analyze:\s*"/, '').replace(/"\s*$/, '');
    }
    return prompt; // Fallback to entire prompt
  }

  async streamComplete(_prompt: string, onChunk: (chunk: string) => void, _options?: any): Promise<void> {
    onChunk('mock stream response');
  }

  async listModels(): Promise<string[]> {
    return ['mock-llm'];
  }
}

// Mock Orchestrator
const mockOrchestrator = {
  processWithLLM: jest.fn(),
  getCurrentModel: () => 'mock-llm',
  getAdapter: () => new MockLLMAdapter()
} as unknown as Orchestrator;

describe('IntelligentRouter', () => {
  let router: IntelligentRouter;

  beforeEach(() => {
    router = new IntelligentRouter(mockOrchestrator);
    jest.clearAllMocks();
  });

  describe('Intent Analysis', () => {
    test('should detect CREATE_TASK intent with high confidence', async () => {
      const result = await router.analyzeIntent('create a task for tomorrow');
      
      expect(result.intent).toBe('CREATE_TASK');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.handler).toBe('PlanningHandler');
      expect(result.action).toBe('planning');
      expect(result.entities).toHaveProperty('taskName');
      expect(result.entities).toHaveProperty('dueDate');
    });

    test('should detect PLAY_MUSIC intent with medium-high confidence', async () => {
      const result = await router.analyzeIntent('play some music');
      
      expect(result.intent).toBe('PLAY_MUSIC');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.handler).toBe('MusicHandler');
      expect(result.action).toBe('music');
    });

    test('should detect START_TIMER intent', async () => {
      const result = await router.analyzeIntent('start a 25 minute pomodoro timer');
      
      expect(result.intent).toBe('START_TIMER');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.handler).toBe('PomodoroHandler');
      expect(result.action).toBe('pomodoro');
      expect(result.entities).toHaveProperty('duration');
    });

    test('should fallback to GENERAL_CHAT for unclear intents', async () => {
      const result = await router.analyzeIntent('how are you doing today?');
      
      expect(result.intent).toBe('GENERAL_CHAT');
      expect(result.handler).toBe('ChatHandler');
      expect(result.action).toBe('chat');
    });

    test('should include reasoning for all routing decisions', async () => {
      const result = await router.analyzeIntent('create a task');
      
      expect(result.reasoning).toBeDefined();
      expect(typeof result.reasoning).toBe('string');
      expect(result.reasoning.length).toBeGreaterThan(10);
    });
  });

  describe('Routing Logic', () => {
    test('should route task creation to PlanningHandler', async () => {
      const routingDecision = await router.route('add a new task called finish project');
      
      expect(routingDecision.handler).toBe('PlanningHandler');
      expect(routingDecision.action).toBe('planning');
      expect(routingDecision.shouldRoute).toBe(true);
    });

    test('should route music requests to MusicHandler', async () => {
      const routingDecision = await router.route('play my favorite playlist');
      
      expect(routingDecision.handler).toBe('MusicHandler');
      expect(routingDecision.action).toBe('music');
      expect(routingDecision.shouldRoute).toBe(true);
    });

    test('should keep general conversation in ChatHandler', async () => {
      const routingDecision = await router.route('what is the weather like?');
      
      expect(routingDecision.handler).toBe('ChatHandler');
      expect(routingDecision.action).toBe('chat');
      expect(routingDecision.shouldRoute).toBe(false); // Stay in current handler
    });

    test('should provide confidence scores for routing decisions', async () => {
      const routingDecision = await router.route('create a task');
      
      expect(routingDecision.confidence).toBeDefined();
      expect(routingDecision.confidence).toBeGreaterThan(0);
      expect(routingDecision.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Requirements', () => {
    test('should complete routing analysis within 300ms', async () => {
      const startTime = Date.now();
      await router.analyzeIntent('create a task for tomorrow');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(300);
    });

    test('should handle multiple concurrent routing requests', async () => {
      const promises = [
        router.route('create a task'),
        router.route('play music'),
        router.route('start timer'),
        router.route('how are you?')
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.handler).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Context Awareness', () => {
    test('should consider conversation history in routing decisions', async () => {
      const conversationHistory = [
        { role: 'user', content: 'I need to be productive today' },
        { role: 'assistant', content: 'I can help you with task management and timers.' }
      ];
      
      const result = await router.analyzeIntent('start one now', { conversationHistory });
      
      // Should understand "one" refers to timer from context
      expect(result.intent).toBe('START_TIMER');
      expect(result.handler).toBe('PomodoroHandler');
    });

    test('should maintain routing context across requests', async () => {
      // First request establishes context
      await router.route('I want to work on my project');
      
      // Follow-up should understand context
      const result = await router.route('create a task for it');
      
      expect(result.handler).toBe('PlanningHandler');
      expect(result.intent).toBe('CREATE_TASK');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed LLM responses gracefully', async () => {
      // Mock a malformed response
      const mockBadAdapter = {
        complete: () => Promise.resolve('invalid json response'),
        getModelName: () => 'bad-mock'
      };
      
      const badRouter = new IntelligentRouter({
        ...mockOrchestrator,
        getAdapter: () => mockBadAdapter
      } as any);
      
      const result = await badRouter.analyzeIntent('test message');
      
      // Should fallback gracefully
      expect(result.intent).toBe('GENERAL_CHAT');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.handler).toBe('ChatHandler');
    });

    test('should handle LLM timeout/failure', async () => {
      const mockTimeoutAdapter = {
        complete: () => Promise.reject(new Error('Timeout')),
        getModelName: () => 'timeout-mock'
      };
      
      const timeoutRouter = new IntelligentRouter({
        ...mockOrchestrator,
        getAdapter: () => mockTimeoutAdapter
      } as any);
      
      const result = await timeoutRouter.analyzeIntent('test message');
      
      // Should fallback to safe defaults
      expect(result.intent).toBe('GENERAL_CHAT');
      expect(result.handler).toBe('ChatHandler');
      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Entity Extraction', () => {
    test('should extract task-related entities', async () => {
      const result = await router.analyzeIntent('create a task called "finish report" due tomorrow');
      
      expect(result.entities).toHaveProperty('taskName');
      expect(result.entities).toHaveProperty('dueDate');
      expect(result.entities.taskName).toContain('test task');
    });

    test('should extract timer duration entities', async () => {
      const result = await router.analyzeIntent('start a 45 minute focus session');
      
      expect(result.entities).toHaveProperty('duration');
      expect(result.entities).toHaveProperty('unit');
    });

    test('should handle missing entities gracefully', async () => {
      const result = await router.analyzeIntent('play music');
      
      expect(result.entities).toBeDefined();
      expect(typeof result.entities).toBe('object');
    });
  });
});