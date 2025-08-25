'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { io, Socket } from 'socket.io-client'

interface Task {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface TodayPlan {
  date: string
  goals: string[]
  tasks: Task[]
}

export default function PlanningClient() {
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')

  useEffect(() => {
    fetchTodayPlan()
    
    // Connect to Socket.IO server for real-time updates
    const socketInstance = io('http://localhost:7777')
    setSocket(socketInstance)
    
    socketInstance.on('connect', () => {
      console.log('🔌 Connected to planning updates server')
    })
    
    // Listen for planning updates from Jarvis
    socketInstance.on('planning_updated', (data) => {
      console.log('📡 Received planning update:', data)
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

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    try {
      const response = await fetch('/api/plans/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          title: newTaskTitle,
          description: newTaskDescription,
          priority: newTaskPriority
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTodayPlan(prev => prev ? {
          ...prev,
          tasks: [...prev.tasks, data.task]
        } : null)
        setNewTaskTitle('')
        setNewTaskDescription('')
        setNewTaskPriority('medium')
      }
    } catch (error) {
      console.error('Failed to add task:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-cyan-400">Loading...</div>
      </div>
    )
  }

  if (!todayPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-red-400">Failed to load planning data</div>
      </div>
    )
  }

  const totalTasks = todayPlan.tasks.length
  const completedTasks = todayPlan.tasks.filter(t => t.completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-cyan-400">Today's Planning</h1>
          <div className="text-cyan-300">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-cyan-500/20">
            <div className="text-2xl font-bold text-cyan-400">{totalTasks}</div>
            <div className="text-sm text-gray-400">Total Tasks</div>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-cyan-500/20">
            <div className="text-2xl font-bold text-green-400">{completedTasks}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-cyan-500/20">
            <div className="text-2xl font-bold text-yellow-400">{totalTasks - completedTasks}</div>
            <div className="text-sm text-gray-400">Remaining</div>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-cyan-500/20">
            <div className="text-2xl font-bold text-cyan-400">{completionRate}%</div>
            <div className="text-sm text-gray-400">Progress</div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-cyan-400">Tasks</h2>
          
          {/* Add Task Form */}
          <form onSubmit={addTask} className="bg-gray-800/30 p-4 rounded-lg border border-cyan-500/20">
            <div className="space-y-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title..."
                className="w-full px-3 py-2 bg-gray-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="flex-1 px-3 py-2 bg-gray-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="px-3 py-2 bg-gray-900/50 border border-cyan-500/30 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                Add Task
              </Button>
            </div>
          </form>

          {todayPlan.tasks.map((task) => (
            <div key={task.id} className="bg-gray-800/30 p-4 rounded-lg border border-cyan-500/20">
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded border-2 mt-0.5 ${
                  task.completed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-cyan-500'
                }`}>
                  {task.completed && (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    task.completed ? 'text-green-400 line-through' : 'text-white'
                  }`}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-gray-400 mt-1">{task.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'high' 
                        ? 'bg-red-500/20 text-red-400' 
                        : task.priority === 'medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}