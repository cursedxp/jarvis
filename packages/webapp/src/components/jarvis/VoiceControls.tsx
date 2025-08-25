'use client'

import { Button } from "@/components/ui/button"
import { Mic, MicOff, Square } from "lucide-react"

interface VoiceControlsProps {
  voiceState: 'idle' | 'listening' | 'processing' | 'speaking'
  isSpeaking: boolean
  isVoiceEnabled: boolean
  voiceTranscript: string
  onStartVoice: () => void
  onStopVoice: () => void
  onStopTTS: () => void
}

export function VoiceControls({ 
  voiceState, 
  isSpeaking, 
  isVoiceEnabled, 
  voiceTranscript, 
  onStartVoice, 
  onStopVoice, 
  onStopTTS 
}: VoiceControlsProps) {
  
  return (
    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4">
      {/* Voice Transcript Display */}
      {voiceTranscript && (
        <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 max-w-md text-center border border-cyan-500/20">
          <div className="text-xs text-cyan-400 mb-1">You're saying:</div>
          <div className="text-white/90 text-sm">{voiceTranscript}</div>
        </div>
      )}
      
      {/* Control Buttons */}
      <div className="flex items-center space-x-4">
        {isSpeaking || voiceState === 'speaking' ? (
          // When AI is speaking, only show Stop Speaking button
          <Button
            onClick={onStopTTS}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full shadow-lg cursor-pointer"
          >
            <Square className="w-5 h-5 mr-2" />
            Stop Speaking
          </Button>
        ) : voiceState === 'processing' ? (
          // When processing, show nothing (Thinking... text is shown by AnimatedBlob)
          <div className="px-8 py-4">
            {/* Processing state - no text needed, AnimatedBlob shows "Thinking..." */}
          </div>
        ) : (
          // When idle or listening, show Start/Stop voice recording button
          <Button
            onClick={isVoiceEnabled ? onStopVoice : onStartVoice}
            size="lg"
            className={`px-8 py-4 rounded-full shadow-lg transition-all duration-200 cursor-pointer ${
              isVoiceEnabled 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-cyan-500 hover:bg-cyan-600 text-black'
            }`}
          >
            {isVoiceEnabled ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Chat
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Voice State Indicator */}
      <div className="text-center">
        <div className={`text-sm font-medium transition-colors ${
          voiceState === 'listening' ? 'text-cyan-400' :
          'text-gray-400'
        }`}>
          {voiceState === 'idle' && 'Click Start to begin voice chat'}
          {voiceState === 'listening' && '🎤 Listening... speak naturally'}
          {/* Removed processing text - AnimatedBlob shows "Thinking..." */}
          {/* Removed speaking state text */}
        </div>
        
        {isVoiceEnabled && voiceState === 'listening' && (
          <div className="text-xs text-gray-500 mt-1">
            Voice will automatically stop when you finish speaking
          </div>
        )}
      </div>
    </div>
  )
}