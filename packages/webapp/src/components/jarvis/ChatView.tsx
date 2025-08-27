'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Send, Copy, Check, User, Bot } from "lucide-react"

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

interface ChatViewProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
}

export function ChatView({ messages, onSendMessage, isLoading }: ChatViewProps) {
  const [inputValue, setInputValue] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
    // Allow Shift+Enter for new lines - do nothing, let default behavior handle it
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

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="bg-accent/20 rounded-full p-8 mb-6">
              <Bot className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              How can I help you today?
            </h2>
            <p className="text-muted-foreground max-w-md">
              Ask me to create tasks, manage your schedule, play music, start a pomodoro session, or anything else you need help with.
            </p>
            <div className="flex flex-wrap gap-2 mt-6">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setInputValue('Create 3 tasks for today')}
                className="text-xs"
              >
                Create tasks
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setInputValue('Start a 25-minute pomodoro session')}
                className="text-xs"
              >
                Start pomodoro
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setInputValue('What can you help me with?')}
                className="text-xs"
              >
                Show capabilities
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`group max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl transition-all ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    }`}
                  >
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className={`text-xs opacity-70 ${
                        msg.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.model && (
                          <span className="ml-2">• {msg.model}</span>
                        )}
                      </div>
                      <Button
                        onClick={() => handleCopyMessage(msg.content, idx)}
                        variant="ghost"
                        size="sm"
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6 ${
                          msg.role === 'user' 
                            ? 'text-primary-foreground hover:bg-primary-foreground/20' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        {copiedMessageId === idx ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="bg-accent px-4 py-3 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">Jarvis is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-6">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to Jarvis..."
            disabled={isLoading}
            className="w-full h-20 px-6 py-4 pr-14 bg-background border border-border text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-2xl resize-none"
          />
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-primary hover:bg-primary/80 text-primary-foreground rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <div className="text-center mt-3">
          <p className="text-xs text-muted-foreground">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}