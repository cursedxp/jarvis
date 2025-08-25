import { format } from 'date-fns';

interface PlanningTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  tags?: string[];
}

interface DailyPlan {
  date: Date;
  title?: string;
  goals: string[];
  tasks: PlanningTask[];
  notes?: string;
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  energyLevel?: number;
  reflections?: string;
}

interface WeeklyStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalGoals: number;
  dailyPlansCreated: number;
}

export class PlanningIntegration {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api/plans') {
    this.baseUrl = baseUrl;
  }

  // Check if planning service is available
  async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/today`);
      return response.ok;
    } catch {
      return false;
    }
  }

  // Today's plan operations
  async getTodaysPlan(): Promise<DailyPlan | null> {
    try {
      const response = await fetch(`${this.baseUrl}/today`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as DailyPlan;
    } catch (error) {
      console.error('Failed to get today\'s plan:', error);
      return null;
    }
  }

  async createTodaysPlan(data: Partial<DailyPlan>): Promise<DailyPlan | null> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch(`${this.baseUrl}/daily/${today}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as DailyPlan;
    } catch (error) {
      console.error('Failed to create today\'s plan:', error);
      return null;
    }
  }

  // Task operations
  async addTask(task: { title: string; description?: string; priority?: 'low' | 'medium' | 'high' }): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          ...task
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to add task:', error);
      return false;
    }
  }

  async completeTask(taskId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/today`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, completed: true })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to complete task:', error);
      return false;
    }
  }

  // Weekly operations
  async getWeeklyStats(date?: Date): Promise<WeeklyStats | null> {
    try {
      const targetDate = format(date || new Date(), 'yyyy-MM-dd');
      const response = await fetch(`${this.baseUrl}/stats/weekly/${targetDate}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as WeeklyStats;
    } catch (error) {
      console.error('Failed to get weekly stats:', error);
      return null;
    }
  }

  // Voice-friendly responses
  async generateTodaysSummary(): Promise<string> {
    const plan = await this.getTodaysPlan();
    
    if (!plan) {
      return "You don't have a plan set for today yet. Would you like me to help you create one?";
    }

    const totalTasks = plan.tasks.length;
    const completedTasks = plan.tasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    let summary = `Today is ${format(plan.date, 'EEEE, MMMM d')}. `;
    
    if (plan.goals.length > 0) {
      summary += `Your main goals are: ${plan.goals.join(', ')}. `;
    }

    if (totalTasks > 0) {
      summary += `You have ${totalTasks} tasks total. `;
      if (completedTasks > 0) {
        summary += `${completedTasks} completed, `;
      }
      if (pendingTasks > 0) {
        summary += `${pendingTasks} remaining.`;
      }
    } else {
      summary += "No tasks scheduled.";
    }

    return summary;
  }

  async generateWeeklySummary(): Promise<string> {
    const stats = await this.getWeeklyStats();
    
    if (!stats) {
      return "Unable to get weekly statistics right now.";
    }

    let summary = "This week: ";
    
    if (stats.totalTasks > 0) {
      summary += `${stats.completedTasks} of ${stats.totalTasks} tasks completed (${Math.round(stats.completionRate)}% completion rate). `;
    }
    
    if (stats.totalGoals > 0) {
      summary += `${stats.totalGoals} goals set. `;
    }
    
    summary += `${stats.dailyPlansCreated} days planned.`;

    return summary;
  }

  // Simple natural language understanding - let LLM do the heavy lifting
  parseCommand(message: string): { action: string; data: any } | null {
    console.log('🔍 Checking if message relates to planning:', message);
    
    const lowerMessage = message.toLowerCase();
    
    // Simple keyword detection for planning-related requests
    const planningKeywords = [
      'task', 'todo', 'plan', 'schedule', 'goal', 'reminder',
      'add', 'create', 'make', 'set', 'complete', 'finish',
      'today', 'tomorrow', 'week', 'daily'
    ];
    
    const hasplanningKeyword = planningKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasplanningKeyword) {
      console.log('✅ Detected planning-related request, letting LLM handle it');
      return {
        action: 'intelligentPlanningAssistant',
        data: { message: message }
      };
    }

    return null;
  }
}

// Export singleton instance
export const planningService = new PlanningIntegration();