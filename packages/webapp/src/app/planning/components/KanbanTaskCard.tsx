import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Task {
  id: string
  title: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface KanbanTaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
}

// Helper function to format task creation time
function formatTaskTime(taskId: string): string {
  const timestamp = Number(taskId)
  const date = new Date(timestamp)
  
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  
  if (isToday) {
    return `Today at ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

export function KanbanTaskCard({ task, onEdit, onDelete }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-card/50 p-3 rounded-lg border border-border cursor-grab active:cursor-grabbing hover:border-cyan-500/40 hover:bg-card/70 transition-all duration-200 ${
        isDragging ? 'shadow-lg shadow-cyan-500/25 scale-105 rotate-2' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className={`font-medium text-sm ${
            task.completed ? 'text-green-400 line-through' : 'text-white'
          }`}>
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-gray-400 mt-1">{task.description}</div>
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
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTaskTime(task.id)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(task)
            }}
            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(task.id)
            }}
            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}