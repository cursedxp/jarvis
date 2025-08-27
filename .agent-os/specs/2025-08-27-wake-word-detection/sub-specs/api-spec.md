# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-27-wake-word-detection/spec.md

## Endpoints

### GET /api/user/preferences

**Purpose:** Retrieve user preferences including wake word detection setting
**Parameters:** None (uses session/auth context)
**Response:** 
```json
{
  "preferences": {
    "wakeWordEnabled": boolean,
    "theme": string,
    "otherSettings": object
  }
}
```
**Errors:** 401 Unauthorized, 500 Internal Server Error

### PUT /api/user/preferences

**Purpose:** Update user preferences including wake word detection toggle
**Parameters:** 
```json
{
  "preferences": {
    "wakeWordEnabled": boolean
  }
}
```
**Response:** 
```json
{
  "success": true,
  "preferences": {
    "wakeWordEnabled": boolean
  }
}
```
**Errors:** 400 Bad Request, 401 Unauthorized, 500 Internal Server Error

### POST /api/wake-word/initialize

**Purpose:** Initialize wake word detection with access key (if using cloud service)
**Parameters:** 
```json
{
  "enabled": boolean
}
```
**Response:** 
```json
{
  "success": true,
  "accessKey": string (optional, for Picovoice cloud),
  "config": {
    "sensitivity": number,
    "keyword": string
  }
}
```
**Errors:** 403 Forbidden (invalid license), 500 Internal Server Error

## WebSocket Events

### Client to Server Events

#### wake-word-detected
**Purpose:** Notify server when wake word is detected
**Payload:**
```json
{
  "timestamp": number,
  "confidence": number
}
```

#### wake-word-status-change
**Purpose:** Update wake word detection status
**Payload:**
```json
{
  "enabled": boolean,
  "reason": string (optional)
}
```

### Server to Client Events

#### wake-word-config-update
**Purpose:** Push wake word configuration updates to client
**Payload:**
```json
{
  "enabled": boolean,
  "config": {
    "sensitivity": number,
    "keyword": string
  }
}
```

#### wake-word-error
**Purpose:** Notify client of wake word detection errors
**Payload:**
```json
{
  "error": string,
  "code": string,
  "recoverable": boolean
}
```

## Controller Actions

### PreferencesController

**updateWakeWordSetting(enabled: boolean)**
- Validates boolean input
- Updates user preferences in database
- Broadcasts change via WebSocket to all user sessions
- Returns updated preferences

**getPreferences()**
- Retrieves current user preferences from database
- Includes wake word enabled status
- Caches response for performance

### WakeWordController

**initializeDetection()**
- Checks user license/quota for wake word feature
- Generates access credentials if using cloud service
- Returns initialization configuration
- Handles free tier limitations

**handleDetectionEvent(event: WakeWordEvent)**
- Logs wake word detection events
- Updates usage statistics
- Triggers voice recognition flow
- Manages detection cooldown period