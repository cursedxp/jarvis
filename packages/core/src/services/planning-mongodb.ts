import mongoose from 'mongoose';
import { startOfDay } from 'date-fns';

// Use the same MongoDB database as Next.js
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jarvis-planning';

// Initialize MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('✅ Jarvis connected to MongoDB (jarvis-planning database)');
  } catch (error) {
    console.error('❌ Jarvis failed to connect to MongoDB:', error);
    throw error;
  }
}

// Define the exact same schemas as Next.js API
const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'done'],
    default: 'todo'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const DailyPlanSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  title: String,
  goals: [String],
  tasks: [TaskSchema],
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create or get the model (same as Next.js)
const DailyPlan = mongoose.models.DailyPlan || mongoose.model('DailyPlan', DailyPlanSchema);

export interface PlanningTask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

export interface DailyPlan {
  date: Date;
  title?: string;
  goals: string[];
  tasks: PlanningTask[];
  notes?: string;
}

export class MongoDBPlanningService {
  async ensureConnection() {
    await connectDB();
  }

  // Get today's plan directly from MongoDB
  async getTodaysPlan(): Promise<DailyPlan | null> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const todayPlan = await DailyPlan.findOne({ date: today });
      
      if (!todayPlan) {
        // Create a default plan if none exists
        const newPlan = await DailyPlan.create({
          date: today,
          goals: [],
          tasks: []
        });
        return {
          date: newPlan.date,
          goals: newPlan.goals || [],
          tasks: (newPlan.tasks || []).map((task: any) => ({
            id: task.id,
            title: task.title,
            completed: task.completed,
            status: task.status || 'todo',
            priority: task.priority || 'medium',
            description: task.description || ''
          }))
        };
      }
      
      return {
        date: todayPlan.date,
        goals: todayPlan.goals || [],
        tasks: (todayPlan.tasks || []).map((task: any) => ({
          id: task.id,
          title: task.title,
          completed: task.completed,
          status: task.status || 'todo',
          priority: task.priority || 'medium',
          description: task.description || ''
        }))
      };
    } catch (error) {
      console.error('Failed to get today\'s plan:', error);
      return null;
    }
  }

  // Add task directly to MongoDB
  async addTask(task: { title: string; description?: string; priority?: 'low' | 'medium' | 'high'; status?: 'todo' | 'in-progress' | 'done' }): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const newTask = {
        id: Date.now().toString(),
        title: task.title,
        completed: false,
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        description: task.description || '',
        createdAt: new Date()
      };
      
      await DailyPlan.findOneAndUpdate(
        { date: today },
        { 
          $push: { tasks: newTask },
          $set: { updatedAt: new Date() }
        },
        { new: true, upsert: true }
      );
      
      console.log(`✅ Added task: "${task.title}"`);
      return true;
    } catch (error) {
      console.error('Failed to add task:', error);
      return false;
    }
  }

  // Delete task directly from MongoDB
  async deleteTask(taskId: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const result = await DailyPlan.findOneAndUpdate(
        { date: today },
        { 
          $pull: { tasks: { id: taskId } },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Deleted task: ${taskId}`);
        return true;
      } else {
        console.log(`❌ Task not found: ${taskId}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      return false;
    }
  }

  // Update task status directly in MongoDB
  async updateTaskStatus(taskId: string, status: 'todo' | 'in-progress' | 'done'): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const updateFields: any = { 
        'tasks.$.status': status,
        updatedAt: new Date()
      };
      
      // If moving to done, mark as completed
      if (status === 'done') {
        updateFields['tasks.$.completed'] = true;
        updateFields['tasks.$.completedAt'] = new Date();
      } else {
        updateFields['tasks.$.completed'] = false;
      }
      
      const result = await DailyPlan.findOneAndUpdate(
        { date: today, 'tasks.id': taskId },
        { $set: updateFields },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Updated task status: ${taskId} -> ${status}`);
        return true;
      } else {
        console.log(`❌ Task not found: ${taskId}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
      return false;
    }
  }

  // Complete task directly in MongoDB
  async completeTask(taskId: string): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const result = await DailyPlan.findOneAndUpdate(
        { date: today, 'tasks.id': taskId },
        { 
          $set: { 
            'tasks.$.completed': true,
            'tasks.$.completedAt': new Date(),
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Completed task: ${taskId}`);
        return true;
      } else {
        console.log(`❌ Task not found: ${taskId}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      return false;
    }
  }

  // Delete all tasks directly from MongoDB
  async deleteAllTasks(): Promise<boolean> {
    try {
      await this.ensureConnection();
      
      const today = startOfDay(new Date());
      const result = await DailyPlan.findOneAndUpdate(
        { date: today },
        { 
          $set: { 
            tasks: [],
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Deleted all tasks`);
        return true;
      } else {
        console.log(`❌ No plan found for today`);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete all tasks:', error);
      return false;
    }
  }
}

// Export singleton instance
export const mongodbPlanningService = new MongoDBPlanningService();