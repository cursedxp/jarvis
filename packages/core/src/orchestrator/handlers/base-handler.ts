import { Command } from '../orchestrator';

export abstract class BaseHandler {
  abstract getHandlerName(): string;
  abstract getCommands(): string[];
  abstract handle(command: Command): Promise<any>;
  
  protected validateCommand(command: Command, expectedType: string): void {
    if (command.type !== expectedType) {
      throw new Error(`Invalid command type: expected ${expectedType}, got ${command.type}`);
    }
  }
  
  protected createSuccessResponse(type: string, data: any, message?: string): any {
    return {
      type,
      success: true,
      data,
      message: message || 'Command executed successfully',
      timestamp: new Date().toISOString()
    };
  }
  
  protected createErrorResponse(type: string, error: string, details?: any): any {
    return {
      type,
      success: false,
      error,
      details,
      timestamp: new Date().toISOString()
    };
  }
}