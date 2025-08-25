export interface Context {
  workspace?: string;
  currentFile?: string;
  selection?: {
    start: number;
    end: number;
    text: string;
  };
  history?: Array<{
    command: string;
    timestamp: Date;
  }>;
  metadata?: Record<string, any>;
}

export class ContextManager {
  private context: Context = {};
  private history: Array<any> = [];
  
  async getContext(additionalContext?: Partial<Context>): Promise<Context> {
    return {
      ...this.context,
      ...additionalContext,
      history: this.history.slice(-10)
    };
  }
  
  updateContext(updates: Partial<Context>): void {
    this.context = {
      ...this.context,
      ...updates
    };
  }
  
  addToHistory(entry: any): void {
    this.history.push({
      ...entry,
      timestamp: new Date()
    });
    
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }
  
  clearHistory(): void {
    this.history = [];
  }
  
  getHistory(): Array<any> {
    return [...this.history];
  }
}