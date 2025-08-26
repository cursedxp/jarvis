interface IntentAnalysis {
  intent: 'ADD_TASK' | 'DELETE_TASK' | 'DELETE_ALL_TASKS' | 'MOVE_TASK' | 'GENERATE_TASKS' | 'POMODORO' | 'POMODORO_DURATION' | 'MUSIC_PLAY' | 'MUSIC_PAUSE' | 'MUSIC_NEXT' | 'MUSIC_PREVIOUS' | 'MUSIC_VOLUME' | 'MUSIC_SEARCH' | 'MUSIC_STATUS' | 'UNKNOWN'
  confidence: number
  entities: {
    taskName?: string
    targetStatus?: 'todo' | 'in-progress' | 'done'
    action?: string
    count?: number
    taskType?: string
    timeframe?: string
    pomodoroAction?: 'start' | 'stop' | 'pause' | 'reset' | 'continue'
    pomodoroDuration?: number
    songName?: string
    artistName?: string
    volumeLevel?: number
    searchQuery?: string
  }
  reasoning: string
}

export class IntentAnalyzer {
  
  async analyzeIntent(message: string, existingTasks: any[]): Promise<IntentAnalysis> {
    const lowerMessage = message.toLowerCase().trim()
    
    // AI-powered intent analysis based on semantic understanding
    console.log('🤖 INTENT ANALYZER: Analyzing message with AI-powered semantics:', lowerMessage)
    
    return this.analyzeIntentWithAI(lowerMessage, existingTasks)
  }
  
  private analyzeIntentWithAI(message: string, existingTasks: any[]): IntentAnalysis {
    // Semantic keyword detection for intent classification
    const semanticContext = {
      hasGenerationKeywords: this.hasSemanticMatch(message, ['create', 'generate', 'make', 'give', 'need', 'want', 'suggest', 'recommend']),
      hasTaskKeywords: this.hasSemanticMatch(message, ['tasks', 'task', 'things', 'thing', 'items', 'item', 'activities', 'activity', 'stuff', 'todo', 'to do']),
      hasModificationKeywords: this.hasSemanticMatch(message, ['move', 'set', 'mark', 'change', 'update', 'switch']),
      hasDeleteKeywords: this.hasSemanticMatch(message, ['delete', 'remove', 'clear', 'eliminate', 'cancel', 'drop']),
      hasCompletionKeywords: this.hasSemanticMatch(message, ['done', 'complete', 'finished', 'ready']),
      hasProgressKeywords: this.hasSemanticMatch(message, ['progress', 'working', 'started', 'doing', 'active']),
      hasGlobalKeywords: this.hasSemanticMatch(message, ['all', 'everything', 'clear all', 'delete all', 'reset']),
      hasPomodoroKeywords: this.hasSemanticMatch(message, ['pomodoro', 'timer', 'focus', 'work session', 'break']),
      hasPomodoroStartKeywords: this.hasSemanticMatch(message, ['start', 'begin', 'launch', 'activate', 'run']),
      hasPomodoroStopKeywords: this.hasSemanticMatch(message, ['stop', 'pause', 'end', 'halt', 'cancel']),
      hasPomodoroResetKeywords: this.hasSemanticMatch(message, ['reset', 'restart', 'clear']),
      hasPomodoroontinueKeywords: this.hasSemanticMatch(message, ['continue', 'next', 'another', 'more']),
      hasMusicKeywords: this.hasSemanticMatch(message, ['music', 'song', 'track', 'spotify', 'play', 'audio', 'sound']),
      hasMusicPlayKeywords: this.hasSemanticMatch(message, ['play', 'start', 'begin', 'resume']),
      hasMusicPauseKeywords: this.hasSemanticMatch(message, ['pause', 'stop', 'halt']),
      hasMusicNextKeywords: this.hasSemanticMatch(message, ['next', 'skip', 'forward']),
      hasMusicPreviousKeywords: this.hasSemanticMatch(message, ['previous', 'back', 'last', 'before']),
      hasMusicVolumeKeywords: this.hasSemanticMatch(message, ['volume', 'loud', 'quiet', 'louder', 'softer', 'up', 'down']),
      hasMusicSearchKeywords: this.hasSemanticMatch(message, ['search', 'find', 'look for']),
      hasMusicStatusKeywords: this.hasSemanticMatch(message, ['what', 'playing', 'current', 'now', 'status'])
    }
    
    // AI-powered intent classification with confidence scoring
    return this.classifyIntentWithAI(message, semanticContext, existingTasks)
  }
  
