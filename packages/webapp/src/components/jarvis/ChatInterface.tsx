'use client'

import { Button } from '@/components/ui/button'
import { ChatView } from './ChatView'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
  onToggleChatMode: () => void
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  onToggleChatMode,
}: ChatInterfaceProps) {
  return (
    <div className="absolute inset-0 z-20 bg-background">
      <div className="relative h-full">
        {/* Header with mode toggle */}
        <div className="absolute top-6 right-6 z-30">
          <Button
            onClick={onToggleChatMode}
            variant="outline"
            size="sm"
            className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer"
          >
            Back to Voice
          </Button>
        </div>

        {/* Chat Interface */}
        <ChatView
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}