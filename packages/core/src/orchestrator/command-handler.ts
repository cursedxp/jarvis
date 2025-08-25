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
  private io?: any;
  
  constructor(orchestrator: Orchestrator, io?: any) {
    this.orchestrator = orchestrator;
    this.handlers = new Map();
    this.systemPromptManager = new SystemPromptManager();
    this.userPreferences = new UserPreferenceManager();
    this.knowledgeBase = new KnowledgeBase();
    this.fineTuningManager = new FineTuningManager();
    this.io = io;
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
      const result = await this.handlePlanningCommand(planningCommand);
      if (result) {
        return result;
      }
      // If result is null, fall through to normal chat processing
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

        case 'intelligentPlanningAssistant':
          // Intelligent planning assistant that understands natural language
          const userMessage = data.message;
          console.log('🧠 Intelligent planning assistant processing:', userMessage);
          
          const taskType = this.detectTaskType(userMessage);
          const recommendedModel = this.orchestrator.autoSelectModelForTask(taskType);
          await this.orchestrator.switchToModel(recommendedModel);
          
          // Get current planning context  
          let currentPlan = '';
          try {
            console.log('🔍 Fetching current tasks for context...');
            const todaysPlan = await planningService.getTodaysPlan();
            console.log('📋 Current plan data:', todaysPlan);
            
            if (todaysPlan && todaysPlan.tasks && todaysPlan.tasks.length > 0) {
              const incompleteTasks = todaysPlan.tasks.filter(t => !t.completed);
              const completedTasks = todaysPlan.tasks.filter(t => t.completed);
              
              currentPlan = `\nCurrent tasks (${todaysPlan.tasks.length} total):`;
              currentPlan += `\n${todaysPlan.tasks.map(t => `- ${t.title}${t.completed ? ' ✓' : ' (pending)'}`).join('\n')}`;
              
              if (incompleteTasks.length > 0) {
                currentPlan += `\n\nIncomplete tasks: ${incompleteTasks.length}`;
              }
              if (completedTasks.length > 0) {
                currentPlan += `\nCompleted tasks: ${completedTasks.length}`;
              }
            } else {
              currentPlan = '\nNo current tasks found.';
            }
          } catch (error) {
            console.error('❌ Failed to fetch current plan:', error);
            currentPlan = '\nUnable to fetch current tasks.';
          }
          
          const systemPrompt = `You are Jarvis, an intelligent planning AGENT. You don't just talk about actions - you EXECUTE them using specific commands.

CRITICAL: You MUST use these exact action commands when the user requests planning actions:

MANDATORY ACTIONS:
- Create tasks: SAVE_TASK: [task name]
- Complete tasks: COMPLETE_TASK: [exact task name] 
- Complete all tasks: COMPLETE_ALL_TASKS
- Add goals: SAVE_GOAL: [goal text]

AGENT BEHAVIOR RULES:
1. When user asks to complete a task, you MUST output: COMPLETE_TASK: [exact task name from context]
2. When user asks to add a task, you MUST output: SAVE_TASK: [task name]
3. ALWAYS use the EXACT task names from the context below
4. Execute the action FIRST, then provide a brief confirmation
5. Do NOT just describe what you would do - DO IT with the commands

The user said: "${userMessage}"

Current planning context:${currentPlan}

EXECUTE THE REQUESTED ACTION using the mandatory commands above, then provide a brief response.`;

          const now = new Date();
          const dateTimeContext = `Current date and time: ${now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`;

          const response = await this.orchestrator.processWithLLM(`${systemPrompt}\n\n${dateTimeContext}\n\nUser: ${userMessage}`);
          
          console.log('🔍 LLM Response:', response);
          
          // Process all action types intelligently
          let actionsProcessed = 0;
          let actionSummary = [];
          
          // Extract and process SAVE_TASK actions
          const taskMatches = response.match(/SAVE_TASK:\s*(.+)/g);
          if (taskMatches && taskMatches.length > 0) {
            console.log('✅ Processing SAVE_TASK actions...');
            for (const match of taskMatches) {
              const taskTitle = match.replace('SAVE_TASK:', '').trim();
              console.log('💾 Saving task:', taskTitle);
              const result = await planningService.addTask({ title: taskTitle });
              if (result) {
                actionsProcessed++;
                actionSummary.push(`Added task: "${taskTitle}"`);
                
                // Emit planning update via Socket.IO
                if (this.io) {
                  this.io.emit('planning_updated', { 
                    action: 'task_added', 
                    task: { title: taskTitle },
                    timestamp: new Date()
                  });
                }
              }
            }
          }
          
          // Extract and process SAVE_GOAL actions  
          const goalMatches = response.match(/SAVE_GOAL:\s*(.+)/g);
          if (goalMatches && goalMatches.length > 0) {
            console.log('🎯 Processing SAVE_GOAL actions...');
            for (const match of goalMatches) {
              const goalText = match.replace('SAVE_GOAL:', '').trim();
              console.log('🎯 Saving goal:', goalText);
              try {
                const result = await fetch('http://localhost:3000/api/plans/today', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'goal', goal: goalText })
                });
                if (result.ok) {
                  actionsProcessed++;
                  actionSummary.push(`Added goal: "${goalText}"`);
                  
                  // Emit planning update via Socket.IO
                  if (this.io) {
                    this.io.emit('planning_updated', { 
                      action: 'goal_added', 
                      goal: goalText,
                      timestamp: new Date()
                    });
                  }
                }
              } catch (error) {
                console.error('Failed to save goal:', error);
              }
            }
          }
          
          // Extract and process COMPLETE_TASK actions
          const completeMatches = response.match(/COMPLETE_TASK:\s*(.+)/g);
          if (completeMatches && completeMatches.length > 0) {
            console.log('✅ Processing COMPLETE_TASK actions...');
            for (const match of completeMatches) {
              const taskTitle = match.replace('COMPLETE_TASK:', '').trim();
              console.log('✅ Completing specific task:', taskTitle);
              
              // Find task by title and complete it
              try {
                const currentTasks = await planningService.getTodaysPlan();
                if (currentTasks && currentTasks.tasks) {
                  const taskToComplete = currentTasks.tasks.find(t => 
                    t.title.toLowerCase().includes(taskTitle.toLowerCase()) || 
                    taskTitle.toLowerCase().includes(t.title.toLowerCase())
                  );
                  
                  if (taskToComplete) {
                    const result = await planningService.completeTask(taskToComplete.id);
                    if (result) {
                      actionsProcessed++;
                      actionSummary.push(`✓ Completed: "${taskToComplete.title}"`);
                      
                      // Emit planning update via Socket.IO
                      if (this.io) {
                        this.io.emit('planning_updated', { 
                          action: 'task_completed', 
                          task: { id: taskToComplete.id, title: taskToComplete.title },
                          timestamp: new Date()
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Failed to complete task:', error);
              }
            }
          }
          
          // Extract and process COMPLETE_ALL_TASKS action
          if (response.includes('COMPLETE_ALL_TASKS')) {
            console.log('✅ Processing COMPLETE_ALL_TASKS action...');
            try {
              const currentTasks = await planningService.getTodaysPlan();
              if (currentTasks && currentTasks.tasks) {
                const incompleteTasks = currentTasks.tasks.filter(t => !t.completed);
                console.log(`📋 Found ${incompleteTasks.length} incomplete tasks to complete`);
                
                for (const task of incompleteTasks) {
                  console.log('✅ Completing task:', task.title);
                  const result = await planningService.completeTask(task.id);
                  if (result) {
                    actionsProcessed++;
                    actionSummary.push(`✓ Completed: "${task.title}"`);
                  }
                }
                
                // Emit bulk completion event
                if (this.io && incompleteTasks.length > 0) {
                  this.io.emit('planning_updated', { 
                    action: 'all_tasks_completed', 
                    completedCount: incompleteTasks.length,
                    tasks: incompleteTasks.map(t => ({ id: t.id, title: t.title })),
                    timestamp: new Date()
                  });
                }
              }
            } catch (error) {
              console.error('Failed to complete all tasks:', error);
            }
          }
            
            // Clean up response by removing action lines
            let cleanResponse = response
              .replace(/SAVE_TASK:\s*.+/g, '')
              .replace(/SAVE_GOAL:\s*.+/g, '')  
              .replace(/COMPLETE_TASK:\s*.+/g, '')
              .replace(/COMPLETE_ALL_TASKS/g, '')
              .trim();
            
            // Add action summary if actions were processed
            if (actionsProcessed > 0) {
              cleanResponse += '\n\n' + actionSummary.join('\n');
            }
            
            return {
              type: 'planning',
              content: cleanResponse,
              success: true
            };

        default:
          return null;
      }
    } catch (error) {
      console.error('Planning command error:', error);
      return null;
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