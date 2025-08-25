import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { SystemPromptManager } from '../../prompts/system-prompts';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { planningService } from '../../services/planning-integration';

export class ChatHandler extends BaseHandler {
  private orchestrator: Orchestrator;
  private userPreferences: UserPreferenceManager;
  private knowledgeBase: KnowledgeBase;

  constructor(
    orchestrator: Orchestrator,
    userPreferences: UserPreferenceManager,
    knowledgeBase: KnowledgeBase
  ) {
    super();
    this.orchestrator = orchestrator;
    this.userPreferences = userPreferences;
    this.knowledgeBase = knowledgeBase;
  }

  getHandlerName(): string {
    return 'ChatHandler';
  }

  getCommands(): string[] {
    return ['chat', 'explain', 'refactor', 'test', 'install'];
  }

  async handle(command: Command): Promise<any> {
    switch (command.type) {
      case 'chat':
        return this.handleChat(command);
      case 'explain':
        return this.handleExplain(command);
      case 'refactor':
        return this.handleRefactor(command);
      case 'test':
        return this.handleTest(command);
      case 'install':
        return this.handleInstall(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
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

  private async handleExplain(command: Command): Promise<any> {
    const { code, language } = command.payload;
    
    const prompt = `Please explain this ${language || 'code'}:\n\n${code}`;
    const response = await this.orchestrator.processWithLLM(prompt);
    
    return this.createSuccessResponse('explanation', { explanation: response }, 'Code explanation generated');
  }

  private async handleRefactor(command: Command): Promise<any> {
    const { code, language, requirements } = command.payload;
    
    let prompt = `Please refactor this ${language || 'code'}`;
    if (requirements) {
      prompt += ` with these requirements: ${requirements}`;
    }
    prompt += `:\n\n${code}`;
    
    const response = await this.orchestrator.processWithLLM(prompt);
    
    return this.createSuccessResponse('refactor', { refactoredCode: response }, 'Code refactored successfully');
  }

  private async handleTest(command: Command): Promise<any> {
    const { code, language, testType } = command.payload;
    
    let prompt = `Please write ${testType || 'unit'} tests for this ${language || 'code'}:\n\n${code}`;
    const response = await this.orchestrator.processWithLLM(prompt);
    
    return this.createSuccessResponse('test', { testCode: response }, 'Tests generated successfully');
  }

  private async handleInstall(command: Command): Promise<any> {
    const { packageName, manager } = command.payload;
    
    const prompt = `How do I install ${packageName}${manager ? ` using ${manager}` : ''}?`;
    const response = await this.orchestrator.processWithLLM(prompt);
    
    return this.createSuccessResponse('install-guide', { guide: response }, 'Installation guide generated');
  }

  private async handlePlanningCommand(planningCommand: { action: string; data: any }): Promise<any> {
    const { action, data } = planningCommand;
    
    try {
      let result;
      switch (action) {
        case 'SAVE_TASK':
          result = await planningService.addTask({
            title: data,
            description: `Task added via voice command`,
            priority: 'medium'
          });
          return {
            type: 'planning-response',
            content: result ? `Task "${data}" added to your plan` : 'Failed to add task',
            success: result
          };
          
        case 'COMPLETE_TASK':
          result = await planningService.completeTask(data);
          return {
            type: 'planning-response',
            content: result ? `Task "${data}" marked as completed` : 'Failed to complete task',
            success: result
          };
          
        case 'COMPLETE_ALL_TASKS':
          // For now, this feature is not implemented in the planning service
          return {
            type: 'planning-response',
            content: 'Complete all tasks feature is not yet implemented',
            success: false
          };
          
        case 'SAVE_GOAL':
          // For now, this feature is not implemented in the planning service
          return {
            type: 'planning-response',
            content: 'Add goal feature is not yet implemented',
            success: false
          };
          
        default:
          return null;
      }
    } catch (error) {
      return {
        type: 'planning-response',
        content: `Planning service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        success: false
      };
    }
  }

  private detectTaskType(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // Coding/programming keywords
    const codingKeywords = [
      'write code', 'debug', 'fix bug', 'refactor', 'function', 'class', 'variable',
      'compile', 'build', 'deploy', 'test', 'unit test', 'integration', 'install',
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'rust', 'go',
      'html', 'css', 'react', 'vue', 'angular', 'node', 'npm', 'git'
    ];
    
    // Creative keywords
    const creativeKeywords = [
      'write story', 'create', 'design', 'brainstorm', 'imagine', 'creative',
      'poem', 'essay', 'article', 'blog', 'content', 'marketing'
    ];
    
    // Technical keywords  
    const technicalKeywords = [
      'architecture', 'system design', 'database', 'server', 'api', 'performance',
      'scalability', 'security', 'optimize', 'algorithm', 'data structure'
    ];
    
    if (codingKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'coding';
    } else if (creativeKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'creative';
    } else if (technicalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'technical';
    } else {
      return 'conversation';
    }
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