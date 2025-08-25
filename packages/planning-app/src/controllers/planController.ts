import { Request, Response } from 'express';
import { PlanService } from '../services/planService';
import { z } from 'zod';
import { parseISO, isValid } from 'date-fns';

const planService = new PlanService();

// Validation schemas
const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  estimatedDuration: z.number().optional(),
  tags: z.array(z.string()).optional()
});

const dailyPlanSchema = z.object({
  title: z.string().optional(),
  goals: z.array(z.string()).optional(),
  tasks: z.array(taskSchema).optional(),
  notes: z.string().optional(),
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  reflections: z.string().optional()
});

const weeklyPlanSchema = z.object({
  title: z.string().optional(),
  weeklyGoals: z.array(z.string()).optional(),
  focusAreas: z.array(z.string()).optional(),
  weeklyReflection: z.string().optional(),
  accomplishments: z.array(z.string()).optional(),
  challengesFaced: z.array(z.string()).optional(),
  nextWeekPreparation: z.string().optional()
});

// Utility function to parse and validate date
const parseDate = (dateStr: string): Date | null => {
  const date = parseISO(dateStr);
  return isValid(date) ? date : null;
};

export class PlanController {
  // Daily Plan endpoints
  async createDailyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const validatedData = dailyPlanSchema.parse(req.body);
      const plan = await planService.createDailyPlan(parsedDate, validatedData);
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Error creating daily plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getDailyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const plan = await planService.getDailyPlan(parsedDate);
      
      if (!plan) {
        return res.status(404).json({ error: 'Daily plan not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error getting daily plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateDailyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const validatedData = dailyPlanSchema.parse(req.body);
      const plan = await planService.updateDailyPlan(parsedDate, validatedData);
      
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Error updating daily plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteDailyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const deleted = await planService.deleteDailyPlan(parsedDate);
      
      if (!deleted) {
        return res.status(404).json({ error: 'Daily plan not found' });
      }

      res.json({ message: 'Daily plan deleted successfully' });
    } catch (error) {
      console.error('Error deleting daily plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Task endpoints
  async addTask(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const validatedTask = taskSchema.parse(req.body);
      const plan = await planService.addTask(parsedDate, {
        ...validatedTask,
        completed: false
      });
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Error adding task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const { date, taskId } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const plan = await planService.updateTask(parsedDate, taskId, req.body);
      
      if (!plan) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async removeTask(req: Request, res: Response) {
    try {
      const { date, taskId } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const plan = await planService.removeTask(parsedDate, taskId);
      
      if (!plan) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error removing task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Weekly Plan endpoints
  async createWeeklyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const validatedData = weeklyPlanSchema.parse(req.body);
      const plan = await planService.createWeeklyPlan(parsedDate, validatedData);
      
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Error creating weekly plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getWeeklyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const plan = await planService.getWeeklyPlan(parsedDate);
      
      if (!plan) {
        return res.status(404).json({ error: 'Weekly plan not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error getting weekly plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateWeeklyPlan(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const validatedData = weeklyPlanSchema.parse(req.body);
      const plan = await planService.updateWeeklyPlan(parsedDate, validatedData);
      
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      console.error('Error updating weekly plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Utility endpoints
  async getWeeklyStats(req: Request, res: Response) {
    try {
      const { date } = req.params;
      const parsedDate = parseDate(date);
      
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }

      const stats = await planService.getWeeklyStats(parsedDate);
      res.json(stats);
    } catch (error) {
      console.error('Error getting weekly stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTodaysPlan(req: Request, res: Response) {
    try {
      const today = new Date();
      const plan = await planService.getDailyPlan(today);
      
      if (!plan) {
        return res.status(404).json({ error: 'No plan found for today' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error getting today\'s plan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}