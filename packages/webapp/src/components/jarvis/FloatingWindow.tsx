'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"

interface FloatingWindowProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  defaultX?: number
  defaultY?: number
  zIndex?: number
  onFocus?: () => void
}

export function FloatingWindow({
  isOpen,
  onClose,
  title,
  children,
  defaultWidth = 400,
  defaultHeight = 600,
  defaultX,
  defaultY,
  zIndex = 40,
  onFocus
}: FloatingWindowProps) {
  // console.log(`🪟 FloatingWindow '${title}' - isOpen:`, isOpen, 'zIndex:', zIndex)
  const [position, setPosition] = useState({ 
    x: defaultX ?? 0, 
    y: defaultY ?? 0
  })
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight })
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isInitialized, setIsInitialized] = useState(false)
  const windowRef = useRef<HTMLDivElement>(null)

  // Initialize position on client side
  useEffect(() => {
    if (!isInitialized && typeof window !== 'undefined') {
      setPosition({
        x: defaultX ?? (typeof window !== 'undefined' ? window.innerWidth - defaultWidth - 24 : 0),
        y: defaultY ?? (typeof window !== 'undefined' ? window.innerHeight - defaultHeight - 100 : 0)
      })
      setIsInitialized(true)
    }
  }, [isInitialized, defaultX, defaultY, defaultWidth, defaultHeight])

  useEffect(() => {
    if (!isOpen) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && typeof window !== 'undefined') {
        setPosition({
          x: Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) - size.width, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - size.height, e.clientY - dragOffset.y))
        })
      }
      
      if (isResizing && typeof window !== 'undefined') {
        const newWidth = Math.max(350, Math.min((typeof window !== 'undefined' ? window.innerWidth : 1200) * 0.9, e.clientX - position.x + 10))
        const newHeight = Math.max(400, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.9, e.clientY - position.y + 10))
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
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, dragOffset, position, size])

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = windowRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setIsDragging(true)
    }
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
  }

  if (!isOpen) return null

  return (
    <div
      ref={windowRef}
      className="fixed bg-popover border border-border rounded-xl shadow-2xl flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: zIndex
      }}
      onClick={onFocus}
    >
      {/* Header - Draggable */}
      <div 
        className="flex items-center justify-between p-3 border-b border-border bg-card/50 cursor-move select-none"
        onMouseDown={handleMouseDown}
      >
        <h2 className="text-foreground font-semibold text-sm">{title}</h2>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent p-1 h-6 w-6"
        >
          ×
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-full h-full text-cyan-500/30" viewBox="0 0 16 16">
          <path 
            fill="currentColor" 
            d="M 12,12 L 12,16 L 16,16 L 16,12 Z M 8,16 L 12,16 L 12,12 Z M 16,8 L 16,12 L 12,12 Z"
          />
        </svg>
      </div>
    </div>
  )
}