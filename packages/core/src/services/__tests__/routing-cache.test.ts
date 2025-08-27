import { RoutingCache } from '../routing-cache';
import { RoutingDecision } from '../intelligent-router';

describe('RoutingCache', () => {
  let cache: RoutingCache;

  beforeEach(() => {
    cache = new RoutingCache();
  });

  afterEach(() => {
    cache.clear();
    cache.destroy(); // Clean up timers
  });

  describe('Cache Operations', () => {
    test('should store and retrieve routing decisions', () => {
      const decision: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: { taskName: 'test' },
        reasoning: 'Test routing decision',
        shouldRoute: true,
        processingTime: 150
      };

      cache.set('create a task', decision);
      const retrieved = cache.get('create a task');

      expect(retrieved).toEqual(decision);
    });

    test('should return null for non-existent cache entries', () => {
      const result = cache.get('non-existent-message');
      expect(result).toBeNull();
    });

    test('should handle cache misses gracefully', () => {
      expect(() => {
        cache.get('any message');
      }).not.toThrow();
    });
  });

  describe('Cache Key Normalization', () => {
    test('should normalize similar messages to same cache key', () => {
      const decision: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 100
      };

      cache.set('Create a Task', decision);
      
      // Different casing should hit the same cache entry
      expect(cache.get('create a task')).toEqual(decision);
      expect(cache.get('CREATE A TASK')).toEqual(decision);
    });

    test('should normalize whitespace in cache keys', () => {
      const decision: RoutingDecision = {
        intent: 'START_TIMER',
        confidence: 0.88,
        handler: 'PomodoroHandler',
        action: 'pomodoro',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 120
      };

      cache.set('start   timer', decision);
      
      // Extra whitespace should be normalized
      expect(cache.get('start timer')).toEqual(decision);
      expect(cache.get('  start timer  ')).toEqual(decision);
    });

    test('should handle punctuation normalization', () => {
      const decision: RoutingDecision = {
        intent: 'PLAY_MUSIC',
        confidence: 0.92,
        handler: 'MusicHandler',
        action: 'music',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 110
      };

      cache.set('play music!', decision);
      
      // Should ignore punctuation differences
      expect(cache.get('play music')).toEqual(decision);
      expect(cache.get('play music?')).toEqual(decision);
    });
  });

  describe('Cache Expiration', () => {
    test('should expire entries after TTL', async () => {
      const shortTTLCache = new RoutingCache({ ttlMs: 100 });
      
      const decision: RoutingDecision = {
        intent: 'GENERAL_CHAT',
        confidence: 0.75,
        handler: 'ChatHandler',
        action: 'chat',
        entities: {},
        reasoning: 'Test',
        shouldRoute: false,
        processingTime: 90
      };

      shortTTLCache.set('test message', decision);
      expect(shortTTLCache.get('test message')).toEqual(decision);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(shortTTLCache.get('test message')).toBeNull();
      shortTTLCache.destroy(); // Clean up
    });

    test('should refresh TTL on cache hit', () => {
      const decision: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 140
      };

      cache.set('refresh test', decision);
      
      // Access the cache entry to refresh TTL
      cache.get('refresh test');
      
      // Entry should still be accessible
      expect(cache.get('refresh test')).toEqual(decision);
    });
  });

  describe('Cache Size Limits', () => {
    test('should evict oldest entries when max size reached', () => {
      const smallCache = new RoutingCache({ maxSize: 3 });
      
      const decision1: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'First',
        shouldRoute: true,
        processingTime: 100
      };
      
      const decision2: RoutingDecision = {
        intent: 'PLAY_MUSIC',
        confidence: 0.92,
        handler: 'MusicHandler', 
        action: 'music',
        entities: {},
        reasoning: 'Second',
        shouldRoute: true,
        processingTime: 110
      };
      
      const decision3: RoutingDecision = {
        intent: 'START_TIMER',
        confidence: 0.88,
        handler: 'PomodoroHandler',
        action: 'pomodoro', 
        entities: {},
        reasoning: 'Third',
        shouldRoute: true,
        processingTime: 120
      };
      
      const decision4: RoutingDecision = {
        intent: 'GENERAL_CHAT',
        confidence: 0.75,
        handler: 'ChatHandler',
        action: 'chat',
        entities: {},
        reasoning: 'Fourth',
        shouldRoute: false,
        processingTime: 130
      };

      smallCache.set('message one', decision1);
      smallCache.set('message two', decision2);
      smallCache.set('message three', decision3);
      
      // Cache should be at capacity
      expect(smallCache.get('message one')).toEqual(decision1);
      expect(smallCache.get('message two')).toEqual(decision2);
      expect(smallCache.get('message three')).toEqual(decision3);
      
      // Adding 4th entry should evict the first
      smallCache.set('message four', decision4);
      
      expect(smallCache.get('message one')).toBeNull(); // Evicted
      expect(smallCache.get('message two')).toEqual(decision2);
      expect(smallCache.get('message three')).toEqual(decision3);
      expect(smallCache.get('message four')).toEqual(decision4);
      
      smallCache.destroy(); // Clean up
    });

    test('should handle cache size of 1', () => {
      const tinyCache = new RoutingCache({ maxSize: 1 });
      
      const decision1: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'First',
        shouldRoute: true,
        processingTime: 100
      };
      
      const decision2: RoutingDecision = {
        intent: 'PLAY_MUSIC',
        confidence: 0.92,
        handler: 'MusicHandler',
        action: 'music', 
        entities: {},
        reasoning: 'Second',
        shouldRoute: true,
        processingTime: 110
      };

      tinyCache.set('create task message', decision1);
      expect(tinyCache.get('create task message')).toEqual(decision1);
      
      tinyCache.set('play music message', decision2);
      expect(tinyCache.get('create task message')).toBeNull();
      expect(tinyCache.get('play music message')).toEqual(decision2);
      
      tinyCache.destroy(); // Clean up
    });
  });

  describe('Cache Statistics', () => {
    test('should track cache hits and misses', () => {
      const decision: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 100
      };

      cache.set('test', decision);
      
      // Hit
      cache.get('test');
      cache.get('test');
      
      // Miss
      cache.get('nonexistent');
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(2/3);
    });

    test('should track cache size', () => {
      const decision: RoutingDecision = {
        intent: 'GENERAL_CHAT',
        confidence: 0.75,
        handler: 'ChatHandler',
        action: 'chat',
        entities: {},
        reasoning: 'Test',
        shouldRoute: false,
        processingTime: 90
      };

      expect(cache.getStats().size).toBe(0);
      
      cache.set('entry1', decision);
      expect(cache.getStats().size).toBe(1);
      
      cache.set('entry2', decision);
      expect(cache.getStats().size).toBe(2);
    });
  });

  describe('Cache Clearing', () => {
    test('should clear all cache entries', () => {
      const decision: RoutingDecision = {
        intent: 'CREATE_TASK',
        confidence: 0.95,
        handler: 'PlanningHandler',
        action: 'planning',
        entities: {},
        reasoning: 'Test',
        shouldRoute: true,
        processingTime: 100
      };

      cache.set('test1', decision);
      cache.set('test2', decision);
      
      expect(cache.getStats().size).toBe(2);
      
      cache.clear();
      
      expect(cache.getStats().size).toBe(0);
      expect(cache.get('test1')).toBeNull();
      expect(cache.get('test2')).toBeNull();
    });

    test('should reset statistics on clear', () => {
      const decision: RoutingDecision = {
        intent: 'GENERAL_CHAT',
        confidence: 0.75,
        handler: 'ChatHandler',
        action: 'chat',
        entities: {},
        reasoning: 'Test',
        shouldRoute: false,
        processingTime: 90
      };

      cache.set('test', decision);
      cache.get('test'); // Hit
      cache.get('nonexistent'); // Miss
      
      const statsBefore = cache.getStats();
      expect(statsBefore.hits).toBe(1);
      expect(statsBefore.misses).toBe(1);
      
      cache.clear();
      
      const statsAfter = cache.getStats();
      expect(statsAfter.hits).toBe(0);
      expect(statsAfter.misses).toBe(0);
      expect(statsAfter.size).toBe(0);
    });
  });
});