  private classifyIntentWithAI(message: string, context: any, existingTasks: any[]): IntentAnalysis {
    // POMODORO DURATION - Check for simple number responses (highest priority when expecting duration)
    if (this.isPomodoroTimeResponse(message)) {
      const duration = this.extractDurationFromMessage(message)
      return {
        intent: 'POMODORO_DURATION',
        confidence: 0.95,
        entities: { pomodoroDuration: duration },
        reasoning: `AI detected Pomodoro duration response: ${duration} minutes`
      }
    }

    // MUSIC COMMANDS - High priority for music control
    if (context.hasMusicKeywords || context.hasMusicPlayKeywords || context.hasMusicPauseKeywords || context.hasMusicNextKeywords || context.hasMusicPreviousKeywords) {
      const musicIntent = this.extractMusicIntent(message, context)
      if (musicIntent.intent !== 'UNKNOWN') {
        return musicIntent
      }
    }

    // POMODORO - High priority for timer commands
    if (context.hasPomodoroKeywords) {
      const pomodoroAction = this.extractPomodoroAction(message, context)
      return {
        intent: 'POMODORO',
        confidence: 0.95,
        entities: { pomodoroAction },
        reasoning: `AI detected Pomodoro ${pomodoroAction} command`
      }
    }

    // GENERATE TASKS - High priority for creation requests
    if (context.hasGenerationKeywords && context.hasTaskKeywords) {
      const entities = this.extractGenerationEntities(message)
      if (entities.count > 0) {
        return {
          intent: 'GENERATE_TASKS',
          confidence: 0.95,
          entities,
          reasoning: `AI detected task generation: ${entities.count} ${entities.taskType} ${entities.timeframe}`
        }
      }
    }
    
    // DELETE ALL - Check for global destructive actions
    if (context.hasDeleteKeywords && context.hasGlobalKeywords) {
      return {
        intent: 'DELETE_ALL_TASKS',
        confidence: 0.95,
        entities: {},
        reasoning: 'AI detected global delete intent'
      }
    }
    
    // MOVE TASK - Status modification requests
    if ((context.hasModificationKeywords || context.hasCompletionKeywords || context.hasProgressKeywords) && existingTasks.length > 0) {
      const entities = this.extractMoveEntities(message, existingTasks)
      if (entities.taskName) {
        return {
          intent: 'MOVE_TASK',
          confidence: entities.matchingTask ? 0.95 : 0.75,
          entities: { taskName: entities.taskName, targetStatus: entities.targetStatus },
          reasoning: `AI detected task movement: "${entities.taskName}" → ${entities.targetStatus}${entities.matchingTask ? ' (found match)' : ''}`
        }
      }
    }
    
    // DELETE SPECIFIC - Single task deletion
    if (context.hasDeleteKeywords && context.hasTaskKeywords && existingTasks.length > 0) {
      const entities = this.extractDeleteEntities(message, existingTasks)
      if (entities.taskName && entities.taskName !== 'all' && entities.taskName !== 'everything') {
        return {
          intent: 'DELETE_TASK',
          confidence: entities.matchingTask ? 0.95 : 0.75,
          entities: { taskName: entities.taskName },
          reasoning: `AI detected task deletion: "${entities.taskName}"${entities.matchingTask ? ' (found match)' : ''}`
        }
      }
    }
    
    // ADD TASK - Single task creation
    if (context.hasGenerationKeywords && this.isValidTaskCreation(message)) {
      const taskName = this.extractTaskName(message)
      if (taskName) {
        return {
          intent: 'ADD_TASK',
          confidence: 0.85,
          entities: { taskName },
          reasoning: `AI detected single task creation: "${taskName}"`
        }
      }
    }
    
    return {
      intent: 'UNKNOWN',
      confidence: 0.0,
      entities: {},
      reasoning: 'AI could not classify intent from semantic analysis'
    }
  }
  
  // AI-POWERED SEMANTIC UNDERSTANDING METHODS
  
  private hasSemanticMatch(message: string, keywords: string[]): boolean {
    const lowerMessage = message.toLowerCase()
    return keywords.some(keyword => {
      // Direct keyword match (handles both single words and phrases)
      if (lowerMessage.includes(keyword)) return true
      
      // Check keyword variations for natural language understanding
      const variations = this.getKeywordVariations(keyword)
      return variations.some(variation => lowerMessage.includes(variation))
    })
  }
  
