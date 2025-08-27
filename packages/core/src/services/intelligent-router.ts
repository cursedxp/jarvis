import { Orchestrator } from "../orchestrator/orchestrator";
import { RoutingCache } from "./routing-cache";

export interface RoutingDecision {
  intent: string;
  confidence: number;
  handler: string;
  action: string;
  entities: Record<string, any>;
  reasoning: string;
  shouldRoute: boolean;
  processingTime: number;
}

export interface IntentAnalysisResult {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
  handler: string;
  action: string;
  reasoning: string;
}

export interface RoutingContext {
  conversationHistory?: Array<{ role: string; content: string }>;
  currentHandler?: string;
  activeFeatures?: string[];
  userPreferences?: Record<string, any>;
}

export class IntelligentRouter {
  private orchestrator: Orchestrator;
  private cache: RoutingCache;
  private conversationContext: Map<string, RoutingContext>;
  private sessionTimeout: number = 15 * 60 * 1000; // 15 minutes
  private readonly ROUTING_SYSTEM_PROMPT = `
You are an intelligent routing system for Jarvis, a voice-first AI assistant. Your job is to analyze user messages and determine the best handler and action to take.

Available handlers and their capabilities:
- PlanningHandler: Task management, project planning, todo lists, deadlines
- MusicHandler: Music playbook, Spotify integration, playlists, audio control  
- PomodoroHandler: Focus timers, productivity sessions, break management
- ChatHandler: General conversation, questions, explanations, casual chat

Analyze the user's message and return a JSON response with this exact structure:
{
  "intent": "CREATE_TASK|DELETE_TASK|LIST_TASKS|PLAY_MUSIC|PAUSE_MUSIC|START_TIMER|STOP_TIMER|GENERAL_CHAT",
  "confidence": 0.95,
  "entities": {"key": "value"},
  "handler": "PlanningHandler|MusicHandler|PomodoroHandler|ChatHandler",
  "action": "planning|music|pomodoro|chat", 
  "reasoning": "Brief explanation of why this routing decision was made"
}

Entity extraction guidelines:
- For tasks: extract "taskName", "dueDate", "priority", "category", "description"
- For music: extract "artist", "song", "album", "genre", "playlist"
- For timers: extract "duration", "unit", "type" (focus/break), "label"
- For general: extract "topic", "mood", "urgency"

Rules:
1. Only use the exact intent values listed above
2. Confidence must be between 0 and 1
3. Extract ALL relevant entities from the message
4. Default to ChatHandler for unclear requests
5. Consider context from conversation history if provided
6. Be decisive - avoid low confidence scores for clear requests

Examples:
- "create a task called 'finish report' for tomorrow" → {"taskName": "finish report", "dueDate": "tomorrow"}
- "play some jazz music by Miles Davis" → {"genre": "jazz", "artist": "Miles Davis"}
- "start a 25 minute focus timer" → {"duration": "25", "unit": "minutes", "type": "focus"}
- "how are you feeling today?" → {"topic": "wellbeing", "mood": "casual"}
`;

  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.cache = new RoutingCache({
      maxSize: 1000,
      ttlMs: 5 * 60 * 1000, // 5 minutes cache
    });
    this.conversationContext = new Map();

    // Preload common routing patterns for immediate responses
    this.preloadCommonPatterns();

