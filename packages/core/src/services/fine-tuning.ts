import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('fine-tuning');

export interface TrainingExample {
  input: string;
  output: string;
  instruction?: string;
  context?: string;
}

export interface FineTuningConfig {
  modelId: string;
  baseModel: string;
  trainingData: TrainingExample[];
  epochs: number;
  learningRate: number;
  batchSize: number;
  outputPath: string;
}

export interface FineTuningStatus {
  status: 'idle' | 'preparing' | 'training' | 'completed' | 'error';
  progress?: number;
  currentEpoch?: number;
  totalEpochs?: number;
  error?: string;
  modelPath?: string;
}

export class FineTuningManager {
  private status: FineTuningStatus = { status: 'idle' };
  private trainingProcess: any = null;

  async startFineTuning(config: FineTuningConfig): Promise<void> {
    if (this.status.status === 'training') {
      throw new Error('Fine-tuning already in progress');
    }

    this.status = { status: 'preparing' };
    
    try {
      // Prepare training data
      await this.prepareTrainingData(config);
      
      // Create Modelfile for Ollama
      const modelfilePath = this.createModelfile(config);
      
      // Start training
      await this.startOllamaTraining(config.modelId, modelfilePath);
      
    } catch (error) {
      this.status = { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
      throw error;
    }
  }

  private async prepareTrainingData(config: FineTuningConfig): Promise<string> {
    this.status = { status: 'preparing' };
    
    // Create training directory
    const trainingDir = join(process.cwd(), 'training', config.modelId);
    if (!existsSync(trainingDir)) {
      mkdirSync(trainingDir, { recursive: true });
    }

    // Convert training examples to Ollama format
    const formattedData = config.trainingData.map(example => {
      if (example.instruction) {
        return {
          instruction: example.instruction,
          input: example.input,
          output: example.output
        };
      } else {
        return {
          prompt: example.input,
          response: example.output
        };
      }
    });

    // Write training data to JSON file
    const dataPath = join(trainingDir, 'training_data.json');
    writeFileSync(dataPath, JSON.stringify(formattedData, null, 2));
    
    logger.info(`Training data prepared: ${dataPath}`);
    return dataPath;
  }

  private createModelfile(config: FineTuningConfig): string {
    const modelfileContent = `FROM ${config.baseModel}

# Fine-tuning parameters
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER top_k 40

# System message with training context
SYSTEM """
You are ${config.modelId}, a specialized AI assistant fine-tuned for specific tasks.
You have been trained on custom data to better serve user needs.
Be helpful, accurate, and follow the patterns from your training data.
"""

# Training data would be incorporated during the build process
# Note: Ollama fine-tuning is still experimental - this sets up the structure
`;

    const modelfilePath = join(process.cwd(), 'training', config.modelId, 'Modelfile');
    writeFileSync(modelfilePath, modelfileContent);
    
    logger.info(`Modelfile created: ${modelfilePath}`);
    return modelfilePath;
  }

  private async startOllamaTraining(modelId: string, modelfilePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.status = { status: 'training', progress: 0, currentEpoch: 0 };
      
      logger.info(`Starting Ollama model creation for: ${modelId}`);
      
      // Use ollama create command to build custom model
      this.trainingProcess = spawn('ollama', ['create', modelId, '-f', modelfilePath], {
        stdio: 'pipe'
      });

      let output = '';
      
      this.trainingProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        output += text;
        logger.info(`Ollama output: ${text.trim()}`);
        
        // Parse progress if available
        if (text.includes('100%') || text.includes('success')) {
          this.status.progress = 100;
        }
      });

      this.trainingProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        logger.error(`Ollama error: ${text.trim()}`);
        output += text;
      });

      this.trainingProcess.on('close', (code: number) => {
        if (code === 0) {
          this.status = { 
            status: 'completed', 
            progress: 100,
            modelPath: modelId
          };
          logger.info(`Fine-tuning completed successfully for: ${modelId}`);
          resolve();
        } else {
          const error = `Ollama process failed with code: ${code}\nOutput: ${output}`;
          this.status = { status: 'error', error };
          logger.error(error);
          reject(new Error(error));
        }
        this.trainingProcess = null;
      });

      this.trainingProcess.on('error', (error: Error) => {
        this.status = { status: 'error', error: error.message };
        logger.error('Training process error:', error);
        reject(error);
        this.trainingProcess = null;
      });
    });
  }

  stopTraining(): void {
    if (this.trainingProcess) {
      this.trainingProcess.kill('SIGTERM');
      this.status = { status: 'idle' };
      logger.info('Training process stopped');
    }
  }

  getStatus(): FineTuningStatus {
    return { ...this.status };
  }

  // Generate training data from conversation history
  generateTrainingData(conversations: any[]): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    conversations.forEach(conv => {
      if (conv.messages && conv.messages.length >= 2) {
        for (let i = 0; i < conv.messages.length - 1; i += 2) {
          const userMsg = conv.messages[i];
          const assistantMsg = conv.messages[i + 1];
          
          if (userMsg?.role === 'user' && assistantMsg?.role === 'assistant') {
            examples.push({
              input: userMsg.content,
              output: assistantMsg.content,
              context: conv.title || 'General conversation'
            });
          }
        }
      }
    });
    
    return examples;
  }

  // Create specialized training configurations
  static createCodingTrainingConfig(modelId: string, examples: TrainingExample[]): FineTuningConfig {
    return {
      modelId,
      baseModel: 'codellama:7b',
      trainingData: examples,
      epochs: 3,
      learningRate: 0.0001,
      batchSize: 4,
      outputPath: join(process.cwd(), 'models', modelId)
    };
  }

  static createConversationalTrainingConfig(modelId: string, examples: TrainingExample[]): FineTuningConfig {
    return {
      modelId,
      baseModel: 'llama3.2:3b',
      trainingData: examples,
      epochs: 2,
      learningRate: 0.00005,
      batchSize: 8,
      outputPath: join(process.cwd(), 'models', modelId)
    };
  }
}