  private getKeywordVariations(keyword: string): string[] {
    const variationMap: { [key: string]: string[] } = {
      'create': ['build', 'generate', 'add', 'new'],
      'make': ['build', 'create', 'generate'],
      'give': ['provide', 'show', 'get'],
      'need': ['want', 'require', 'looking for'],
      'tasks': ['task', 'things', 'thing', 'items', 'item', 'stuff', 'activities', 'activity', 'to do', 'todo', 'things to do'],
      'things': ['thing', 'tasks', 'task', 'items', 'item', 'stuff', 'activities', 'activity', 'to do', 'things to do'],
      'move': ['set', 'change', 'update', 'shift', 'transfer'],
      'set': ['move', 'change', 'update', 'mark'],
      'delete': ['remove', 'eliminate', 'get rid of', 'cancel', 'drop'],
      'done': ['complete', 'finished', 'completed', 'ready'],
      'progress': ['working on', 'in progress', 'active', 'started'],
      'all': ['everything', 'every', 'entire']
    }
    return variationMap[keyword] || []
  }
  
  private extractGenerationEntities(message: string) {
    return {
      count: this.extractCountSemantically(message),
      taskType: this.extractTaskTypeSemantically(message),
      timeframe: this.extractTimeframeSemantically(message)
    }
  }
  
  private extractCountSemantically(message: string): number {
    // Handle direct numbers: "5 tasks", "create 3 items"
    const directNumber = /\b(\d+)\b/.exec(message)
    if (directNumber) return Math.min(parseInt(directNumber[1]), 10)
    
    // Word-based numbers with semantic understanding
    const wordNumbers: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15
    }
    
    for (const [word, count] of Object.entries(wordNumbers)) {
      if (message.includes(word)) return count
    }
    
    // Quantity expressions with natural language understanding
    if (/\b(a\s+few|few)\b/.test(message)) return 3
    if (/\b(some|several)\b/.test(message)) return 5
    if (/\b(many|lots?|bunch|load)\b/.test(message)) return 8
    if (/\b(tons?|heaps?|loads)\b/.test(message)) return 10
    
