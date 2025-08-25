import { BaseHandler } from './base-handler';
import { Command } from '../orchestrator';
import { FineTuningManager } from '../../services/fine-tuning';

export class TrainingHandler extends BaseHandler {
  private fineTuningManager: FineTuningManager;

  constructor(fineTuningManager: FineTuningManager) {
    super();
    this.fineTuningManager = fineTuningManager;
  }

  getHandlerName(): string {
    return 'TrainingHandler';
  }

  getCommands(): string[] {
    return ['startFineTuning', 'getTrainingStatus', 'stopTraining'];
  }

  async handle(command: Command): Promise<any> {
    switch (command.type) {
      case 'startFineTuning':
        return this.handleStartFineTuning(command);
      case 'getTrainingStatus':
        return this.handleGetTrainingStatus(command);
      case 'stopTraining':
        return this.handleStopTraining(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private async handleStartFineTuning(command: Command): Promise<any> {
    this.validateCommand(command, 'startFineTuning');
    const { 
      modelId, 
      baseModel, 
      trainingData, 
      conversationHistory, 
      trainingType = 'conversational' 
    } = command.payload;

    if (!modelId) {
      return this.createErrorResponse(
        'training-start-failed',
        'Model ID is required to start fine-tuning'
      );
    }

    try {
      let examples = trainingData || [];
      
      // Generate training data from conversation history if provided
      if (conversationHistory && conversationHistory.length > 0) {
        const generatedExamples = this.fineTuningManager.generateTrainingData(conversationHistory);
        examples = [...examples, ...generatedExamples];
      }
      
      if (examples.length === 0) {
        return this.createErrorResponse(
          'training-start-failed',
          'No training data provided. Please provide training data or conversation history'
        );
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
      
      await this.fineTuningManager.startFineTuning(config);
      
      return this.createSuccessResponse(
        'training-started',
        {
          modelId,
          trainingExamples: examples.length,
          baseModel: config.baseModel,
          trainingType,
          config: {
            epochs: config.epochs,
            learningRate: config.learningRate,
            batchSize: config.batchSize
          }
        },
        `Fine-tuning started for model: ${modelId} with ${examples.length} training examples`
      );
    } catch (error) {
      return this.createErrorResponse(
        'training-start-failed',
        `Failed to start fine-tuning: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { modelId, trainingType, exampleCount: (command.payload.trainingData || []).length }
      );
    }
  }

  private async handleGetTrainingStatus(_command: Command): Promise<any> {
    try {
      const status = this.fineTuningManager.getStatus();
      
      return this.createSuccessResponse(
        'training-status',
        status,
        `Training status: ${status.status}`
      );
    } catch (error) {
      return this.createErrorResponse(
        'training-status-failed',
        `Failed to get training status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleStopTraining(_command: Command): Promise<any> {
    try {
      const wasRunning = this.fineTuningManager.getStatus().status === 'training';
      this.fineTuningManager.stopTraining();
      
      return this.createSuccessResponse(
        'training-stopped',
        {
          wasRunning,
          stoppedAt: new Date().toISOString()
        },
        wasRunning ? 'Training process stopped successfully' : 'No training process was running'
      );
    } catch (error) {
      return this.createErrorResponse(
        'training-stop-failed',
        `Failed to stop training: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}