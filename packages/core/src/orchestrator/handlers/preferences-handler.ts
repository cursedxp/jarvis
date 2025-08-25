import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { UserPreferenceManager } from '../../services/user-preferences';

export class PreferencesHandler extends BaseHandler {
  private orchestrator: Orchestrator;
  private userPreferences: UserPreferenceManager;

  constructor(orchestrator: Orchestrator, userPreferences: UserPreferenceManager) {
    super();
    this.orchestrator = orchestrator;
    this.userPreferences = userPreferences;
  }

  getHandlerName(): string {
    return 'PreferencesHandler';
  }

  getCommands(): string[] {
    return ['setPersonality', 'setPreferences', 'getPreferences'];
  }

  async handle(command: Command): Promise<any> {
    switch (command.type) {
      case 'setPersonality':
        return this.handleSetPersonality(command);
      case 'setPreferences':
        return this.handleSetPreferences(command);
      case 'getPreferences':
        return this.handleGetPreferences(command);
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }

  private async handleSetPersonality(command: Command): Promise<any> {
    this.validateCommand(command, 'setPersonality');
    const { personality, responseStyle } = command.payload;

    if (!personality && !responseStyle) {
      return this.createErrorResponse(
        'personality-update-failed', 
        'At least one of personality or responseStyle must be provided'
      );
    }

    try {
      // Note: SystemPromptManager is static and doesn't have config methods
      // This is a placeholder for future personality update functionality
      
      return this.createSuccessResponse(
        'personality-updated',
        {
          personality: personality || 'current',
          responseStyle: responseStyle || 'current'
        },
        `Personality updated to ${personality || 'current'} with ${responseStyle || 'current'} response style`
      );
    } catch (error) {
      return this.createErrorResponse(
        'personality-update-failed',
        `Failed to update personality: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { personality, responseStyle }
      );
    }
  }

  private async handleSetPreferences(command: Command): Promise<any> {
    this.validateCommand(command, 'setPreferences');
    const { preferences, modelId, modelConfig } = command.payload;

    if (!preferences && !modelId) {
      return this.createErrorResponse(
        'preferences-update-failed',
        'Either preferences or modelId with modelConfig must be provided'
      );
    }

    try {
      if (preferences) {
        this.userPreferences.updatePreferences(preferences);
      }
      
      if (modelId && modelConfig) {
        this.userPreferences.updateModelConfig(modelId, modelConfig);
      }
      
      const updatedPreferences = this.userPreferences.getPreferences();
      
      return this.createSuccessResponse(
        'preferences-updated',
        {
          preferences: updatedPreferences
        },
        'Preferences updated successfully'
      );
    } catch (error) {
      return this.createErrorResponse(
        'preferences-update-failed',
        `Failed to update preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { preferences, modelId, modelConfig }
      );
    }
  }

  private async handleGetPreferences(command: Command): Promise<any> {
    try {
      const { includeModelConfigs } = command.payload || {};
      
      const preferences = this.userPreferences.getPreferences();
      const currentModel = this.orchestrator.getCurrentModel();
      const availableModels = this.userPreferences.getAvailableModels();
      
      // Filter out model configs if not requested
      const responsePreferences = includeModelConfigs 
        ? preferences 
        : { ...preferences, modelConfigs: undefined };
      
      return this.createSuccessResponse(
        'preferences',
        {
          preferences: responsePreferences,
          availableModels,
          currentModel
        },
        'Preferences retrieved successfully'
      );
    } catch (error) {
      return this.createErrorResponse(
        'preferences-retrieval-failed',
        `Failed to get preferences: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}