import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { startOfDay } from 'date-fns';

// Import the proper database models and services
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jarvis-planning';

// Initialize MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  try {
    await mongoose.connect(mongoUri);
    isConnected = true;
    console.log('✅ Connected to MongoDB for planning API');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

// Define schemas inline for now (should be imported from planning-app package)
const TaskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
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

// Create or get the model
const DailyPlan = mongoose.models.DailyPlan || mongoose.model('DailyPlan', DailyPlanSchema);

export async function GET() {
  try {
    await connectDB();
    
    const today = startOfDay(new Date());
    let todayPlan = await DailyPlan.findOne({ date: today });
    
    // If no plan exists for today, create a default one
    if (!todayPlan) {
      todayPlan = await DailyPlan.create({
        date: today,
        goals: [],
        tasks: []
      });
    }
    
    // Format response to match the frontend expectations
    const response = {
      date: today.toISOString().split('T')[0],
      goals: todayPlan.goals || [],
      tasks: (todayPlan.tasks || []).map(task => ({
        id: task.id,
        title: task.title,
        completed: task.completed,
        priority: task.priority || 'medium',
        description: task.description || ''
      }))
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching today\'s plan:', error);
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    const today = startOfDay(new Date());
    
    if (data.type === 'task') {
      const newTask = {
        id: Date.now().toString(),
        title: data.title,
        completed: false,
        priority: data.priority || 'medium',
        description: data.description || '',
        createdAt: new Date()
      };
      
      // Find or create today's plan and add the task
      const result = await DailyPlan.findOneAndUpdate(
        { date: today },
        { 
          $push: { tasks: newTask },
          $set: { updatedAt: new Date() }
        },
        { new: true, upsert: true }
      );
      
      return NextResponse.json({ success: true, task: newTask });
    }
    
    if (data.type === 'goal') {
      // Add goal to today's plan
      await DailyPlan.findOneAndUpdate(
        { date: today },
        { 
          $push: { goals: data.goal },
          $set: { updatedAt: new Date() }
        },
        { upsert: true }
      );
      
      return NextResponse.json({ success: true, goal: data.goal });
    }

    return NextResponse.json({ success: false, error: 'Invalid request' });
  } catch (error) {
    console.error('Error creating task/goal:', error);
    return NextResponse.json({ success: false, error: 'Failed to create item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const data = await request.json();
    const today = startOfDay(new Date());
    
    if (data.taskId) {
      // Update task in today's plan
      const result = await DailyPlan.findOneAndUpdate(
        { date: today, 'tasks.id': data.taskId },
        { 
          $set: {
            'tasks.$.completed': data.completed ?? undefined,
            'tasks.$.title': data.title ?? undefined,
            'tasks.$.completedAt': data.completed ? new Date() : undefined,
            updatedAt: new Date()
          }
        },
        { new: true }
      );
      
      if (result) {
        const updatedTask = result.tasks.find(t => t.id === data.taskId);
        return NextResponse.json({ success: true, task: updatedTask });
      } else {
        return NextResponse.json({ success: false, error: 'Task not found' });
      }
    }
    
    return NextResponse.json({ success: false, error: 'Task ID required' });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}