    return 0
  }
  
  private extractTaskTypeSemantically(message: string): string {
    // AI-powered task type detection with context understanding
    if (this.hasSemanticMatch(message, ['work', 'productive', 'business', 'office', 'professional'])) return 'work'
    if (this.hasSemanticMatch(message, ['personal', 'home', 'private', 'life'])) return 'personal'
    if (this.hasSemanticMatch(message, ['creative', 'art', 'design', 'artistic'])) return 'creative'
    if (this.hasSemanticMatch(message, ['health', 'fitness', 'exercise', 'wellness'])) return 'health'
    if (this.hasSemanticMatch(message, ['random', 'general', 'any', 'misc'])) return 'general'
    
    return 'general' // default
  }
  
  private extractTimeframeSemantically(message: string): string {
    if (this.hasSemanticMatch(message, ['today', 'now', 'immediately'])) return 'today'
    if (this.hasSemanticMatch(message, ['tomorrow', 'next day'])) return 'tomorrow'
    if (this.hasSemanticMatch(message, ['week', 'weekly', 'this week'])) return 'week'
    
    return 'today' // default
  }
  
  private extractMoveEntities(message: string, existingTasks: any[]) {
    const taskName = this.findTaskNameInMessage(message, existingTasks)
    const targetStatus = this.extractStatusSemantically(message)
    const matchingTask = taskName ? this.findMatchingTask(taskName, existingTasks) : null
    
    return { taskName, targetStatus, matchingTask }
  }
  
  private extractStatusSemantically(message: string): 'todo' | 'in-progress' | 'done' {
    if (this.hasSemanticMatch(message, ['done', 'complete', 'finished', 'completed', 'ready'])) return 'done'
    if (this.hasSemanticMatch(message, ['progress', 'working', 'started', 'doing', 'active'])) return 'in-progress'
    
    return 'todo' // default
  }
  
  private extractDeleteEntities(message: string, existingTasks: any[]) {
    const taskName = this.findTaskNameInMessage(message, existingTasks)
    const matchingTask = taskName ? this.findMatchingTask(taskName, existingTasks) : null
    
    return { taskName, matchingTask }
  }
  
  private findTaskNameInMessage(message: string, existingTasks: any[]): string | null {
    // AI-powered task name extraction - find the most likely task reference
    const words = message.split(' ')
    
    // Try to find existing task matches first (highest confidence)
    for (const task of existingTasks) {
      const taskWords = task.title.toLowerCase().split(' ')
      
      // Check if message contains significant words from task title
      const matchingWords = taskWords.filter((word: string) => 
        word.length > 2 && message.toLowerCase().includes(word)
      )
      
      if (matchingWords.length >= 2 || (taskWords.length <= 3 && matchingWords.length >= 1)) {
        return task.title
      }
    }
    
    // If no existing task match, extract task name from message structure
    // Remove command words and extract the potential task name
    const commandWords = ['move', 'set', 'mark', 'delete', 'remove', 'create', 'add', 'to', 'as', 'is', 'the']
    const taskWords = words.filter(word => 
      !commandWords.includes(word.toLowerCase()) && 
      !['todo', 'done', 'progress', 'in-progress', 'complete', 'finished'].includes(word.toLowerCase())
    )
    
    return taskWords.length > 0 ? taskWords.join(' ') : null
  }
  
  private isValidTaskCreation(message: string): boolean {
    // AI-powered validation for single task creation
    const count = this.extractCountSemantically(message)
    
    // If explicit count > 1, this should be GENERATE_TASKS, not ADD_TASK
    if (count > 1) return false
    
    // Check if message structure suggests single task creation
    const singleTaskIndicators = ['add', 'create', 'new task', 'make a task']
    return singleTaskIndicators.some(indicator => message.includes(indicator)) || count === 0
  }
  
  private extractTaskName(message: string): string | null {
    // AI-powered task name extraction for ADD_TASK
    const words = message.split(' ')
    const commandWords = ['add', 'create', 'make', 'new', 'task', 'item', 'thing']
    
    const taskWords = words.filter(word => !commandWords.includes(word.toLowerCase()))
    return taskWords.length > 0 ? taskWords.join(' ') : null
  }

  private extractPomodoroAction(_message: string, context: any): 'start' | 'stop' | 'pause' | 'reset' | 'continue' {
    // AI-powered Pomodoro action extraction
    if (context.hasPomodoroontinueKeywords) return 'continue'
    if (context.hasPomodoroStartKeywords) return 'start'
    if (context.hasPomodoroStopKeywords) return 'stop'
    if (context.hasPomodoroResetKeywords) return 'reset'
    
    // Default action if only pomodoro keywords are mentioned
    return 'start'
  }

  private isPomodoroTimeResponse(message: string): boolean {
    const trimmed = message.trim().toLowerCase()
    
    // Check if it's a simple number (like "25", "30", etc.)
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed)
      return num >= 1 && num <= 120 // reasonable pomodoro duration range
    }
    
    // Check for time expressions
    if (/^\d+\s*(min|minutes?|hour|hours?|hrs?)$/i.test(trimmed)) {
      return true
    }
    
    return false
  }

  private extractDurationFromMessage(message: string): number {
    const trimmed = message.trim().toLowerCase()
    const numberMatch = trimmed.match(/(\d+)/)
    
    if (numberMatch) {
      const number = parseInt(numberMatch[1])
      
      // If hours mentioned, convert to minutes
      if (trimmed.includes('hour') || trimmed.includes('hr')) {
        return number * 60
      }
      
      // Default to minutes
      return number
    }
    
    return 25 // default fallback
  }

  private extractMusicIntent(message: string, context: any): IntentAnalysis {
    // Check for specific music control intents
    
    // MUSIC_STATUS - What's playing, current song, etc.
    if (context.hasMusicStatusKeywords || 
        (context.hasMusicKeywords && this.hasSemanticMatch(message, ['what', 'current', 'now', 'playing']))) {
      return {
        intent: 'MUSIC_STATUS',
        confidence: 0.95,
        entities: {},
        reasoning: 'AI detected music status request'
      }
    }

    // MUSIC_VOLUME - Volume control
    if (context.hasMusicVolumeKeywords) {
      const volumeLevel = this.extractVolumeLevel(message)
      return {
        intent: 'MUSIC_VOLUME',
        confidence: 0.95,
        entities: { volumeLevel },
        reasoning: `AI detected volume control: ${volumeLevel}%`
      }
    }

    // MUSIC_SEARCH - Search for specific music
    if ((context.hasMusicSearchKeywords && context.hasMusicKeywords) || 
        this.hasSemanticMatch(message, ['play']) && (this.hasSemanticMatch(message, ['song', 'artist', 'by']))) {
      const searchEntities = this.extractMusicSearchEntities(message)
      return {
        intent: 'MUSIC_SEARCH',
        confidence: 0.9,
        entities: searchEntities,
        reasoning: `AI detected music search: ${searchEntities.searchQuery || searchEntities.songName || searchEntities.artistName}`
      }
    }

    // MUSIC_NEXT - Skip to next track
    if (context.hasMusicNextKeywords && (context.hasMusicKeywords || this.hasSemanticMatch(message, ['song', 'track']))) {
      return {
        intent: 'MUSIC_NEXT',
        confidence: 0.95,
        entities: {},
        reasoning: 'AI detected next track command'
      }
    }

    // MUSIC_PREVIOUS - Go to previous track
    if (context.hasMusicPreviousKeywords && (context.hasMusicKeywords || this.hasSemanticMatch(message, ['song', 'track']))) {
      return {
        intent: 'MUSIC_PREVIOUS',
        confidence: 0.95,
        entities: {},
        reasoning: 'AI detected previous track command'
      }
    }

    // MUSIC_PAUSE - Pause/stop music
    if (context.hasMusicPauseKeywords && (context.hasMusicKeywords || this.hasSemanticMatch(message, ['music', 'song', 'track', 'spotify']))) {
      return {
        intent: 'MUSIC_PAUSE',
        confidence: 0.95,
        entities: {},
        reasoning: 'AI detected music pause command'
      }
    }

    // MUSIC_PLAY - Play music (general or specific)
    if ((context.hasMusicPlayKeywords && context.hasMusicKeywords) || 
        this.hasSemanticMatch(message, ['play music', 'start music', 'resume music'])) {
      const playEntities = this.extractMusicPlayEntities(message)
      return {
        intent: 'MUSIC_PLAY',
        confidence: 0.9,
        entities: playEntities,
        reasoning: `AI detected music play command${playEntities.songName ? ` for "${playEntities.songName}"` : ''}`
      }
    }

    return {
      intent: 'UNKNOWN',
      confidence: 0.0,
      entities: {},
      reasoning: 'Music keywords detected but could not classify specific intent'
    }
  }

  private extractVolumeLevel(message: string): number {
    // Extract volume level from message
    const volumeMatch = message.match(/(\d+)%?/)
    if (volumeMatch) {
      const volume = parseInt(volumeMatch[1])
      return Math.min(Math.max(volume, 0), 100) // Clamp between 0-100
    }

    // Handle relative volume changes
    if (this.hasSemanticMatch(message, ['up', 'higher', 'louder', 'increase'])) {
      return 75 // Increase to 75% if not specified
    }
    if (this.hasSemanticMatch(message, ['down', 'lower', 'quieter', 'decrease'])) {
      return 25 // Decrease to 25% if not specified
    }

    return 50 // Default middle volume
  }

  private extractMusicSearchEntities(message: string): { songName?: string; artistName?: string; searchQuery?: string } {
    const entities: { songName?: string; artistName?: string; searchQuery?: string } = {}

    // Look for "by [artist]" pattern
    const byArtistMatch = message.match(/\bby\s+(.+?)(?:\s|$)/i)
    if (byArtistMatch) {
      entities.artistName = byArtistMatch[1].trim()
    }

    // Look for quoted song names
    const quotedMatch = message.match(/["']([^"']+)["']/)
    if (quotedMatch) {
      entities.songName = quotedMatch[1].trim()
    }

    // If no specific patterns found, extract the search query
    if (!entities.songName && !entities.artistName) {
      const commandWords = ['play', 'search', 'find', 'look', 'for', 'music', 'song', 'track', 'spotify', 'the']
      const words = message.split(' ')
      const searchWords = words.filter(word => 
        !commandWords.includes(word.toLowerCase()) && word.length > 1
      )
      if (searchWords.length > 0) {
        entities.searchQuery = searchWords.join(' ')
      }
    }

    return entities
  }

  private extractMusicPlayEntities(message: string): { songName?: string; artistName?: string } {
    const entities: { songName?: string; artistName?: string } = {}

    // Look for "play [song name] by [artist]" pattern
    const playByMatch = message.match(/play\s+(.+?)\s+by\s+(.+?)(?:\s|$)/i)
    if (playByMatch) {
      entities.songName = playByMatch[1].trim()
      entities.artistName = playByMatch[2].trim()
      return entities
    }

    // Look for "play [song/artist name]"
    const playMatch = message.match(/play\s+(.+?)(?:\s|$)/i)
    if (playMatch) {
      const name = playMatch[1].trim()
      // Simple heuristic: if it contains common song words, treat as song name
      if (this.hasSemanticMatch(name, ['song', 'track', 'music'])) {
        entities.songName = name
      } else {
        entities.songName = name // Default to song name, the API will handle search
      }
    }

    return entities
  }

  // UTILITY METHODS (keeping existing functionality)
  
  private findMatchingTask(searchName: string, tasks: any[]): any | null {
    if (!searchName || !tasks) return null
    
    const searchLower = searchName.toLowerCase()
    
    return tasks.find(task => {
      const titleLower = task.title.toLowerCase()
      return titleLower.includes(searchLower) || searchLower.includes(titleLower)
    }) || null
  }
}

export const intentAnalyzer = new IntentAnalyzer()