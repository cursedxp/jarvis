import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory storage for now (you can replace with database later)
let plans: any[] = [];
let tasks: any[] = [];

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