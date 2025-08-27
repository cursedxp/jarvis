'use client'

import { useCallback } from 'react'
import { useJarvisAPI } from '@/hooks/useJarvisAPI'
import { useConversations } from '@/hooks/useConversations'

export interface MessageHandlerProps {
  isAwaitingPomodoroConfirmation: boolean
  setIsAwaitingPomodoroConfirmation: (awaiting: boolean) => void
  speakText: (text: string) => Promise<void>
  setVoiceState: (state: 'idle' | 'listening' | 'processing' | 'speaking') => void
  startAudioLevelSimulation: () => void
  stopAudioLevelSimulation: () => void
  speakTextViaAPI: (text: string) => Promise<{ success: boolean; ttsDuration?: number; error?: string }>
}

export interface MessageHandlerActions {
  handleChatMessage: (message: string) => Promise<void>
  sendMessage: (text: string, isVoiceInput?: boolean) => Promise<void>
}

export function useMessageHandler({
  isAwaitingPomodoroConfirmation,
  setIsAwaitingPomodoroConfirmation,
  speakText,
  setVoiceState,
  startAudioLevelSimulation,
  stopAudioLevelSimulation,
  speakTextViaAPI,
}: MessageHandlerProps): MessageHandlerActions {
  
  const {
    getCurrentMessages,
    createNewConversation,
    addMessageToConversation,
    activeConversation
  } = useConversations()

  const {
    sendMessage: apiSendMessage,
  } = useJarvisAPI({
    onMessageSent: (message, isVoice) => {
      addMessageToConversation('user', message)
      if (isVoice) {
        console.log('💭 User finished speaking, Jarvis processing')
        setVoiceState('processing')
      }
    },
    onResponseReceived: (content, model, taskType) => {
      addMessageToConversation('assistant', content, model, taskType)
    },
    onModelChanged: () => {},
    onTaskTypeDetected: () => {},
  })

  // Chat message handler for both ChatHistory and ChatView components (uses unified endpoint)
  const handleChatMessage = useCallback(async (message: string) => {
    try {
      // Send to same endpoint as voice commands
      const response = await fetch('http://localhost:7777/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          payload: { message },
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Add user message to chat history
        addMessageToConversation('user', message)

        // Add assistant response to chat history
        const assistantContent = data.content || 'No response'
        addMessageToConversation('assistant', assistantContent, data.model)
      } else {
        throw new Error(`API request failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to send chat message:', error)
      throw error // Re-throw so ChatHistory can handle error state
    }
  }, [addMessageToConversation])

  // Send message handler
  const sendMessage = useCallback(async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return

    // Handle Pomodoro confirmation if waiting for response
    if (isAwaitingPomodoroConfirmation && isVoiceInput) {
      const lowerText = text.toLowerCase().trim()
      if (
        lowerText.includes('yes') ||
        lowerText.includes('continue') ||
        lowerText.includes('sure') ||
        lowerText.includes('start')
      ) {
        console.log('🍅 User confirmed to continue Pomodoro via voice')
        // Send continue message to backend to start new session
        try {
          await apiSendMessage(
            'continue pomodoro',
            false,
            getCurrentMessages()
          )
          speakText('Starting your next Pomodoro session!')
        } catch (error) {
          console.error('Failed to continue Pomodoro:', error)
        }
        setIsAwaitingPomodoroConfirmation(false)
        return
      } else if (
        lowerText.includes('no') ||
        lowerText.includes('stop') ||
        lowerText.includes('cancel')
      ) {
        console.log('🍅 User declined to continue Pomodoro via voice')
        speakText('Pomodoro session ended. Great work!')
        setIsAwaitingPomodoroConfirmation(false)
        return
      }
    }

    if (!activeConversation) {
      createNewConversation()
      setTimeout(() => sendMessage(text, isVoiceInput), 100)
      return
    }

    try {
      const result = await apiSendMessage(
        text,
        isVoiceInput,
        getCurrentMessages()
      )

      // Handle TTS for voice inputs
      if (result && result.content && isVoiceInput) {
        console.log('🗣️ Speaking response:', {
          mode: result.ttsMode,
          content: result.content.slice(0, 50) + '...',
        })

        if (result.ttsMode === 'system') {
          // System TTS - start animation and TTS together
          console.log('🤖 System TTS - starting animation and TTS together')
          setVoiceState('speaking')
          startAudioLevelSimulation()

          speakText(result.content).catch((error) => {
            // Only log error if it's not due to user stopping TTS
            if (error && error.message !== 'Speech interrupted by user') {
              console.error('System TTS failed:', error)
            } else {
              console.log('🛑 System TTS interrupted by user')
            }
            // Cleanup states - the TTS hook should have already cleaned them up,
            // but this ensures consistency
            setVoiceState('idle')
            stopAudioLevelSimulation()
          })
        } else {
          // Edge TTS - WebSocket will handle animation timing
          console.log('🔥 Edge TTS - using WebSocket for perfect sync')

          try {
            const ttsResult = await speakTextViaAPI(result.content)
            if (ttsResult.success) {
              console.log(
                '✅ Edge TTS request completed successfully in',
                ttsResult.ttsDuration,
                'ms'
              )
            } else {
              console.error('❌ Edge TTS failed:', ttsResult.error)
              setVoiceState('idle')
              stopAudioLevelSimulation()
            }
          } catch (error) {
            console.error('🚫 Edge TTS request failed:', error)
            setVoiceState('idle')
            stopAudioLevelSimulation()
          }
        }
      } else {
        // No voice output - clean state
        console.log('🔇 No voice output - cleaning up states')
        setVoiceState('idle')
        stopAudioLevelSimulation()
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setVoiceState('idle')
      stopAudioLevelSimulation()
    }
  }, [
    isAwaitingPomodoroConfirmation,
    setIsAwaitingPomodoroConfirmation,
    speakText,
    setVoiceState,
    startAudioLevelSimulation,
    stopAudioLevelSimulation,
    speakTextViaAPI,
    apiSendMessage,
    getCurrentMessages,
    activeConversation,
    createNewConversation
  ])

  return {
    handleChatMessage,
    sendMessage,
  }
}