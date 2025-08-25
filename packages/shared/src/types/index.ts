export interface JarvisCommand {
  id: string;
  type: CommandType;
  payload: any;
  timestamp: Date;
  source: CommandSource;
  context?: CommandContext;
}

export enum CommandType {
  EXPLAIN = 'explain',
  REFACTOR = 'refactor',
  TEST = 'test',
  INSTALL = 'install',
  CHAT = 'chat',
  SWITCH_MODEL = 'switchModel',
  WAKE = 'wake',
  SLEEP = 'sleep'
}

export enum CommandSource {
  VOICE = 'voice',
  VSCODE = 'vscode',
  TRAY = 'tray',
  API = 'api'
}

export interface CommandContext {
  workspace?: string;
  file?: string;
  selection?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
    text: string;
  };
  language?: string;
}

export interface JarvisResponse {
  id: string;
  commandId: string;
  type: ResponseType;
  content: any;
  timestamp: Date;
  duration?: number;
}

export enum ResponseType {
  SUCCESS = 'success',
  ERROR = 'error',
  STREAM = 'stream',
  CONFIRMATION_REQUIRED = 'confirmation_required'
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'local';
  model: string;
  maxTokens?: number;
  temperature?: number;
  apiKey?: string;
}