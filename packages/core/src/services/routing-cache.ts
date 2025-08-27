import { RoutingDecision } from "./intelligent-router";

interface CacheEntry {
  decision: RoutingDecision;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize?: number;
  ttlMs?: number;
  cleanupIntervalMs?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  evictions: number;
}

export class RoutingCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttlMs: number;
  private cleanupIntervalMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  // Statistics
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize || 1000;
    this.ttlMs = config.ttlMs || 5 * 60 * 1000; // 5 minutes default
    this.cleanupIntervalMs = config.cleanupIntervalMs || 60 * 1000; // 1 minute cleanup

    // Start automatic cleanup
    this.startCleanupTimer();
  }

  set(message: string, decision: RoutingDecision): void {
    const key = this.normalizeKey(message);
    const now = Date.now();

    // Check if we need to evict entries due to size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldestEntry();
    }

    const entry: CacheEntry = {
      decision,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);

    console.log("📦 CACHE: Stored routing decision", {
      key: key.substring(0, 30) + "...",
      intent: decision.intent,
      cacheSize: this.cache.size,
    });
  }

  get(message: string): RoutingDecision | null {
    const key = this.normalizeKey(message);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log("⏰ CACHE: Entry expired and removed", {
        key: key.substring(0, 30) + "...",
        age: now - entry.timestamp + "ms",
      });
      return null;
    }

    // Update access statistics
    entry.lastAccessed = now;
    entry.accessCount++;
    this.stats.hits++;

    console.log("✅ CACHE: Hit for routing decision", {
      key: key.substring(0, 30) + "...",
      intent: entry.decision.intent,
      accessCount: entry.accessCount,
    });

    return entry.decision;
  }

  private normalizeKey(message: string): string {
    return message
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .substring(0, 200); // Limit key length
  }

  private evictOldestEntry(): void {
    if (this.cache.size === 0) return;

    let oldestKey = "";
    let oldestTime = Number.MAX_SAFE_INTEGER;

    // Find the least recently accessed entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      console.log("🗑️ CACHE: Evicted oldest entry", {
        key: oldestKey.substring(0, 30) + "...",
        age: Date.now() - oldestTime + "ms",
      });
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cleanupIntervalMs);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanupCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      console.log("🧹 CACHE: Cleanup completed", {
        entriesRemoved: cleanupCount,
        remainingSize: this.cache.size,
      });
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      size: this.cache.size,
      evictions: this.stats.evictions,
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
    console.log("🗑️ CACHE: Cache cleared");
  }

  // Get cache contents for debugging
  getDebugInfo(): Array<{
    key: string;
    intent: string;
    confidence: number;
    handler: string;
    age: number;
    accessCount: number;
  }> {
    const now = Date.now();
    const entries = [];

    for (const [key, entry] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 50),
        intent: entry.decision.intent,
        confidence: entry.decision.confidence,
        handler: entry.decision.handler,
        age: now - entry.timestamp,
        accessCount: entry.accessCount,
      });
    }

    return entries.sort((a, b) => b.accessCount - a.accessCount);
  }

  // Preload common patterns
  preload(
    commonPatterns: Array<{ message: string; decision: RoutingDecision }>,
  ): void {
    console.log("📥 CACHE: Preloading common patterns", {
      count: commonPatterns.length,
    });

    commonPatterns.forEach((pattern) => {
      this.set(pattern.message, pattern.decision);
    });
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }
}

// Common routing patterns for preloading
export const COMMON_ROUTING_PATTERNS = [
  {
    message: "create a task",
    decision: {
      intent: "CREATE_TASK",
      confidence: 0.95,
      handler: "PlanningHandler",
      action: "planning",
      entities: {},
      reasoning: "Common task creation request",
      shouldRoute: true,
      processingTime: 0,
    },
  },
  {
    message: "play music",
    decision: {
      intent: "PLAY_MUSIC",
      confidence: 0.92,
      handler: "MusicHandler",
      action: "music",
      entities: {},
      reasoning: "Common music playback request",
      shouldRoute: true,
      processingTime: 0,
    },
  },
  {
    message: "start timer",
    decision: {
      intent: "START_TIMER",
      confidence: 0.9,
      handler: "PomodoroHandler",
      action: "pomodoro",
      entities: { duration: "25", unit: "minutes" },
      reasoning: "Common timer start request",
      shouldRoute: true,
      processingTime: 0,
    },
  },
  {
    message: "how are you",
    decision: {
      intent: "GENERAL_CHAT",
      confidence: 0.85,
      handler: "ChatHandler",
      action: "chat",
      entities: {},
      reasoning: "Common greeting",
      shouldRoute: false,
      processingTime: 0,
    },
  },
  {
    message: "list my tasks",
    decision: {
      intent: "LIST_TASKS",
      confidence: 0.94,
      handler: "PlanningHandler",
      action: "planning",
      entities: {},
      reasoning: "Task list request",
      shouldRoute: true,
      processingTime: 0,
    },
  },
] as const;
