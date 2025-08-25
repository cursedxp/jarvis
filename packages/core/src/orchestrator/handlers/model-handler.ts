import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';

export class ModelHandler extends BaseHandler {
  private orchestrator: Orchestrator;

  constructor(orchestrator: Orchestrator) {
    super();
    this.orchestrator = orchestrator;
  }

  getHandlerName(): string {
    return 'ModelHandler';
  }

  getCommands(): string[] {
    return ['switchModel', 'listModels', 'getCurrentModel', 'autoSelectModel'];
  }

  async handle(command: Command): Promise<any> {
    switch (command.type) {
      case 'switchModel':
        return this.handleSwitchModel(command);
      case 'listModels':
        return this.handleListModels(command);
      case 'getCurrentModel':
        return this.handleGetCurrentModel(command);
      case 'autoSelectModel':
        return this.handleAutoSelectModel(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private async handleSwitchModel(command: Command): Promise<any> {
    this.validateCommand(command, 'switchModel');
    const { model } = command.payload;

    if (!model) {
      return this.createErrorResponse('model-switch-failed', 'Model name is required');
    }

    try {
      const success = await this.orchestrator.switchToModel(model);
      
      if (success) {
        return this.createSuccessResponse(
          'model-switched',
          { 
            model,
            currentModel: this.orchestrator.getCurrentModel()
          },
          `Successfully switched to ${model}`
        );
      } else {
        return this.createErrorResponse(
          'model-switch-failed',
          `Failed to switch to ${model}`,
          { requestedModel: model }
        );
      }
    } catch (error) {
      return this.createErrorResponse(
        'model-switch-failed',
        `Error switching to model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { requestedModel: model }
      );
    }
  }

  private async handleListModels(_command: Command): Promise<any> {
    try {
      const models = this.orchestrator.getAvailableModels();
      const currentModel = this.orchestrator.getCurrentModel();
      
      return this.createSuccessResponse(
        'models-list',
        {
          models,
          currentModel,
          totalCount: models.length
        },
        `Found ${models.length} available models`
      );
    } catch (error) {
      return this.createErrorResponse(
        'models-list-failed',
        `Failed to retrieve model list: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleGetCurrentModel(_command: Command): Promise<any> {
    try {
      const currentModel = this.orchestrator.getCurrentModel();
      const modelRegistry = this.orchestrator.getModelRegistry();
      const modelInfo = modelRegistry ? modelRegistry.getActiveModelInfo() : null;
      
      return this.createSuccessResponse(
        'current-model',
        {
          model: currentModel,
          info: modelInfo
        },
        `Current model: ${currentModel}`
      );
    } catch (error) {
      return this.createErrorResponse(
        'current-model-failed',
        `Failed to get current model info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleAutoSelectModel(command: Command): Promise<any> {
    this.validateCommand(command, 'autoSelectModel');
    const { taskType } = command.payload;

    if (!taskType) {
      return this.createErrorResponse('auto-model-selection-failed', 'Task type is required');
    }

    try {
      const recommendedModel = this.orchestrator.autoSelectModelForTask(taskType);
      const switched = await this.orchestrator.switchToModel(recommendedModel);
      
      return this.createSuccessResponse(
        'auto-model-selected',
        {
          taskType,
          model: recommendedModel,
          switched,
          currentModel: this.orchestrator.getCurrentModel()
        },
        `${switched ? 'Switched to' : 'Recommended'} ${recommendedModel} for ${taskType} tasks`
      );
    } catch (error) {
      return this.createErrorResponse(
        'auto-model-selection-failed',
        `Failed to auto-select model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { taskType }
      );
    }
  }
}