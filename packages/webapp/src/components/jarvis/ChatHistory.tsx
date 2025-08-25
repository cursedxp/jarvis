'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, Trash2 } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
    <div className="fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-cyan-500/20 transition-transform duration-300 z-40 w-96">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-cyan-400 font-semibold text-lg">Chat History</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={onClearHistory}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-400 hover:bg-red-500/10 cursor-pointer p-2"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-y-auto h-full pb-20">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-sm">No conversation history yet</div>
            <div className="text-xs mt-1">Start a voice chat to see messages here</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`p-4 ${msg.role === 'user' ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'bg-gray-800/30 border-l-2 border-cyan-500'}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-cyan-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium mb-1 flex items-center gap-2">
                    <span className={msg.role === 'user' ? 'text-blue-400' : 'text-cyan-400'}>
                      {msg.role === 'user' ? 'You' : 'Jarvis'}
                    </span>
                    <span className="text-gray-500 opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-white/90 text-sm leading-relaxed">{msg.content}</div>
                  {msg.model && (
                    <div className="text-xs text-gray-500 mt-1 opacity-60">
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