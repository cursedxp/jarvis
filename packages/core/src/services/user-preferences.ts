export interface ModelTrainingConfig {
  modelId: string;
  specialization: 'general' | 'coding' | 'technical' | 'conversational';
  systemPromptOverrides: string;
  trainingExamples: Array<{
    input: string;
    output: string;
    context?: string;
  }>;
}

export interface UserPreferences {
  personality: 'professional' | 'casual' | 'friendly';
  responseLength: 'brief' | 'detailed' | 'comprehensive';
  topics: string[];
  customInstructions: string;
  preferredModel: string;
  modelConfigs: Record<string, ModelTrainingConfig>;
  learningData: {
    commonQuestions: string[];
    preferredAnswers: Record<string, string>;
  };
}

export class UserPreferenceManager {
  private preferences: UserPreferences = {
    personality: 'friendly',
    responseLength: 'brief',
    topics: [],
    customInstructions: '',
    preferredModel: 'llama3.2:3b',
    modelConfigs: {
      'llama3.2:3b': {
        modelId: 'llama3.2:3b',
        specialization: 'conversational',
        systemPromptOverrides: 'Focus on natural conversation and being helpful.',
        trainingExamples: []
      },
      'codellama:7b': {
        modelId: 'codellama:7b',
        specialization: 'coding',
        systemPromptOverrides: 'Specialize in code explanation, debugging, and programming assistance.',
        trainingExamples: []
      },
      'codellama:latest': {
        modelId: 'codellama:latest',
        specialization: 'coding',
        systemPromptOverrides: 'Latest coding model - focus on modern programming practices.',
        trainingExamples: []
      }
    },
    learningData: {
      commonQuestions: [],
      preferredAnswers: {}
    }
  };

  getPreferences(): UserPreferences {
    return this.preferences;
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
  }

  addLearningData(question: string, answer: string): void {
    if (!this.preferences.learningData.commonQuestions.includes(question)) {
      this.preferences.learningData.commonQuestions.push(question);
    }
    this.preferences.learningData.preferredAnswers[question] = answer;
  }

  getSystemPrompt(): string {
    const { personality, responseLength, customInstructions } = this.preferences;
    
    let prompt = `You are Jarvis, a ${personality} AI assistant.`;
    
    if (responseLength === 'brief') {
      prompt += ' Keep responses concise and to the point.';
    } else if (responseLength === 'detailed') {
      prompt += ' Provide detailed explanations with examples.';
    } else {
      prompt += ' Give comprehensive answers covering all aspects.';
    }

    if (customInstructions) {
      prompt += `\n\nCustom instructions: ${customInstructions}`;
    }

    return prompt;
  }

  // Model-specific methods
  getModelConfig(modelId: string): ModelTrainingConfig | undefined {
    return this.preferences.modelConfigs[modelId];
  }

  updateModelConfig(modelId: string, config: Partial<ModelTrainingConfig>): void {
    if (!this.preferences.modelConfigs[modelId]) {
      this.preferences.modelConfigs[modelId] = {
        modelId,
        specialization: 'general',
        systemPromptOverrides: '',
        trainingExamples: []
      };
    }
    this.preferences.modelConfigs[modelId] = {
      ...this.preferences.modelConfigs[modelId],
      ...config
    };
  }

  addTrainingExample(modelId: string, input: string, output: string, context?: string): void {
    if (!this.preferences.modelConfigs[modelId]) {
      this.updateModelConfig(modelId, {});
    }
    this.preferences.modelConfigs[modelId].trainingExamples.push({
      input,
      output,
      context
    });
  }

  getAvailableModels(): string[] {
    return Object.keys(this.preferences.modelConfigs);
  }

  setPreferredModel(modelId: string): void {
    this.preferences.preferredModel = modelId;
  }

  getModelSpecificPrompt(modelId: string, basePrompt: string): string {
    const config = this.getModelConfig(modelId);
    if (!config || !config.systemPromptOverrides) {
      return basePrompt;
    }
    return `${basePrompt}\n\nModel-specific instructions: ${config.systemPromptOverrides}`;
  }
}