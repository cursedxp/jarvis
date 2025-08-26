'use client'

import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { KanbanBoard } from '../planning/components/KanbanBoard'

interface Task {
  id: string
  title: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface TodayPlan {
  date: string
  goals: string[]
  tasks: Task[]
}

export default function KanbanClient() {
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    fetchTodayPlan()
    
    // Connect to Socket.IO server for real-time updates
    const socketInstance = io('http://localhost:7777')
    setSocket(socketInstance)
    
    socketInstance.on('connect', () => {
      console.log('🔌 Connected to Kanban updates server')
    })
    
    // Listen for planning updates from Jarvis
    socketInstance.on('planning_updated', (data) => {
      console.log('📡 Received planning update in Kanban:', data)
      fetchTodayPlan() // Refresh data when any planning action occurs
    })
    
    return () => {
      socketInstance.disconnect()
    }
  }, [])

  const fetchTodayPlan = async () => {
    try {
      const response = await fetch('/api/plans/today')
      const data = await response.json()
      setTodayPlan(data)
    } catch (error) {
      console.error('Failed to fetch today\'s plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      const response = await fetch('/api/plans/today', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          completed: newStatus === 'done'
        })
      })

      if (response.ok) {
        setTodayPlan(prev => prev ? {
          ...prev,
          tasks: prev.tasks.map(task => 
            task.id === taskId 
              ? { ...task, status: newStatus, completed: newStatus === 'done' } 
              : task
          )
        } : null)
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const handleEditTask = (task: Task) => {
    // For now, just log - could implement edit modal later
    console.log('Edit task:', task)
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return

    try {
      const response = await fetch(`/api/plans/today?taskId=${taskId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setTodayPlan(prev => prev ? {
          ...prev,
          tasks: prev.tasks.filter(task => task.id !== taskId)
        } : null)
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading Kanban Board...</div>
      </div>
    )
  }

  if (!todayPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-red-400">Failed to load tasks</div>
      </div>
    )
  }

  const totalTasks = todayPlan.tasks.length
  const todoTasks = todayPlan.tasks.filter(t => t.status === 'todo').length
  const inProgressTasks = todayPlan.tasks.filter(t => t.status === 'in-progress').length
  const doneTasks = todayPlan.tasks.filter(t => t.status === 'done').length

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">Kanban Board</h1>
            <div className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-card/50 p-3 rounded-lg text-center border border-border">
              <div className="text-xl font-bold text-foreground">{totalTasks}</div>
              <div className="text-xs text-gray-400">Total Tasks</div>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg text-center border border-blue-500/30">
              <div className="text-xl font-bold text-blue-400">{todoTasks}</div>
              <div className="text-xs text-gray-400">To Do</div>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg text-center border border-yellow-500/30">
              <div className="text-xl font-bold text-yellow-400">{inProgressTasks}</div>
              <div className="text-xs text-gray-400">In Progress</div>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg text-center border border-green-500/30">
              <div className="text-xl font-bold text-green-400">{doneTasks}</div>
              <div className="text-xs text-gray-400">Done</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Drag & Drop Kanban</span>
            </div>
            <p className="text-blue-300/80 text-sm">
              Drag tasks between columns or use voice commands: &ldquo;move task [name] to [status]&rdquo;
            </p>
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          tasks={todayPlan.tasks}
          onTaskStatusChange={handleTaskStatusChange}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>
    </div>
  )
}