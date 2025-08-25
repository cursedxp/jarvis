import { Orchestrator, Command } from './orchestrator';

export class CommandHandler {
  private orchestrator: Orchestrator;
  private handlers: Map<string, (command: Command) => Promise<any>>;
  
  constructor(orchestrator: Orchestrator) {
    this.orchestrator = orchestrator;
    this.handlers = new Map();
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
    const { message } = command.payload;
    
    const response = await this.orchestrator.processWithLLM(message);
    
    return {
      type: 'chat',
      content: response
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
}