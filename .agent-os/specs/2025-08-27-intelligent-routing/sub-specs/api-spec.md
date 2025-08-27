# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-27-intelligent-routing/spec.md

> Created: 2025-08-27
> Version: 1.0.0

## Endpoints

### POST /api/route/analyze
**Purpose:** Analyze user message and return intelligent routing decision
**Parameters:** 
- `message` (string, required): User's natural language input
- `context` (object, optional): Current conversation context and system state
- `conversationHistory` (array, optional): Recent message history for context
**Response:** 
```json
{
  "intent": "CREATE_TASK|PLAY_MUSIC|START_TIMER|GENERAL_CHAT",
  "confidence": 0.95,
  "handler": "PlanningHandler",
  "action": "planning",
  "entities": { "taskName": "finish project", "dueDate": "tomorrow" },
  "reasoning": "User explicitly requested task creation with specific details"
}
```
**Errors:** 400 (Invalid input), 500 (Analysis failed), 408 (Timeout exceeded)

### GET /api/route/handlers
**Purpose:** Get available handlers and their capabilities for routing decisions
**Parameters:** None
**Response:** 
```json
{
  "handlers": [
    {
      "name": "PlanningHandler",
      "commands": ["planning"],
      "intents": ["CREATE_TASK", "DELETE_TASK", "LIST_TASKS"],
      "description": "Handles task and project management operations"
    }
  ]
}
```
**Errors:** 500 (System error)

### POST /api/route/feedback
**Purpose:** Submit routing feedback to improve accuracy (future enhancement)
**Parameters:** 
- `messageId` (string, required): Original message identifier
- `wasCorrect` (boolean, required): Whether routing decision was correct
- `actualIntent` (string, optional): Correct intent if routing was wrong
**Response:** 
```json
{
  "success": true,
  "message": "Feedback recorded for routing improvement"
}
```
**Errors:** 400 (Invalid feedback), 404 (Message not found)

## Socket.io Events

### routing_decision (Emitted)
**Purpose:** Real-time notification of routing decisions for debugging and UI feedback
**Data:** 
```json
{
  "messageId": "uuid",
  "intent": "CREATE_TASK",
  "handler": "PlanningHandler",
  "confidence": 0.95,
  "processingTime": 150,
  "timestamp": "2025-08-27T10:30:00Z"
}
```

### intent_classified (Emitted)  
**Purpose:** Detailed intent classification results for system monitoring
**Data:**
```json
{
  "message": "add a task for tomorrow",
  "classification": {
    "intent": "CREATE_TASK",
    "confidence": 0.95,
    "entities": { "dueDate": "tomorrow" },
    "alternativeIntents": [
      { "intent": "GENERAL_CHAT", "confidence": 0.05 }
    ]
  }
}
```

### routing_error (Emitted)
**Purpose:** Error notification when routing fails or times out
**Data:**
```json
{
  "messageId": "uuid",
  "error": "TIMEOUT|ANALYSIS_FAILED|INVALID_INPUT",
  "fallbackUsed": "keyword_matching",
  "processingTime": 300,
  "timestamp": "2025-08-27T10:30:00Z"
}
```