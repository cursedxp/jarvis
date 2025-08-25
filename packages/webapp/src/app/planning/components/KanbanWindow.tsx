import React, { useState, useRef, useEffect } from 'react'
import { KanbanBoard } from './KanbanBoard'

interface Task {
  id: string
  title: string
  completed: boolean
  status: 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  description?: string
}

interface KanbanWindowProps {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  onTaskStatusChange: (taskId: string, newStatus: 'todo' | 'in-progress' | 'done') => void
  onEditTask: (task: Task) => void
  onDeleteTask: (taskId: string) => void
}

export function KanbanWindow({
  isOpen,
  onClose,
  tasks,
  onTaskStatusChange,
  onEditTask,
  onDeleteTask
}: KanbanWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 1200, height: 800 })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const windowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: Math.max(0, e.clientY - dragStart.y)
        })
      } else if (isResizing) {
        const newWidth = Math.max(800, resizeStart.width + (e.clientX - resizeStart.x))
        const newHeight = Math.max(600, resizeStart.height + (e.clientY - resizeStart.y))
        setSize({ width: newWidth, height: newHeight })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeStart])

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    if (isMaximized) return
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    })
  }

  const handleMaximize = () => {
    setIsMaximized(!isMaximized)
  }

  const handleMinimize = () => {
    setIsMinimized(true)
  }

  if (!isOpen && !isMinimized) return null

  // Minimized state - show taskbar item
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-lg border border-cyan-500/50 flex items-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2" />
          </svg>
          Kanban Board
          <span className="bg-cyan-500/30 px-2 py-1 rounded text-xs">
            {tasks.length}
          </span>
        </button>
      </div>
    )
  }

  const windowStyle = isMaximized 
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000
      }
    : {
        position: 'fixed' as const,
        top: position.y,
        left: position.x,
        width: size.width,
        height: size.height,
        zIndex: 1000
      }

  return (
    <>
      {/* Backdrop */}
      {isMaximized && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
      )}
      
      {/* Window */}
      <div
        ref={windowRef}
        style={windowStyle}
        className="bg-gray-900 border border-cyan-500/30 rounded-lg shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
      >
        {/* Title Bar */}
        <div
          onMouseDown={handleDragStart}
          className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/30 px-4 py-3 flex items-center justify-between cursor-move select-none"
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2" />
            </svg>
            <h2 className="text-foreground font-semibold text-lg">Kanban Board</h2>
            <span className="bg-cyan-500/20 text-muted-foreground px-2 py-1 rounded text-sm">
              {tasks.length} tasks
            </span>
          </div>
          
          {/* Window Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleMinimize}
              className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/50 flex items-center justify-center transition-colors"
              title="Minimize"
            >
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleMaximize}
              className="w-8 h-8 rounded-full bg-green-500/20 hover:bg-green-500/40 border border-green-500/50 flex items-center justify-center transition-colors"
              title={isMaximized ? "Restore" : "Maximize"}
            >
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMaximized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12v12H8z M4 3h12v12H4z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16v12H4z" />
                )}
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 flex items-center justify-center transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 bg-background overflow-auto">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Drag & Drop Kanban</span>
            </div>
            <p className="text-blue-300/80 text-sm mt-2">
              Drag tasks between columns or use voice commands: "move task [name] to [status]"
            </p>
          </div>

          <KanbanBoard
            tasks={tasks}
            onTaskStatusChange={onTaskStatusChange}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        </div>

        {/* Resize Handle */}
        {!isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
          >
            <svg className="w-full h-full text-cyan-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        )}
      </div>
    </>
  )
}