import { NextRequest, NextResponse } from 'next/server';

interface Plan {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  planId?: string;
  createdAt: string;
}

// Simple in-memory storage for now (you can replace with database later)
const plans: Plan[] = [];
const tasks: Task[] = [];

export async function GET() {
  return NextResponse.json({ plans, tasks });
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  const newPlan = {
    id: Date.now().toString(),
    ...data,
    createdAt: new Date().toISOString()
  };
  plans.push(newPlan);
  return NextResponse.json(newPlan);
}