    // Clean up expired conversation contexts periodically
    setInterval(() => this.cleanupExpiredContexts(), 5 * 60 * 1000); // Every 5 minutes
  }

  async analyzeIntent(
    message: string,
    context?: RoutingContext,
  ): Promise<IntentAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = this.cache.get(message);
      if (cached) {
        const cacheProcessingTime = Date.now() - startTime;
        console.log(
          "🚀 ROUTING: Cache hit for message:",
          message.substring(0, 30),
        );
        this.logPerformanceMetrics(message, cacheProcessingTime, true);
        return {
          intent: cached.intent,
          confidence: cached.confidence,
          entities: cached.entities,
          handler: cached.handler,
          action: cached.action,
          reasoning: cached.reasoning,
        };
      }

      // Build analysis prompt
      const analysisPrompt = this.buildAnalysisPrompt(message, context);

      // Get LLM analysis with timeout for performance
      const llmResponse = await Promise.race([
        this.orchestrator.getAdapter().complete(analysisPrompt, {
          temperature: 0.1, // Low temperature for consistent routing
          maxTokens: 300,
        }),
        new Promise<string>(
          (_, reject) =>
            setTimeout(() => reject(new Error("Routing timeout")), 250), // 250ms timeout
        ),
      ]);

      // Parse and validate response
      const analysis = await this.parseAndValidateLLMResponse(llmResponse);
      const processingTime = Date.now() - startTime;

      // Cache the result
      const routingDecision: RoutingDecision = {
        ...analysis,
        shouldRoute: analysis.handler !== "ChatHandler",
        processingTime,
      };

      this.cache.set(message, routingDecision);

      console.log("🧠 ROUTING: Intent analyzed", {
        message: message.substring(0, 50) + "...",
        intent: analysis.intent,
        confidence: analysis.confidence,
        handler: analysis.handler,
        processingTime: processingTime + "ms",
      });

      // Log performance metrics if needed
      this.logPerformanceMetrics(message, processingTime, false);

      return analysis;
    } catch (error) {
      console.error("🚨 ROUTING: Intent analysis failed:", error);
      return this.getFallbackAnalysis(message, Date.now() - startTime);
    }
  }

  async route(
    message: string,
    context?: RoutingContext,
  ): Promise<RoutingDecision> {
    const analysis = await this.analyzeIntent(message, context);

    return {
      intent: analysis.intent,
      confidence: analysis.confidence,
      handler: analysis.handler,
      action: analysis.action,
      entities: analysis.entities,
      reasoning: analysis.reasoning,
      shouldRoute: analysis.handler !== "ChatHandler",
      processingTime: 0, // Will be set by analyzeIntent
    };
  }

  private buildAnalysisPrompt(
    message: string,
    context?: RoutingContext,
  ): string {
    let prompt = this.ROUTING_SYSTEM_PROMPT;

    // Add conversation history if available
    if (
      context?.conversationHistory &&
      context.conversationHistory.length > 0
    ) {
      prompt += `\n\nConversation history (last 3 messages):\n`;
      const recentHistory = context.conversationHistory.slice(-3);
      recentHistory.forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
    }

    // Add current handler context
    if (context?.currentHandler) {
      prompt += `\nCurrent handler: ${context.currentHandler}\n`;
    }

    // Add active features context
    if (context?.activeFeatures && context.activeFeatures.length > 0) {
      prompt += `\nActive features: ${context.activeFeatures.join(", ")}\n`;
    }

    prompt += `\nUser message to analyze: "${message}"\n\nProvide your routing analysis as JSON:`;

    return prompt;
  }

  private async parseAndValidateLLMResponse(
    response: string,
  ): Promise<IntentAnalysisResult> {
    try {
      // Clean up response (remove markdown code blocks, extra text)
      const cleanResponse = response
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^[^{]*/, "") // Remove text before first {
        .replace(/[^}]*$/, ""); // Remove text after last }

      const parsed = JSON.parse(cleanResponse);

      // Validate required fields
      const validIntents = [
        "CREATE_TASK",
        "DELETE_TASK",
        "LIST_TASKS",
        "UPDATE_TASK",
        "COMPLETE_TASK",
        "PLAY_MUSIC",
        "PAUSE_MUSIC",
        "STOP_MUSIC",
        "SKIP_MUSIC",
        "PREVIOUS_MUSIC",
        "START_TIMER",
        "STOP_TIMER",
        "PAUSE_TIMER",
        "RESET_TIMER",
        "GENERAL_CHAT",
        "EXPLAIN",
        "HELP",
      ];

      const validHandlers = [
        "PlanningHandler",
        "MusicHandler",
        "PomodoroHandler",
        "ChatHandler",
      ];
      const validActions = ["planning", "music", "pomodoro", "chat"];

      // Validate and correct if needed
      if (!validIntents.includes(parsed.intent)) {
        parsed.intent = "GENERAL_CHAT";
        parsed.handler = "ChatHandler";
        parsed.action = "chat";
        parsed.confidence = Math.min(parsed.confidence || 0.5, 0.6);
      }

      if (!validHandlers.includes(parsed.handler)) {
        parsed.handler = "ChatHandler";
        parsed.action = "chat";
      }

      if (!validActions.includes(parsed.action)) {
        parsed.action = "chat";
      }

      // Ensure confidence is valid
      parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

      // Ensure entities object exists
      parsed.entities = parsed.entities || {};

      // Ensure reasoning exists
      parsed.reasoning = parsed.reasoning || "Automated routing decision";

      return {
        intent: parsed.intent,
        confidence: parsed.confidence,
        entities: parsed.entities,
        handler: parsed.handler,
        action: parsed.action,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error("🚨 ROUTING: Failed to parse LLM response:", error);
      throw new Error("Invalid LLM response format");
    }
  }

  private getFallbackAnalysis(
    message: string,
    _processingTime: number,
  ): IntentAnalysisResult {
    // Simple keyword-based fallback
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("task") ||
      lowerMessage.includes("todo") ||
      lowerMessage.includes("remind")
    ) {
      return {
        intent: "CREATE_TASK",
        confidence: 0.6,
        entities: {},
        handler: "PlanningHandler",
        action: "planning",
        reasoning: "Fallback keyword detection for task-related request",
      };
    }

    if (
      lowerMessage.includes("music") ||
      lowerMessage.includes("play") ||
      lowerMessage.includes("song")
    ) {
      return {
        intent: "PLAY_MUSIC",
        confidence: 0.6,
        entities: {},
        handler: "MusicHandler",
        action: "music",
        reasoning: "Fallback keyword detection for music request",
      };
    }

    if (
      lowerMessage.includes("timer") ||
      lowerMessage.includes("pomodoro") ||
      lowerMessage.includes("focus")
    ) {
      return {
        intent: "START_TIMER",
        confidence: 0.6,
        entities: {},
        handler: "PomodoroHandler",
        action: "pomodoro",
        reasoning: "Fallback keyword detection for timer request",
      };
    }

    // Default to general chat
    return {
      intent: "GENERAL_CHAT",
      confidence: 0.2,
      entities: {},
      handler: "ChatHandler",
      action: "chat",
      reasoning: "Fallback to general chat due to analysis failure",
    };
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  clearCache() {
    this.cache.clear();
  }

  private preloadCommonPatterns(): void {
    // Import common patterns
    const { COMMON_ROUTING_PATTERNS } = require("./routing-cache");
    this.cache.preload(COMMON_ROUTING_PATTERNS);

    console.log("🚀 ROUTING: Preloaded common patterns for instant responses");
  }

  // Get routing performance metrics
  getPerformanceMetrics() {
    const stats = this.cache.getStats();
    return {
      cacheHitRate: stats.hitRate,
      totalRequests: stats.hits + stats.misses,
      averageResponseTime: 0, // TODO: Track this
      cacheSize: stats.size,
    };
  }

  // Performance monitoring
  private logPerformanceMetrics(
    message: string,
    processingTime: number,
    cacheHit: boolean,
  ): void {
    if (processingTime > 300) {
      console.warn("⚠️ ROUTING: Slow routing detected", {
        message: message.substring(0, 50),
        processingTime: processingTime + "ms",
        cacheHit,
        threshold: "300ms",
      });
    }
  }

  // Context management methods
  updateConversationContext(
    sessionId: string,
    context: Partial<RoutingContext>,
  ): void {
    const existing = this.conversationContext.get(sessionId) || {};
    const updated = {
      ...existing,
      ...context,
      lastUpdated: Date.now(),
    } as RoutingContext & { lastUpdated: number };

    this.conversationContext.set(sessionId, updated);

    console.log("📝 ROUTING: Updated conversation context", {
      sessionId: sessionId.substring(0, 8) + "...",
      contextKeys: Object.keys(context),
      totalContexts: this.conversationContext.size,
    });
  }

  getConversationContext(sessionId: string): RoutingContext | undefined {
    const context = this.conversationContext.get(sessionId);
    if (
      context &&
      Date.now() - (context as any).lastUpdated > this.sessionTimeout
    ) {
      this.conversationContext.delete(sessionId);
      return undefined;
    }
    return context;
  }

  private cleanupExpiredContexts(): void {
    const now = Date.now();
    let cleanupCount = 0;

    for (const [sessionId, context] of this.conversationContext.entries()) {
      const lastUpdated = (context as any).lastUpdated || 0;
      if (now - lastUpdated > this.sessionTimeout) {
        this.conversationContext.delete(sessionId);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      console.log("🧹 ROUTING: Cleaned up expired conversation contexts", {
        removed: cleanupCount,
        remaining: this.conversationContext.size,
      });
    }
  }

  // Enhanced routing with session context
  async routeWithSession(
    message: string,
    sessionId: string,
    additionalContext?: Partial<RoutingContext>,
  ): Promise<RoutingDecision> {
    // Get existing session context
    let sessionContext = this.getConversationContext(sessionId) || {};

    // Merge with additional context
    if (additionalContext) {
      sessionContext = { ...sessionContext, ...additionalContext };
    }

    // Perform routing with context
    const decision = await this.route(message, sessionContext);

    // Update session context based on routing decision
    this.updateConversationContext(sessionId, {
      currentHandler: decision.handler,
      conversationHistory: [
        ...(sessionContext.conversationHistory || []).slice(-5), // Keep last 5 messages
        { role: "user", content: message },
      ],
    });

    return decision;
  }
}

export const createIntelligentRouter = (
  orchestrator: Orchestrator,
): IntelligentRouter => {
  return new IntelligentRouter(orchestrator);
};
