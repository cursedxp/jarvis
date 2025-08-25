import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanTaskCard } from './KanbanTaskCard'

interface Task {
  id: string
  title: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

const columnStyles = {
  todo: {
    header: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    content: 'border-blue-500/20'
  },
  'in-progress': {
    header: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    content: 'border-yellow-500/20'
  },
  done: {
    header: 'bg-green-500/20 text-green-400 border-green-500/30',
    content: 'border-green-500/20'
  }
}

export function KanbanColumn({ id, title, tasks, onEditTask, onDeleteTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  const style = columnStyles[id as keyof typeof columnStyles] || columnStyles.todo

  return (
    <div className="flex-1 min-w-72 lg:min-w-80">
      {/* Column Header */}
      <div className={`p-3 rounded-t-lg border ${style.header} font-medium text-sm flex items-center justify-between`}>
        <span>{title}</span>
        <span className="bg-black/20 px-2 py-1 rounded text-xs">
          {tasks.length}
        </span>
      </div>
      
      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={`min-h-80 lg:min-h-96 p-3 rounded-b-lg border-x border-b ${style.content} transition-colors ${
          isOver ? 'bg-cyan-500/10' : 'bg-gray-900/30'
        }`}
      >
        <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {tasks.map((task) => (
              <KanbanTaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-gray-500 text-center py-8 text-sm">
                No tasks in {title.toLowerCase()}
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}