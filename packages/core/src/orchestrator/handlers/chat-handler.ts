import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { SystemPromptManager } from '../../prompts/system-prompts';
import { UserPreferenceManager } from '../../services/user-preferences';
import { KnowledgeBase } from '../../services/knowledge-base';
import { CommandRegistry } from './command-registry';

export class ChatHandler extends BaseHandler {
  private orchestrator: Orchestrator;
  private userPreferences: UserPreferenceManager;
  private knowledgeBase: KnowledgeBase;
  private commandRegistry?: CommandRegistry;

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

  setCommandRegistry(registry: CommandRegistry) {
    this.commandRegistry = registry;
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
    
    // Check if this is a task management request that should be routed to planning handler
    if (await this.isTaskManagementRequest(message)) {
      console.log('🎯 Routing task management request to Planning Handler:', message);
      if (this.commandRegistry) {
        try {
          const planningCommand = { type: 'planning', payload: command.payload };
          return await this.commandRegistry.handle(planningCommand);
        } catch (error) {
          console.error('Command registry error, falling back to chat:', error);
          // Fall through to regular chat processing
        }
      }
    }
    
    // Let the LLM handle everything else naturally
    console.log('💬 Processing message with natural intelligence:', message);
    
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

    // Don't add planning context automatically - this was forcing task-related responses
    let planningContext = '';
    
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

  private async isTaskManagementRequest(message: string): Promise<boolean> {
    const lowerMessage = message.toLowerCase();
    
    // Clear task management keywords - only route obvious task management requests
    const taskActionKeywords = [
      'add task', 'create task', 'new task', 'make a task',
      'delete task', 'remove task', 'complete task', 'mark task', 'finish task',
      'move task', 'update task', 'edit task', 'change task',
      'show tasks', 'list tasks', 'list all tasks', 'my tasks', 'view tasks',
      'clear all tasks', 'delete all tasks'
    ];
    
    // Only route if there's a clear task management action
    const isTaskAction = taskActionKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Don't route vague requests - let chat handler ask clarifying questions
    const vagueRequests = [
      'i need tasks', 'some tasks', 'tasks for', 'help with tasks',
      'what should i do', 'what can i do', 'give me something to do'
    ];
    const isVague = vagueRequests.some(phrase => lowerMessage.includes(phrase));
    
    if (isTaskAction && !isVague) {
      console.log('🎯 ROUTING: Clear task action detected:', message.substring(0, 50));
      return true;
    } else {
      console.log('💬 ROUTING: Keeping in chat for natural conversation:', message.substring(0, 50));
      return false;
    }
  }
}