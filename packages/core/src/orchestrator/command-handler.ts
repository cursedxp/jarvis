import { Orchestrator, Command } from './orchestrator';
import { SystemPromptManager } from '../prompts/system-prompts';
import { UserPreferenceManager } from '../services/user-preferences';
import { KnowledgeBase } from '../services/knowledge-base';
import { FineTuningManager } from '../services/fine-tuning';
import { planningService } from '../services/planning-integration';

export class CommandHandler {
  private orchestrator: Orchestrator;
  private handlers: Map<string, (command: Command) => Promise<any>>;
  private systemPromptManager: SystemPromptManager;
  private userPreferences: UserPreferenceManager;
  private knowledgeBase: KnowledgeBase;
  private fineTuningManager: FineTuningManager;
  
  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.handlers = new Map();
    this.systemPromptManager = new SystemPromptManager();
    this.userPreferences = new UserPreferenceManager();
    this.knowledgeBase = new KnowledgeBase();
    this.fineTuningManager = new FineTuningManager();
    this.registerHandlers();
  }
  
  private registerHandlers() {
    this.handlers.set('explain', this.handleExplain.bind(this));
    this.handlers.set('refactor', this.handleRefactor.bind(this));
    this.handlers.set('test', this.handleTest.bind(this));
    this.handlers.set('install', this.handleInstall.bind(this));
    this.handlers.set('chat', this.handleChat.bind(this));
    this.handlers.set('switchModel', this.handleSwitchModel.bind(this));
    this.handlers.set('listModels', this.handleListModels.bind(this));
    this.handlers.set('getCurrentModel', this.handleGetCurrentModel.bind(this));
    this.handlers.set('autoSelectModel', this.handleAutoSelectModel.bind(this));
    this.handlers.set('setPersonality', this.handleSetPersonality.bind(this));
    this.handlers.set('setPreferences', this.handleSetPreferences.bind(this));
    this.handlers.set('getPreferences', this.handleGetPreferences.bind(this));
    this.handlers.set('addKnowledge', this.handleAddKnowledge.bind(this));
    this.handlers.set('searchKnowledge', this.handleSearchKnowledge.bind(this));
    this.handlers.set('startFineTuning', this.handleStartFineTuning.bind(this));
    this.handlers.set('getTrainingStatus', this.handleGetTrainingStatus.bind(this));
    this.handlers.set('stopTraining', this.handleStopTraining.bind(this));
  }
  
  async handle(command: Command): Promise<any> {
    const handler = this.handlers.get(command.type);
    
    if (!handler) {
      throw new Error(`Unknown command type: ${command.type}`);
    }
    
    return handler(command);
  }
  
  private async handleExplain(command: Command): Promise<any> {
    const { code, language } = command.payload;
    
    // Auto-select best model for code explanation
    const recommendedModel = this.orchestrator.autoSelectModelForTask('explain');
    await this.orchestrator.switchToModel(recommendedModel);
    
    const prompt = `Explain the following ${language || ''} code in simple terms:\n\n${code}`;
    
    const explanation = await this.orchestrator.processWithLLM(prompt);
    
    return {
      type: 'explanation',
      content: explanation,
      model: this.orchestrator.getCurrentModel()
    };
  }
  
  private async handleRefactor(command: Command): Promise<any> {
    const { code, language, goal } = command.payload;
    
    const prompt = `Refactor the following ${language || ''} code${goal ? ` to ${goal}` : ''}:\n\n${code}`;
    
    const refactored = await this.orchestrator.processWithLLM(prompt);
    
    return {
      type: 'refactored',
      content: refactored
    };
  }
  
  private async handleTest(command: Command): Promise<any> {
    const { code, framework } = command.payload;
    
    const prompt = `Generate unit tests for the following code using ${framework || 'Jest'}:\n\n${code}`;
    
    const tests = await this.orchestrator.processWithLLM(prompt);
    
    return {
      type: 'tests',
      content: tests
    };
  }
  
  private async handleInstall(command: Command): Promise<any> {
    const { packageName } = command.payload;
    
    return {
      type: 'install',
      status: 'dry-run',
      package: packageName,
      message: `Would install package: ${packageName}. Please confirm to proceed.`
    };
  }
  
  private async handleChat(command: Command): Promise<any> {
    const { message, conversationHistory } = command.payload;
    
    // Check for planning commands first
    const planningCommand = planningService.parseCommand(message);
    if (planningCommand) {
      return await this.handlePlanningCommand(planningCommand);
    }
    
    // Detect intent and auto-route to appropriate model
    const taskType = this.detectTaskType(message);
    const recommendedModel = this.orchestrator.autoSelectModelForTask(taskType);
    await this.orchestrator.switchToModel(recommendedModel);
    
    // Get specialized system prompt based on task type
    const baseSystemPrompt = this.getPromptForTaskType(taskType);
    const currentModel = this.orchestrator.getCurrentModel();
    const systemPrompt = this.userPreferences.getModelSpecificPrompt(currentModel, baseSystemPrompt);
    
    // Add relevant knowledge context
    const knowledgeContext = this.knowledgeBase.generateContext(message);
    
    // Add current date and time context
    const now = new Date();
    const dateTimeContext = `Current date and time: ${now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    // Add planning context if available
    let planningContext = '';
    try {
      const isServiceAvailable = await planningService.isServiceAvailable();
      if (isServiceAvailable) {
        const todaysPlan = await planningService.getTodaysPlan();
        if (todaysPlan) {
          const totalTasks = todaysPlan.tasks.length;
          const completedTasks = todaysPlan.tasks.filter(t => t.completed).length;
          planningContext = `\nToday's Planning Context: You have ${totalTasks} tasks (${completedTasks} completed). Goals: ${todaysPlan.goals.join(', ') || 'None set'}.`;
        }
      }
    } catch (error) {
      // Silently fail if planning service unavailable
    }
    
    let prompt = message;
    if (conversationHistory && conversationHistory.length > 0) {
      const historyContext = conversationHistory
        .slice(-10) // Last 10 messages for context
        .map((msg: any) => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      prompt = `${systemPrompt}\n\n${dateTimeContext}${planningContext}\n\n${knowledgeContext}Previous conversation:\n${historyContext}\n\nUser: ${message}`;
    } else {
      prompt = `${systemPrompt}\n\n${dateTimeContext}${planningContext}\n\n${knowledgeContext}User: ${message}`;
    }
    
    const response = await this.orchestrator.processWithLLM(prompt);
    
    return {
      type: 'chat',
      content: response,
      model: this.orchestrator.getCurrentModel(),
      taskType
    };
  }
  
  private async handleSwitchModel(command: Command): Promise<any> {
    const { model } = command.payload;
    
    const success = await this.orchestrator.switchToModel(model);
    
    if (success) {
      return {
        type: 'model-switched',
        model,
        success: true,
        message: `Successfully switched to ${model}`
      };
    } else {
      return {
        type: 'model-switch-failed',
        model,
        success: false,
        message: `Failed to switch to ${model}`
      };
    }
  }
  
  private async handleListModels(_command: Command): Promise<any> {
    const models = this.orchestrator.getAvailableModels();
    const currentModel = this.orchestrator.getCurrentModel();
    
    return {
      type: 'models-list',
      models,
      currentModel
    };
  }
  
  private async handleGetCurrentModel(_command: Command): Promise<any> {
    const currentModel = this.orchestrator.getCurrentModel();
    const modelInfo = this.orchestrator.getModelRegistry().getActiveModelInfo();
    
    return {
      type: 'current-model',
      model: currentModel,
      info: modelInfo
    };
  }
  
  private async handleAutoSelectModel(command: Command): Promise<any> {
    const { taskType } = command.payload;
    
    const recommendedModel = this.orchestrator.autoSelectModelForTask(taskType);
    const switched = await this.orchestrator.switchToModel(recommendedModel);
    
    return {
      type: 'auto-model-selected',
      taskType,
      model: recommendedModel,
      switched,
      message: `${switched ? 'Switched to' : 'Recommended'} ${recommendedModel} for ${taskType} tasks`
    };
  }

  private async handleSetPersonality(command: Command): Promise<any> {
    const { personality, responseStyle, customInstructions } = command.payload;
    
    const updates: any = {};
    if (personality) updates.personality = personality;
    if (responseStyle) updates.responseStyle = responseStyle;
    if (customInstructions) updates.constraints = [...this.systemPromptManager.getConfig().constraints, customInstructions];
    
    this.systemPromptManager.updateConfig(updates);
    
    return {
      type: 'personality-updated',
      personality: personality || this.systemPromptManager.getConfig().personality,
      responseStyle: responseStyle || this.systemPromptManager.getConfig().responseStyle,
      message: `Personality updated to ${personality || 'current'} with ${responseStyle || 'current'} response style`
    };
  }

  private async handleSetPreferences(command: Command): Promise<any> {
    const { preferences, modelId, modelConfig } = command.payload;
    
    if (preferences) {
      this.userPreferences.updatePreferences(preferences);
    }
    
    if (modelId && modelConfig) {
      this.userPreferences.updateModelConfig(modelId, modelConfig);
    }
    
    return {
      type: 'preferences-updated',
      preferences: this.userPreferences.getPreferences(),
      message: 'Preferences updated successfully'
    };
  }

  private async handleGetPreferences(command: Command): Promise<any> {
    const { includeModelConfigs } = command.payload || {};
    
    const preferences = this.userPreferences.getPreferences();
    
    return {
      type: 'preferences',
      preferences: includeModelConfigs ? preferences : { ...preferences, modelConfigs: undefined },
      availableModels: this.userPreferences.getAvailableModels(),
      currentModel: this.orchestrator.getCurrentModel()
    };
  }

  private async handleAddKnowledge(command: Command): Promise<any> {
    const { content, category, tags, source = 'user' } = command.payload;
    
    const id = this.knowledgeBase.addEntry({
      content,
      metadata: {
        source,
        category: category || 'general',
        tags: tags || [],
        timestamp: new Date()
      }
    });
    
    return {
      type: 'knowledge-added',
      id,
      message: `Knowledge added with ID: ${id}`
    };
  }

  private async handleSearchKnowledge(command: Command): Promise<any> {
    const { query, category, tags, limit = 5 } = command.payload;
    
    const results = this.knowledgeBase.search({
      query,
      category,
      tags,
      limit
    });
    
    return {
      type: 'knowledge-results',
      results,
      count: results.length,
      query
    };
  }

  private async handleStartFineTuning(command: Command): Promise<any> {
    const { modelId, baseModel, trainingData, conversationHistory, trainingType = 'conversational' } = command.payload;
    
    let examples = trainingData || [];
    
    // Generate training data from conversation history if provided
    if (conversationHistory && conversationHistory.length > 0) {
      const generatedExamples = this.fineTuningManager.generateTrainingData(conversationHistory);
      examples = [...examples, ...generatedExamples];
    }
    
    if (examples.length === 0) {
      return {
        type: 'training-error',
        error: 'No training data provided',
        message: 'Please provide training data or conversation history'
      };
    }
    
    // Create training configuration based on type
    let config;
    if (trainingType === 'coding') {
      config = FineTuningManager.createCodingTrainingConfig(modelId, examples);
    } else {
      config = FineTuningManager.createConversationalTrainingConfig(modelId, examples);
    }
    
    // Override base model if specified
    if (baseModel) {
      config.baseModel = baseModel;
    }
    
    try {
      await this.fineTuningManager.startFineTuning(config);
      
      return {
        type: 'training-started',
        modelId,
        trainingExamples: examples.length,
        baseModel: config.baseModel,
        message: `Fine-tuning started for model: ${modelId}`
      };
    } catch (error) {
      return {
        type: 'training-error',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start fine-tuning'
      };
    }
  }

  private async handleGetTrainingStatus(command: Command): Promise<any> {
    const status = this.fineTuningManager.getStatus();
    
    return {
      type: 'training-status',
      ...status
    };
  }

  private async handleStopTraining(command: Command): Promise<any> {
    this.fineTuningManager.stopTraining();
    
    return {
      type: 'training-stopped',
      message: 'Training process stopped'
    };
  }

  private async handlePlanningCommand(planningCommand: { action: string; data: any }): Promise<any> {
    const { action, data } = planningCommand;

    try {
      switch (action) {
        case 'addTask':
          const taskAdded = await planningService.addTask(data);
          return {
            type: 'planning',
            content: taskAdded ? `Task added: "${data.title}"` : 'Failed to add task. Planning service may be unavailable.',
            success: taskAdded
          };

        case 'getTodaysPlan':
          const summary = await planningService.generateTodaysSummary();
          return {
            type: 'planning',
            content: summary,
            success: true
          };

        case 'getWeeklySummary':
          const weeklyStats = await planningService.generateWeeklySummary();
          return {
            type: 'planning',
            content: weeklyStats,
            success: true
          };

        case 'addGoal':
          const plan = await planningService.getTodaysPlan();
          const currentGoals = plan?.goals || [];
          const updatedPlan = await planningService.createTodaysPlan({
            goals: [...currentGoals, data.goal]
          });
          return {
            type: 'planning',
            content: updatedPlan ? `Goal added: "${data.goal}"` : 'Failed to add goal',
            success: !!updatedPlan
          };

        case 'listTasksToComplete':
          const todaysPlan = await planningService.getTodaysPlan();
          if (!todaysPlan || todaysPlan.tasks.length === 0) {
            return {
              type: 'planning',
              content: 'No tasks found for today',
              success: true
            };
          }
          
          const pendingTasks = todaysPlan.tasks.filter(t => !t.completed);
          if (pendingTasks.length === 0) {
            return {
              type: 'planning',
              content: 'All tasks completed! Great job.',
              success: true
            };
          }

          const taskList = pendingTasks
            .map((task, index) => `${index + 1}. ${task.title}`)
            .join('\n');
          
          return {
            type: 'planning',
            content: `Pending tasks:\n${taskList}`,
            success: true
          };

        default:
          return {
            type: 'planning',
            content: 'Planning command not recognized',
            success: false
          };
      }
    } catch (error) {
      console.error('Planning command error:', error);
      return {
        type: 'planning',
        content: 'Planning service is currently unavailable',
        success: false
      };
    }
  }

  // Task detection and routing methods
  private detectTaskType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Coding/programming keywords (using word boundaries for exact matches)
    const codingKeywords = [
      // Actions
      'write code', 'debug', 'fix bug', 'refactor', 'function', 'class', 'variable',
      'compile', 'build', 'deploy', 'test', 'unit test', 'integration', 'install',
      'import', 'export', 'async', 'await', 'promise', 'callback', 'configure',
      
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'rust', 'go', 
      'php', 'ruby', 'swift', 'kotlin', 'dart', 'scala', 'clojure', 'haskell',
      'assembly', 'bash', 'shell', 'powershell', 'perl', 'lua', 'r', 'matlab',
      
      // Web Technologies
      'html', 'css', 'scss', 'sass', 'less', 'react', 'vue', 'angular', 'svelte',
      'nextjs', 'nuxt', 'gatsby', 'webpack', 'vite', 'rollup', 'parcel',
      'tailwind', 'bootstrap', 'material-ui', 'chakra', 'styled-components',
      
      // Backend/Server
      'nodejs', 'express', 'fastapi', 'django', 'flask', 'spring', 'laravel',
      'rails', 'asp.net', 'gin', 'fiber', 'koa', 'nest', 'hapi',
      
      // Databases
      'sql', 'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis', 'cassandra',
      'dynamodb', 'firebase', 'supabase', 'prisma', 'typeorm', 'sequelize',
      'elasticsearch', 'solr', 'neo4j', 'graphql', 'hasura',
      
      // Cloud/DevOps
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'helm',
      'terraform', 'ansible', 'jenkins', 'github actions', 'gitlab ci', 'circleci',
      'nginx', 'apache', 'caddy', 'traefik', 'cloudflare', 'vercel', 'netlify',
      
      // Mobile Development
      'android', 'ios', 'react native', 'flutter', 'xamarin', 'ionic', 'cordova',
      'swift ui', 'jetpack compose', 'expo',
      
      // Data Science/ML
      'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch', 'keras',
      'jupyter', 'matplotlib', 'seaborn', 'plotly', 'opencv', 'hugging face',
      
      // Version Control
      'git', 'github', 'gitlab', 'bitbucket', 'commit', 'pull request', 'merge',
      'branch', 'rebase', 'cherry-pick', 'stash', 'clone', 'fork',
      
      // Package Managers
      'npm', 'yarn', 'pnpm', 'pip', 'conda', 'composer', 'maven', 'gradle',
      'cargo', 'go mod', 'bundler', 'nuget',
      
      // Development Tools
      'vscode', 'intellij', 'vim', 'emacs', 'sublime', 'atom', 'xcode',
      'android studio', 'postman', 'insomnia', 'figma', 'sketch',
      
      // Concepts
      'algorithm', 'data structure', 'api', 'rest', 'soap', 'microservices',
      'monolith', 'serverless', 'oop', 'functional programming', 'mvc',
      'design pattern', 'solid principles', 'clean code', 'agile', 'scrum',
      'ci/cd', 'tdd', 'bdd', 'orm', 'middleware', 'webhook', 'oauth',
      'jwt', 'ssl', 'https', 'cors', 'csrf', 'xss', 'sql injection'
    ];
    
    // Creative/writing keywords  
    const creativeKeywords = [
      'write a story', 'creative', 'brainstorm', 'imagine', 'poem',
      'article', 'blog post', 'essay', 'narrative', 'character',
      'plot', 'generate ideas', 'creative writing'
    ];
    
    // Technical analysis keywords
    const technicalKeywords = [
      // Analysis requests
      'explain how', 'technical explanation', 'architecture', 'design pattern',
      'performance analysis', 'system design', 'scalability', 'optimization',
      'detailed analysis', 'deep dive', 'technical overview', 'how does',
      'what happens when', 'technical details', 'under the hood',
      
      // System Architecture
      'load balancer', 'message queue', 'event driven', 'caching strategy',
      'database sharding', 'replication', 'failover', 'disaster recovery',
      'high availability', 'fault tolerance', 'distributed system',
      'service mesh', 'api gateway', 'reverse proxy', 'cdn',
      
      // Performance & Monitoring
      'monitoring', 'observability', 'metrics', 'logging', 'tracing',
      'prometheus', 'grafana', 'elk stack', 'datadog', 'new relic',
      'performance tuning', 'bottleneck', 'profiling', 'benchmark',
      
      // Security Analysis
      'security architecture', 'threat model', 'vulnerability assessment',
      'penetration testing', 'zero trust', 'encryption', 'authentication',
      'authorization', 'compliance', 'gdpr', 'hipaa', 'iso 27001',
      
      // Network & Infrastructure
      'network topology', 'tcp/ip', 'dns', 'load balancing', 'auto scaling',
      'blue green deployment', 'canary deployment', 'rolling update',
      'infrastructure as code', 'immutable infrastructure'
    ];
    
    // Helper function for better keyword matching
    const hasKeyword = (keywords: string[], message: string): boolean => {
      return keywords.some(keyword => {
        // For multi-word phrases, use simple includes
        if (keyword.includes(' ')) {
          return message.includes(keyword);
        }
        // For single words, use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(message);
      });
    };
    
    // Check for coding tasks
    if (hasKeyword(codingKeywords, lowerMessage)) {
      return 'coding';
    }
    
    // Check for creative tasks  
    if (hasKeyword(creativeKeywords, lowerMessage)) {
      return 'creative';
    }
    
    // Check for technical analysis
    if (hasKeyword(technicalKeywords, lowerMessage)) {
      return 'technical';
    }
    
    // Default to main conversation
    return 'conversation';
  }

  private getPromptForTaskType(taskType: string): string {
    switch (taskType) {
      case 'coding':
        return SystemPromptManager.getCodingPrompt();
      case 'creative':
        return SystemPromptManager.getCreativePrompt();
      case 'technical':
        return SystemPromptManager.getTechnicalPrompt();
      case 'conversation':
      default:
        return SystemPromptManager.getMainJarvisPrompt();
    }
  }
}