import mongoose, { Schema, Document } from 'mongoose';

export interface ITask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  tags?: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface IDailyPlan extends Document {
  date: Date;
  title?: string;
  goals: string[];
  tasks: ITask[];
  notes?: string;
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  energyLevel?: number; // 1-10
  reflections?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeeklyPlan extends Document {
  weekStartDate: Date; // Monday of the week
  title?: string;
  weeklyGoals: string[];
  focusAreas: string[];
  dailyPlans: mongoose.Types.ObjectId[];
  weeklyReflection?: string;
  accomplishments?: string[];
  challengesFaced?: string[];
  nextWeekPreparation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  completed: { type: Boolean, default: false },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  estimatedDuration: Number,
  actualDuration: Number,
  tags: [String],
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const DailyPlanSchema = new Schema<IDailyPlan>({
  date: { type: Date, required: true, unique: true },
  title: String,
  goals: [String],
  tasks: [TaskSchema],
  notes: String,
  mood: { 
    type: String, 
    enum: ['great', 'good', 'neutral', 'bad', 'terrible'] 
  },
  energyLevel: { type: Number, min: 1, max: 10 },
  reflections: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const WeeklyPlanSchema = new Schema<IWeeklyPlan>({
  weekStartDate: { type: Date, required: true, unique: true },
  title: String,
  weeklyGoals: [String],
  focusAreas: [String],
  dailyPlans: [{ type: Schema.Types.ObjectId, ref: 'DailyPlan' }],
  weeklyReflection: String,
  accomplishments: [String],
  challengesFaced: [String],
  nextWeekPreparation: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better query performance
DailyPlanSchema.index({ date: 1 });
WeeklyPlanSchema.index({ weekStartDate: 1 });

export const DailyPlan = mongoose.model<IDailyPlan>('DailyPlan', DailyPlanSchema);
export const WeeklyPlan = mongoose.model<IWeeklyPlan>('WeeklyPlan', WeeklyPlanSchema);