'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatHistoryProps {
  isVisible: boolean
  onClose: () => void
  messages: Message[]
}

export function ChatHistory({ isVisible, onClose, messages }: ChatHistoryProps) {
  if (!isVisible) return null

  return (
    <div className="fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-cyan-500/20 transition-transform duration-300 z-40 w-96">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-cyan-400 font-semibold text-lg">Chat History</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
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
            <div key={idx} className={`p-4 ${msg.role === 'user' ? 'bg-gray-800/50' : ''}`}>
              <div className="flex items-start space-x-2">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-cyan-500'
                }`} />
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    {msg.role === 'user' ? 'You' : 'Jarvis'}
                    <span className="ml-2 opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-white/90 text-sm">{msg.content}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}