'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Settings, History, Calendar } from "lucide-react"
import { io, Socket } from 'socket.io-client'

// Custom components
import { AnimatedBlob } from '@/components/jarvis/AnimatedBlob'
import { VoiceControls } from '@/components/jarvis/VoiceControls'
import { SettingsDialog } from '@/components/jarvis/SettingsDialog'
import { ChatHistory } from '@/components/jarvis/ChatHistory'
import { FloatingWindow } from '@/components/jarvis/FloatingWindow'

// Custom hooks
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useTTS } from '@/hooks/useTTS'
import { useAudioAnimation } from '@/hooks/useAudioAnimation'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
  taskType?: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export default function JarvisMinimal() {
  // State management
  const [voice, setVoice] = useState('Alex')
  const [speechRate, setSpeechRate] = useState([180])
  const [ttsMode, setTtsMode] = useState<'system' | 'edge'>('system')
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showChatHistory, setShowChatHistory] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentModel, setCurrentModel] = useState<string>('main')
  const [detectedTaskType, setDetectedTaskType] = useState<string>('')
  const [showPlanningApp, setShowPlanningApp] = useState(false)

  // Animation hook
  const { 
    realTimeAudioLevel, 
    startAudioLevelSimulation, 
    stopAudioLevelSimulation 
  } = useAudioAnimation()

  // TTS hook
  const { 
    isSpeaking, 
    speakText, 
    stopTTS: stopTTSHook, 
    testVoice 
  } = useTTS({
    voice,
    speechRate: speechRate[0],
    ttsMode,
    onSpeakingChange: (speaking) => {
      if (speaking) {
        startAudioLevelSimulation()
      } else {
        stopAudioLevelSimulation()
      }
    },
    onStateChange: setVoiceState
  })

  // Voice recognition hook
  const { 
    transcript, 
    startListening, 
    stopListening 
  } = useVoiceRecognition({
    onTranscript: (text) => sendMessage(text, true),
    onStateChange: setVoiceState
  })

  // Initialize on mount
  useEffect(() => {
    loadConversations()
    loadAvailableVoices()
    
    // Initialize Socket.IO connection for real-time TTS events
    const socketInstance = io('http://localhost:7777')
    setSocket(socketInstance)
    
    // Listen for audio events from server
    socketInstance.on('audio_starting', (data) => {
      console.log('🎵 Server audio starting event received:', data)
      // Start animation exactly when audio starts
      setVoiceState('speaking')
      startAudioLevelSimulation()
    })
    
    socketInstance.on('audio_finished', (data) => {
      console.log('🔚 Server audio finished event received:', data)
      // Stop animation when audio ends
      setVoiceState('idle')
      stopAudioLevelSimulation()
    })
    
    socketInstance.on('audio_stopped', (data) => {
      console.log('🛑 Server audio stopped event received:', data)
      // Stop animation immediately when user stops TTS
      setVoiceState('idle')
      stopAudioLevelSimulation()
    })
    
    // Cleanup on unmount
    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Load conversations from localStorage
  const loadConversations = () => {
    try {
      const saved = localStorage.getItem('jarvis_conversations')
      if (saved) {
        const parsed = JSON.parse(saved)
        const conversations = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }))
        setConversations(conversations)
        
        if (conversations.length > 0) {
          setActiveConversation(conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  // Load available voices based on TTS mode
  const loadAvailableVoices = async () => {
    try {
      if (ttsMode === 'edge') {
        const response = await fetch('http://localhost:7777/api/tts/voices')
        if (response.ok) {
          const data = await response.json()
          setAvailableVoices(data.voices || [])
          if (data.voices && data.voices.length > 0 && !data.voices.includes(voice)) {
            setVoice(data.voices[0])
          }
        }
      } else {
        // System voices are handled by the browser
        setAvailableVoices([])
      }
    } catch (error) {
      console.error('Failed to load voices:', error)
    }
  }

  // Update voices when TTS mode changes
  useEffect(() => {
    loadAvailableVoices()
  }, [ttsMode])

  // Get current conversation messages
  const getCurrentMessages = (): Message[] => {
    if (!activeConversation) return []
    const conversation = conversations.find(c => c.id === activeConversation)
    return conversation?.messages || []
  }

  // Create new conversation
  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setConversations(prev => [newConv, ...prev])
    setActiveConversation(newConv.id)
  }

  // Add message to conversation
  const addMessageToConversation = (role: 'user' | 'assistant', content: string, model?: string, taskType?: string) => {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
      model,
      taskType
    }
    
    setConversations(prev => prev.map(conv => 
      conv.id === activeConversation 
        ? { 
            ...conv, 
            messages: [...conv.messages, message],
            title: conv.messages.length === 0 ? content.slice(0, 30) + '...' : conv.title,
            updatedAt: new Date()
          }
        : conv
    ))
    
    // Save to localStorage
    const updated = conversations.map(conv => 
      conv.id === activeConversation 
        ? { 
            ...conv, 
            messages: [...conv.messages, message],
            updatedAt: new Date()
          }
        : conv
    )
    setConversations(updated)
    localStorage.setItem('jarvis_conversations', JSON.stringify(updated))
  }

  // Send message to API
  const sendMessage = async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return
    if (!activeConversation) {
      createNewConversation()
      setTimeout(() => sendMessage(text, isVoiceInput), 100)
      return
    }
    
    addMessageToConversation('user', text)
    
    // Set processing state for voice inputs
    if (isVoiceInput) {
      console.log('💭 User finished speaking, Jarvis processing')
      setVoiceState('processing')
    }
    
    try {
      const response = await fetch('http://localhost:7777/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          payload: { 
            message: text,
            conversationHistory: getCurrentMessages()
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Update current model and task type for UI display
        if (data.model) setCurrentModel(data.model)
        if (data.taskType) setDetectedTaskType(data.taskType)
        
        addMessageToConversation('assistant', data.content, data.model, data.taskType)
        
        // Always speak the response for voice inputs
        if (data.content && isVoiceInput) {
          console.log('🗣️ Speaking response:', { mode: data.ttsMode, content: data.content.slice(0, 50) + '...' })
          
          if (data.ttsMode === 'system') {
            // System TTS - start animation and TTS together (working perfectly)
            console.log('🤖 System TTS - starting animation and TTS together')
            setVoiceState('speaking')
            startAudioLevelSimulation()
            
            speakText(data.content).catch(error => {
              console.error('System TTS failed:', error)
              setVoiceState('idle')
              stopAudioLevelSimulation()
            })
          } else {
            // Edge TTS - WebSocket will handle animation timing perfectly
            console.log('🔥 Edge TTS - using WebSocket for perfect sync')
            
            // Just start the TTS request - WebSocket events will handle animation
            fetch('http://localhost:7777/api/tts/speak', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: data.content })
            })
            .then(response => response.json())
            .then(ttsData => {
              if (ttsData.success) {
                console.log('✅ Edge TTS request completed successfully in', ttsData.ttsDuration, 'ms')
                // Animation start/stop is handled by WebSocket events
              } else {
                console.error('❌ Edge TTS failed:', ttsData.message)
                setVoiceState('idle')
                stopAudioLevelSimulation()
              }
            })
            .catch(error => {
              console.error('🚫 Edge TTS request failed:', error)
              setVoiceState('idle')
              stopAudioLevelSimulation()
            })
          }
        } else {
          // No voice output - ensure clean state
          console.log('🔇 No voice output - cleaning up states')
          setVoiceState('idle')
          stopAudioLevelSimulation()
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setVoiceState('idle')
      stopAudioLevelSimulation()
    }
  }

  // Voice control handlers
  const handleStartVoice = () => {
    setIsVoiceEnabled(true)
    startListening()
  }

  const handleStopVoice = () => {
    setIsVoiceEnabled(false)
    stopListening()
  }

  const handleStopTTS = () => {
    stopTTSHook()
    stopAudioLevelSimulation()
  }

  // Settings handlers
  const handleTTSModeChange = async (mode: 'system' | 'edge') => {
    setTtsMode(mode)
    try {
      await fetch('http://localhost:7777/api/tts/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
    } catch (error) {
      console.error('Failed to change TTS mode:', error)
    }
  }

  const handleVoiceChange = async (newVoice: string) => {
    setVoice(newVoice)
    if (ttsMode === 'edge') {
      try {
        await fetch('http://localhost:7777/api/tts/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice: newVoice })
        })
      } catch (error) {
        console.error('Failed to change voice:', error)
      }
    }
  }

  const saveSettings = () => {
    localStorage.setItem('jarvis_settings', JSON.stringify({
      voice,
      speechRate,
      ttsMode
    }))
    setSettingsOpen(false)
  }

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
      
      {/* Chat History */}
      <ChatHistory 
        isVisible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        messages={getCurrentMessages()}
      />

      {/* Main Interface */}
      <div className="flex flex-col h-full">
        {/* Control Buttons - Top */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowChatHistory(!showChatHistory)}
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer p-2"
            >
              <History className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={() => setSettingsOpen(true)}
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer p-2"
            >
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* Model Indicator */}
            {detectedTaskType && (
              <div className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                {detectedTaskType.toUpperCase()} MODE
              </div>
            )}
          </div>
          
          <SettingsDialog 
            isOpen={settingsOpen}
            onOpenChange={setSettingsOpen}
            ttsMode={ttsMode}
            onTTSModeChange={handleTTSModeChange}
            voice={voice}
            onVoiceChange={handleVoiceChange}
            speechRate={speechRate}
            onSpeechRateChange={setSpeechRate}
            availableVoices={availableVoices}
            onTestVoice={testVoice}
            onSaveSettings={saveSettings}
            isSpeaking={isSpeaking}
            voiceState={voiceState}
          />
        </div>

        {/* Animated Blob */}
        <AnimatedBlob 
          audioLevel={realTimeAudioLevel}
          voiceState={voiceState}
          isSpeaking={isSpeaking}
        />

        {/* Voice Controls */}
        <VoiceControls 
          voiceState={voiceState}
          isSpeaking={isSpeaking}
          isVoiceEnabled={isVoiceEnabled}
          voiceTranscript={transcript}
          onStartVoice={handleStartVoice}
          onStopVoice={handleStopVoice}
          onStopTTS={handleStopTTS}
        />

        {/* Planning App Button - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-30">
          <Button
            onClick={() => setShowPlanningApp(!showPlanningApp)}
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-400 hover:bg-cyan-500/10 cursor-pointer p-3 rounded-full"
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Planning App Floating Window */}
        <FloatingWindow
          isOpen={showPlanningApp}
          onClose={() => setShowPlanningApp(false)}
          title="Planning App"
          defaultWidth={400}
          defaultHeight={600}
        >
          <iframe
            src="http://localhost:8080"
            className="w-full h-full border-0"
            title="Planning App"
          />
        </FloatingWindow>
      </div>
    </div>
  )
}