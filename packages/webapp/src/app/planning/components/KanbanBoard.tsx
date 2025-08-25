import React from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { KanbanTaskCard } from './KanbanTaskCard'

interface Task {
  id: string
  title: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskStatusChange: (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function KanbanBoard({ tasks, onTaskStatusChange, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = React.useState<Task | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group tasks by status
  const todoTasks = tasks.filter(task => task.status === 'todo')
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress')
  const doneTasks = tasks.filter(task => task.status === 'done')

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Handle drag over for visual feedback
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as 'todo' | 'in-progress' | 'done'
    
    // Find the task being moved
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    // Update the task status
    onTaskStatusChange(taskId, newStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 lg:gap-6 overflow-x-auto pb-4 min-h-[600px]">
        <KanbanColumn
          id="todo"
          title="To Do"
          tasks={todoTasks}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
        <KanbanColumn
          id="in-progress"
          title="In Progress"
          tasks={inProgressTasks}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
        <KanbanColumn
          id="done"
          title="Done"
          tasks={doneTasks}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 opacity-80">
            <KanbanTaskCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}