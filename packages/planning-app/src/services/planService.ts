import { startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, format } from 'date-fns';
import { DailyPlan, WeeklyPlan, IDailyPlan, IWeeklyPlan, ITask } from '../models/Plan';
import { v4 as uuidv4 } from 'uuid';

export class PlanService {
  // Daily Plan Operations
  async createDailyPlan(date: Date, data: Partial<IDailyPlan>): Promise<IDailyPlan> {
    const normalizedDate = startOfDay(date);
    
    const dailyPlan = new DailyPlan({
      date: normalizedDate,
      title: data.title || `Plan for ${format(normalizedDate, 'EEEE, MMMM d')}`,
      goals: data.goals || [],
      tasks: data.tasks || [],
      notes: data.notes,
      mood: data.mood,
      energyLevel: data.energyLevel,
      reflections: data.reflections
    });

    return await dailyPlan.save();
  }

  async getDailyPlan(date: Date): Promise<IDailyPlan | null> {
    const normalizedDate = startOfDay(date);
    return await DailyPlan.findOne({ date: normalizedDate });
  }

  async updateDailyPlan(date: Date, updates: Partial<IDailyPlan>): Promise<IDailyPlan | null> {
    const normalizedDate = startOfDay(date);
    return await DailyPlan.findOneAndUpdate(
      { date: normalizedDate },
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true }
    );
  }

  async deleteDailyPlan(date: Date): Promise<boolean> {
    const normalizedDate = startOfDay(date);
    const result = await DailyPlan.deleteOne({ date: normalizedDate });
    return result.deletedCount > 0;
  }

  // Task Operations
  async addTask(date: Date, taskData: Omit<ITask, 'id' | 'createdAt'>): Promise<IDailyPlan | null> {
    const task: ITask = {
      id: uuidv4(),
      ...taskData,
      createdAt: new Date()
    };

    const normalizedDate = startOfDay(date);
    return await DailyPlan.findOneAndUpdate(
      { date: normalizedDate },
      { $push: { tasks: task }, updatedAt: new Date() },
      { new: true, upsert: true }
    );
  }

  async updateTask(date: Date, taskId: string, updates: Partial<ITask>): Promise<IDailyPlan | null> {
    const normalizedDate = startOfDay(date);
    
    // If marking as completed, set completedAt timestamp
    if (updates.completed && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    return await DailyPlan.findOneAndUpdate(
      { date: normalizedDate, 'tasks.id': taskId },
      { 
        $set: Object.keys(updates).reduce((acc, key) => {
          acc[`tasks.$.${key}`] = updates[key as keyof ITask];
          return acc;
        }, {} as any),
        updatedAt: new Date()
      },
      { new: true }
    );
  }

  async removeTask(date: Date, taskId: string): Promise<IDailyPlan | null> {
    const normalizedDate = startOfDay(date);
    return await DailyPlan.findOneAndUpdate(
      { date: normalizedDate },
      { $pull: { tasks: { id: taskId } }, updatedAt: new Date() },
      { new: true }
    );
  }

  // Weekly Plan Operations
  async createWeeklyPlan(weekStartDate: Date, data: Partial<IWeeklyPlan>): Promise<IWeeklyPlan> {
    const normalizedWeekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday

    const weeklyPlan = new WeeklyPlan({
      weekStartDate: normalizedWeekStart,
      title: data.title || `Week of ${format(normalizedWeekStart, 'MMMM d')}`,
      weeklyGoals: data.weeklyGoals || [],
      focusAreas: data.focusAreas || [],
      dailyPlans: data.dailyPlans || [],
      weeklyReflection: data.weeklyReflection,
      accomplishments: data.accomplishments || [],
      challengesFaced: data.challengesFaced || [],
      nextWeekPreparation: data.nextWeekPreparation
    });

    return await weeklyPlan.save();
  }

  async getWeeklyPlan(date: Date): Promise<IWeeklyPlan | null> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return await WeeklyPlan.findOne({ weekStartDate: weekStart }).populate('dailyPlans');
  }

  async updateWeeklyPlan(date: Date, updates: Partial<IWeeklyPlan>): Promise<IWeeklyPlan | null> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    return await WeeklyPlan.findOneAndUpdate(
      { weekStartDate: weekStart },
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true }
    );
  }

  // Utility Methods
  async getPlansForDateRange(startDate: Date, endDate: Date): Promise<IDailyPlan[]> {
    return await DailyPlan.find({
      date: {
        $gte: startOfDay(startDate),
        $lte: endOfDay(endDate)
      }
    }).sort({ date: 1 });
  }

  async getTasksByStatus(date: Date, completed: boolean): Promise<ITask[]> {
    const plan = await this.getDailyPlan(date);
    return plan ? plan.tasks.filter(task => task.completed === completed) : [];
  }

  async getWeeklyStats(date: Date): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalGoals: number;
    dailyPlansCreated: number;
  }> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    
    const dailyPlans = await this.getPlansForDateRange(weekStart, weekEnd);
    
    const totalTasks = dailyPlans.reduce((sum, plan) => sum + plan.tasks.length, 0);
    const completedTasks = dailyPlans.reduce((sum, plan) => 
      sum + plan.tasks.filter(task => task.completed).length, 0
    );
    const totalGoals = dailyPlans.reduce((sum, plan) => sum + plan.goals.length, 0);

    return {
      totalTasks,
      completedTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalGoals,
      dailyPlansCreated: dailyPlans.length
    };
  }
}