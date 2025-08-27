'use client'

import { Button } from "@/components/ui/button"
import { Mic, MicOff, Square, MessageSquare } from "lucide-react"

interface VoiceControlsProps {
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
  isSpeaking: boolean
  isVoiceEnabled: boolean
  voiceTranscript: string
  voiceRecognitionInitialized: boolean
  wakeWordEnabled?: boolean
  isListeningForWakeWord?: boolean
  onStartVoice: () => void
  onStopVoice: () => void
  onStopTTS: () => void
  onToggleChatMode: () => void
}

export function VoiceControls({ 
  voiceState, 
  isSpeaking, 
  isVoiceEnabled, 
  voiceTranscript, 
  voiceRecognitionInitialized,
  wakeWordEnabled = false,
  isListeningForWakeWord = false,
  onStartVoice, 
  onStopVoice, 
  onStopTTS,
  onToggleChatMode
}: VoiceControlsProps) {
  
  // Debug logging (can be removed in production)
  // console.log('🔧 VoiceControls Debug:', { wakeWordEnabled, isListeningForWakeWord, voiceState, isVoiceEnabled })
  
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
      {/* Voice Transcript Display */}
      {voiceTranscript && (
        <div className="bg-card/50 backdrop-blur-sm rounded-xl px-4 py-2 max-w-md text-center border border-border">
          <div className="text-xs text-muted-foreground mb-1">You&apos;re saying:</div>
          <div className="text-foreground text-sm">{voiceTranscript}</div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="flex items-center space-x-4">
        {isSpeaking || voiceState === 'speaking' ? (
          // When AI is speaking, only show Stop Speaking button
          <Button
            onClick={onStopTTS}
            size="lg"
            variant="destructive"
            className="px-8 py-4 rounded-full shadow-lg cursor-pointer"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop Speaking
          </Button>
        ) : voiceState === 'processing' ? (
          // When processing, show nothing (Thinking... text is shown by AnimatedBlob)
          <div className="px-8 py-4">
            {/* Processing state - no text needed, AnimatedBlob shows "Thinking..." */}
          </div>
        ) : wakeWordEnabled ? (
          // When wake word is enabled, show status with stop button when listening
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2 px-6 py-3 rounded-full bg-card/50 backdrop-blur-sm border border-border">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isListeningForWakeWord ? 'bg-green-400' : 'bg-muted-foreground'
              }`} />
              <span className="text-sm text-black dark:text-white">
                {isListeningForWakeWord ? 'Ready - Say "Hey Jarvis"' : 'Wake word detection starting...'}
              </span>
            </div>
            {isVoiceEnabled && isListeningForWakeWord && (
              <Button
                onClick={onStopVoice}
                size="sm"
                variant="destructive"
                className="px-4 py-2 rounded-full text-xs"
              >
                <MicOff className="w-3 h-3 mr-1" />
                Stop & Process
              </Button>
            )}
          </div>
        ) : (
          // When wake word is disabled, show manual voice button
          <>
            <Button
              onClick={isVoiceEnabled ? onStopVoice : onStartVoice}
              size="lg"
              variant={isVoiceEnabled ? 'destructive' : 'default'}
              disabled={!voiceRecognitionInitialized}
              className="px-8 py-4 rounded-full shadow-lg transition-all duration-200 cursor-pointer"
            >
              {isVoiceEnabled ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  {voiceRecognitionInitialized ? 'Start Voice Chat' : 'Loading Voice...'}
                </>
              )}
            </Button>
            
            <Button
              onClick={onToggleChatMode}
              size="lg"
              variant="outline"
              className="px-8 py-4 rounded-full shadow-lg transition-all duration-200 cursor-pointer border-0 hover:bg-primary/10"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Chat
            </Button>
          </>
        )}
      </div>
      
      {/* Voice State Indicator */}
      <div className="text-center">
        <div className={`text-sm font-medium transition-colors ${
          voiceState === 'listening' ? 'text-cyan-400' :
          'text-gray-400'
        }`}>
          {voiceState === 'idle' && (wakeWordEnabled ? 'Say "Hey Jarvis" to start or use the chat button' : 'Choose voice chat or text chat to get started')}
          {voiceState === 'listening' && '🎤 Listening... speak naturally'}
          {/* Removed processing text - AnimatedBlob shows "Thinking..." */}
          {/* Removed speaking state text */}
        </div>
        
        {isVoiceEnabled && voiceState === 'listening' && (
          <div className="text-xs text-gray-500 mt-1">
            Click "Stop & Process" when you finish speaking
          </div>
        )}
      </div>
    </div>
  )
}