'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, Trash2, Send, Copy, Check } from "lucide-react"

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
  onSendMessage?: (message: string) => Promise<void>
  isLoading?: boolean
}

export function ChatHistory({ isVisible, onClose, messages, onClearHistory, onSendMessage, isLoading = false }: ChatHistoryProps) {
  const [inputValue, setInputValue] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isVisible) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isVisible])

  // Focus input when visible
  useEffect(() => {
    if (isVisible && inputRef.current && onSendMessage) {
      inputRef.current.focus()
    }
  }, [isVisible, onSendMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || !onSendMessage) return

    const message = inputValue.trim()
    setInputValue('')
    
    try {
      await onSendMessage(message)
    } catch (error) {
      console.error('Failed to send message:', error)
      // Re-populate input on error
      setInputValue(message)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleCopyMessage = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageIndex)
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

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
      
      <div className="overflow-y-auto h-full pb-24">
        {messages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="text-sm">No conversation history yet</div>
            <div className="text-xs mt-1">{onSendMessage ? 'Type a message or start a voice chat' : 'Start a voice chat to see messages here'}</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`p-4 group hover:bg-opacity-80 transition-all ${msg.role === 'user' ? 'bg-primary/10 border-l-2 border-primary' : 'bg-accent/30 border-l-2 border-primary'}`}>
              <div className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-primary' : 'bg-primary'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">
                        {msg.role === 'user' ? 'You' : 'Jarvis'}
                      </span>
                      <span className="text-muted-foreground opacity-70">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <Button
                      onClick={() => handleCopyMessage(msg.content, idx)}
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 text-muted-foreground hover:text-foreground"
                    >
                      {copiedMessageId === idx ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
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
        
        {isLoading && (
          <div className="p-4 bg-accent/30 border-l-2 border-primary">
            <div className="flex items-start space-x-3">
              <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0 bg-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium mb-1">
                  <span className="text-primary">Jarvis</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-xs">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Chat Input - only show if onSendMessage is provided */}
      {onSendMessage && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-popover/95 backdrop-blur-sm border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message to Jarvis..."
              disabled={isLoading}
              className="flex-1 bg-background/50 border-border text-foreground placeholder-muted-foreground focus:border-primary"
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-primary hover:bg-primary/80 text-primary-foreground px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}