'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, Trash2 } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

interface ChatHistoryProps {
  isVisible: boolean
  onClose: () => void
  messages: Message[]
  onClearHistory: () => void
}

export function ChatHistory({ isVisible, onClose, messages, onClearHistory }: ChatHistoryProps) {
  if (!isVisible) return null

  return (
    <div className="fixed left-0 top-0 h-full bg-popover/95 backdrop-blur-sm border-r border-border transition-transform duration-300 z-40 w-96 rounded-r-xl">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-foreground font-semibold text-lg">Chat History</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClearHistory}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-y-auto h-full pb-20">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-sm">No conversation history yet</div>
            <div className="text-xs mt-1">Start a voice chat to see messages here</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`p-4 ${msg.role === 'user' ? 'bg-primary/10 border-l-2 border-primary' : 'bg-accent/30 border-l-2 border-primary'}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary' : 'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium mb-1 flex items-center gap-2">
                    <span className="text-primary">
                      {msg.role === 'user' ? 'You' : 'Jarvis'}
                    </span>
                    <span className="text-muted-foreground opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-foreground text-sm leading-relaxed">{msg.content}</div>
                  {msg.model && (
                    <div className="text-xs text-muted-foreground mt-1 opacity-60">
                      Model: {msg.model}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}