'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { 
  Mic, MicOff, Volume2, VolumeX, Settings, Send, Square, 
  Plus, MessageSquare, Trash2, Edit3, Menu, X, Eye, EyeOff
} from "lucide-react"

interface JarvisStatus {
  core: boolean
  wakeWord: boolean
  model: string
}

interface Microphone {
  index: number
  name: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export default function JarvisInterface() {
  const [status, setStatus] = useState<JarvisStatus>({ core: false, wakeWord: false, model: 'llama3.2:3b' })
  const [message, setMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [microphones, setMicrophones] = useState<Microphone[]>([])
  const [selectedMic, setSelectedMic] = useState('-1')
  const [voice, setVoice] = useState('Alex')
  const [speechRate, setSpeechRate] = useState([180])
  const [ttsMode, setTtsMode] = useState<'system' | 'edge'>('system')
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [ttsForTyped, setTtsForTyped] = useState(false) // New setting for TTS on typed messages
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [micTesting, setMicTesting] = useState(false)
  const [micTestResult, setMicTestResult] = useState<string>('')
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [showChatHistory, setShowChatHistory] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeConversation, conversations])

  // Get current conversation messages
  const getCurrentConversation = () => {
    if (!activeConversation) return null
    return conversations.find(c => c.id === activeConversation)
  }

  const getCurrentMessages = () => {
    const conversation = getCurrentConversation()
    return conversation?.messages || []
  }

  useEffect(() => {
    checkStatus()
    loadMicrophones()
    loadTTSSettings()
    loadSettings()
    loadConversations()
    
    const interval = setInterval(checkStatus, 5000)
    return () => {
      clearInterval(interval)
    }
  }, [])
  
  // Separate useEffect for keyboard shortcuts to avoid recreating
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Space to toggle voice conversation
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault()
        toggleVoiceRecognition()
      }
      
      // ESC key to stop speaking
      if (e.code === 'Escape' && isSpeaking) {
        e.preventDefault()
        stopTTS()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSpeaking])

  // Conversation management
  const loadConversations = () => {
    const saved = localStorage.getItem('jarvisConversations')
    if (saved) {
      const parsed = JSON.parse(saved).map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }))
      setConversations(parsed)
      if (parsed.length > 0 && !activeConversation) {
        setActiveConversation(parsed[0].id)
      }
    }
  }

  const saveConversations = (convs: Conversation[]) => {
    localStorage.setItem('jarvisConversations', JSON.stringify(convs))
    setConversations(convs)
  }

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const updated = [newConv, ...conversations]
    saveConversations(updated)
    setActiveConversation(newConv.id)
  }

  const deleteConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id)
    saveConversations(updated)
    if (activeConversation === id) {
      setActiveConversation(updated.length > 0 ? updated[0].id : null)
    }
  }

  const updateConversationTitle = (id: string, title: string) => {
    const updated = conversations.map(c => 
      c.id === id ? { ...c, title, updatedAt: new Date() } : c
    )
    saveConversations(updated)
  }

  const addMessageToConversation = (role: 'user' | 'assistant', content: string) => {
    if (!activeConversation) {
      createNewConversation()
      return
    }

    const message: Message = {
      role,
      content,
      timestamp: new Date()
    }

    const updated = conversations.map(c => {
      if (c.id === activeConversation) {
        const updatedMessages = [...c.messages, message]
        // Auto-generate title from first user message
        const title = c.title === 'New conversation' && role === 'user' 
          ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
          : c.title
        
        return {
          ...c,
          messages: updatedMessages,
          title,
          updatedAt: new Date()
        }
      }
      return c
    })
    
    saveConversations(updated)
  }

  const checkStatus = async () => {
    try {
      const response = await fetch('http://localhost:7777/health')
      if (response.ok) {
        setStatus(prev => ({ ...prev, core: true }))
      } else {
        setStatus(prev => ({ ...prev, core: false }))
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, core: false }))
    }
  }

  const loadMicrophones = async () => {
    try {
      // Use browser API to get microphone devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.error('Media devices API not supported')
        return
      }
      
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(device => device.kind === 'audioinput')
      
      const mics = audioInputs.map((device, index) => ({
        index: device.deviceId,
        name: device.label || `Microphone ${index + 1}`
      }))
      
      setMicrophones([{ index: -1, name: 'System Default' }, ...mics])
    } catch (error) {
      console.error('Failed to load microphones:', error)
      // Set a default microphone option
      setMicrophones([{ index: -1, name: 'System Default' }])
    }
  }

  const loadTTSSettings = async () => {
    try {
      // Load TTS settings from server
      const response = await fetch('http://localhost:7777/api/tts/mode')
      const result = await response.json()
      if (result.mode) {
        setTtsMode(result.mode)
        if (result.mode === 'system') {
          // Load actual browser voices for system mode
          loadBrowserVoices()
        } else {
          // Use Edge-TTS voices from server
          setAvailableVoices(result.voices || [])
          // Set default Edge-TTS voice if needed
          if (result.voices && result.voices.length > 0) {
            const currentVoiceValid = result.voices.includes(voice)
            if (!currentVoiceValid) {
              setVoice('en-US-AriaNeural')
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load TTS settings:', error)
      // Fallback to browser TTS
      setTtsMode('system')
      loadBrowserVoices()
    }
  }
  
  const loadBrowserVoices = () => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        // Filter to only show system/local voices 
        // Exclude Google voices and any network-based voices
        const systemVoices = voices.filter(voice => {
          // Check multiple conditions to identify system voices
          const isLocal = voice.localService === true
          const isNotGoogle = !voice.name.toLowerCase().includes('google')
          const isNotNetwork = !voice.voiceURI.toLowerCase().includes('google')
          
          // On macOS, system voices typically have localService=true
          return isLocal && isNotGoogle && isNotNetwork
        })
        
        // Use filtered system voices
        const voiceNames = systemVoices.map(voice => voice.name)
        
        // Sort voices alphabetically for better UX
        voiceNames.sort()
        
        setAvailableVoices(voiceNames)
        
        // Always set a default voice if current voice is not in the list or no voice selected
        if (voiceNames.length > 0 && (!voice || !voiceNames.includes(voice))) {
          const defaultVoice = voiceNames.find(name => 
            name.includes('Alex') || name.includes('Samantha') || name.includes('Daniel')
          ) || voiceNames[0]
          setVoice(defaultVoice)
        }
      }
    }
    
    // Load voices (may need to wait for voices to be loaded)
    loadVoices()
    
    // Voices may not be loaded immediately, so listen for the event
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }

  const loadSettings = () => {
    const savedSettings = JSON.parse(localStorage.getItem('jarvisSettings') || '{}')
    if (savedSettings.voice) setVoice(savedSettings.voice)
    if (savedSettings.speechRate) setSpeechRate([savedSettings.speechRate])
    if (savedSettings.microphone) setSelectedMic(savedSettings.microphone)
    if (savedSettings.ttsMode) setTtsMode(savedSettings.ttsMode)
  }

  const saveSettings = async () => {
    const settings = {
      microphone: selectedMic,
      voice: voice,
      speechRate: speechRate[0],
      ttsMode: ttsMode
    }

    localStorage.setItem('jarvisSettings', JSON.stringify(settings))

    try {
      // Microphone setting is now handled by the browser directly

      // Save TTS mode
      await fetch('http://localhost:7777/api/tts/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: ttsMode })
      })

      // Save voice setting
      await fetch('http://localhost:7777/api/tts/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice: voice })
      })

      alert('✅ Settings saved successfully!')
    } catch (error) {
      alert('❌ Failed to save settings')
    }
  }

  // Text-to-Speech Functions
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Stop any current speech
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Configure voice settings
      // Convert WPM to rate (180 WPM is roughly 1.0 rate, normal speed)
      utterance.rate = speechRate[0] / 180 
      utterance.volume = 0.9
      utterance.pitch = 1.0
      
      // Try to use the selected voice
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.name.includes(voice) || v.voiceURI.includes(voice))
      if (selectedVoice) {
        utterance.voice = selectedVoice
      }
      
      // Pause voice recognition during TTS to prevent feedback loop
      const wasListening = isVoiceEnabled
      if (recognition && wasListening) {
        recognition.stop()
        // Don't change the enabled state, just stop temporarily
      }
      
      // Update speaking state
      utterance.onstart = () => {
        setIsSpeaking(true)
        setVoiceState('speaking')
      }
      
      utterance.onend = () => {
        setIsSpeaking(false)
        setVoiceState('idle')
        
        // Resume voice recognition after TTS ends (with a small delay)
        // Only resume if conversation mode is still enabled
        if (recognition && wasListening && isVoiceEnabled) {
          setTimeout(() => {
            // Double-check that conversation is still enabled
            if (isVoiceEnabled) {
              try {
                recognition.start()
              } catch (error) {
                console.log('Recognition restart after TTS failed:', error)
              }
            }
          }, 500) // 500ms delay to avoid picking up audio tail
        }
      }
      
      utterance.onerror = (error) => {
        console.error('TTS Error:', error)
        setIsSpeaking(false)
        setVoiceState('idle')
        
        // Resume voice recognition on error too
        // Only resume if conversation mode is still enabled
        if (recognition && wasListening && isVoiceEnabled) {
          setTimeout(() => {
            if (isVoiceEnabled) {
              try {
                recognition.start()
              } catch (error) {
                console.log('Recognition restart after TTS error failed:', error)
              }
            }
          }, 500)
        }
      }
      
      // Speak the text
      window.speechSynthesis.speak(utterance)
    } else {
      console.error('Speech synthesis not supported')
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setVoiceState('idle')
    }
    
    // Also stop Edge-TTS on server
    if (ttsMode === 'edge') {
      fetch('http://localhost:7777/api/tts/stop', { method: 'POST' }).catch(() => {})
    }
  }

  const sendMessage = async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return

    // Create new conversation if none exists
    if (!activeConversation) {
      createNewConversation()
      // Wait for state to update
      setTimeout(() => sendMessage(text, isVoiceInput), 100)
      return
    }

    addMessageToConversation('user', text)
    setIsSpeaking(true)
    setVoiceState('speaking')

    try {
      const response = await fetch('http://localhost:7777/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          payload: { message: text }
        })
      })

      if (response.ok) {
        const data = await response.json()
        addMessageToConversation('assistant', data.content)
        
        // Handle TTS based on mode (only for voice inputs or if TTS for typed is enabled)
        if (data.content && (isVoiceInput || ttsForTyped)) {
          if (data.ttsMode === 'system') {
            // Browser TTS - handled by speakText function
            speakText(data.content)
          } else if (data.ttsMode === 'edge') {
            // Edge-TTS - pause recognition during server-side playback
            const wasListening = isVoiceEnabled
            if (recognition && wasListening) {
              recognition.stop()
              // Don't change enabled state
            }
            
            // Estimate TTS duration (roughly 10 words per second + 1 second buffer)
            const wordCount = data.content.split(' ').length
            const estimatedDuration = (wordCount / 10) * 1000 + 1000
            
            // Resume recognition after estimated playback time
            setTimeout(() => {
              setIsSpeaking(false)
              setVoiceState('idle')
              
              // Only resume if conversation mode is still enabled
              if (recognition && wasListening && isVoiceEnabled) {
                try {
                  recognition.start()
                } catch (error) {
                  console.log('Recognition restart after Edge-TTS failed:', error)
                }
              }
            }, estimatedDuration)
          }
        }
      } else {
        addMessageToConversation('assistant', 'Error: Could not get response')
      }
    } catch (error) {
      addMessageToConversation('assistant', 'Error: Connection failed')
    } finally {
      // Reset speaking state based on whether TTS is being used
      if (!isVoiceInput && !ttsForTyped) {
        // No TTS for typed messages - reset immediately
        setIsSpeaking(false)
        setVoiceState('idle')
      } else if (ttsMode === 'system') {
        // Browser TTS will reset state in utterance.onend
        // But set idle state here for UI
        setVoiceState('idle')
      }
      // Edge-TTS state will be reset by timeout
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      sendMessage(message)
      setMessage('')
    }
  }

  const stopTTS = () => {
    stopSpeaking()
  }

  const testVoice = async () => {
    const testText = `Hello! This is ${voice} speaking. Your voice settings are working perfectly.`
    
    if (ttsMode === 'system') {
      // Use browser TTS for system mode
      speakText(testText)
    } else {
      // Use Edge-TTS through server for edge mode
      try {
        const response = await fetch('http://localhost:7777/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'chat',
            payload: { message: testText }
          })
        })
        
        if (!response.ok) {
          console.error('Failed to test Edge-TTS voice')
        }
        // Edge-TTS audio is played server-side
      } catch (error) {
        console.error('Error testing Edge-TTS:', error)
      }
    }
  }

  const handleVoiceChange = async (newVoice: string) => {
    setVoice(newVoice)
    saveSettings()
    
    // If in Edge-TTS mode, also update the server
    if (ttsMode === 'edge') {
      try {
        const response = await fetch('http://localhost:7777/api/tts/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice: newVoice })
        })
        
        if (!response.ok) {
          console.error('Failed to update Edge-TTS voice')
        }
      } catch (error) {
        console.error('Error updating voice:', error)
      }
    }
  }

  const handleTTSModeChange = async (mode: 'system' | 'edge') => {
    setTtsMode(mode)
    try {
      const response = await fetch('http://localhost:7777/api/tts/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const result = await response.json()
      if (result.success) {
        if (mode === 'system') {
          // For system mode, load actual browser voices
          loadBrowserVoices()
        } else {
          // For edge mode, use voices from server
          setAvailableVoices(result.voices || [])
          // Always set a default Edge-TTS voice
          const defaultVoice = result.voices.includes(voice) ? voice : 'en-US-AriaNeural'
          setVoice(defaultVoice)
        }
      }
    } catch (error) {
      console.error('Failed to change TTS mode:', error)
    }
  }

  // Speech Recognition Functions
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onstart = () => {
        setVoiceState('listening')
        console.log('Speech recognition started')
      }
      
      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          // Accumulate the transcript instead of auto-sending
          setVoiceTranscript(prev => {
            const newTranscript = prev ? prev + ' ' + finalTranscript : finalTranscript
            return newTranscript
          })
        } else if (interimTranscript) {
          // Show interim results in a temporary way (optional)
          // You could show this in UI to give feedback
        }
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setVoiceState('idle')
      }
      
      recognitionInstance.onend = () => {
        setVoiceState('idle')
        console.log('Speech recognition ended')
      }
      
      setRecognition(recognitionInstance)
    } else {
      console.error('Speech recognition not supported')
    }
  }
  
  const startVoiceRecording = () => {
    if (!recognition) {
      initializeSpeechRecognition()
      // After initialization, start listening
      setTimeout(() => {
        if (recognition && !isVoiceEnabled) {
          try {
            recognition.start()
            setIsVoiceEnabled(true)
            setVoiceState('listening')
            setVoiceTranscript('')
          } catch (error) {
            console.error('Failed to start recognition after init:', error)
          }
        }
      }, 100)
      return
    }
    
    // Check if already listening to prevent double-start
    if (isVoiceEnabled || voiceState === 'listening') {
      return
    }
    
    // Start recording
    try {
      recognition.start()
      setIsVoiceEnabled(true)
      setVoiceState('listening')
      setVoiceTranscript('') // Clear transcript when starting
    } catch (error) {
      console.error('Failed to start recognition:', error)
      // Reset states if start failed
      setIsVoiceEnabled(false)
      setVoiceState('idle')
    }
  }
  
  const stopVoiceRecording = () => {
    if (!recognition || !isVoiceEnabled) return
    
    // Stop recording and send
    try {
      recognition.stop()
    } catch (error) {
      console.error('Failed to stop recognition:', error)
    }
    
    setIsVoiceEnabled(false)
    setVoiceState('idle')
    
    // Send accumulated transcript if exists
    if (voiceTranscript.trim()) {
      sendMessage(voiceTranscript.trim(), true)
      setVoiceTranscript('')
    }
  }
  
  // Audio Level Monitoring
  const startAudioLevelMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)
      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      
      microphone.connect(analyser)
      analyser.fftSize = 256
      
      const updateAudioLevel = () => {
        if (isVoiceEnabled) {
          analyser.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(average)
          requestAnimationFrame(updateAudioLevel)
        }
      }
      
      updateAudioLevel()
    } catch (error) {
      console.error('Error accessing microphone for audio level:', error)
    }
  }
  
  useEffect(() => {
    if (isVoiceEnabled) {
      startAudioLevelMonitoring()
    }
  }, [isVoiceEnabled])

  const testMicrophone = async () => {
    setMicTesting(true)
    setMicTestResult('🎤 Testing microphone... Please speak for a few seconds.')

    try {
      // Check if microphone access is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicTestResult('❌ Microphone API not available in this browser')
        setMicTesting(false)
        return
      }

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          deviceId: selectedMic !== '-1' ? { exact: selectedMic } : undefined,
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      // Create audio context to analyze audio levels
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)
      let maxVolume = 0
      let sampleCount = 0
      const testDuration = 3000 // 3 seconds

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
        maxVolume = Math.max(maxVolume, average)
        sampleCount++

        if (sampleCount * 50 < testDuration) {
          setTimeout(checkAudio, 50)
        } else {
          // Stop the stream
          stream.getTracks().forEach(track => track.stop())
          audioContext.close()

          // Evaluate results
          if (maxVolume > 30) {
            setMicTestResult(`✅ Microphone test successful! Peak volume: ${Math.round(maxVolume)}/255`)
          } else if (maxVolume > 10) {
            setMicTestResult(`⚠️ Microphone detected but volume is low. Peak: ${Math.round(maxVolume)}/255`)
          } else {
            setMicTestResult(`❌ No significant audio detected. Check microphone permissions and speak louder.`)
          }
          setMicTesting(false)
        }
      }

      checkAudio()

    } catch (error: any) {
      let errorMessage = '❌ Microphone test failed: '
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please allow microphone access.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found or selected device unavailable.'
      } else {
        errorMessage += error.message || 'Unknown error'
      }
      setMicTestResult(errorMessage)
      setMicTesting(false)
    }
  }

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
      {/* Floating Stop Button - appears when Jarvis is speaking */}
      {isSpeaking && (
        <div className="fixed top-4 right-4 z-50">
          <Button
            onClick={stopTTS}
            variant="destructive"
            size="lg"
            className="shadow-lg animate-pulse flex items-center gap-2 cursor-pointer"
          >
            <VolumeX className="w-5 h-5" />
            Stop Speaking
          </Button>
        </div>
      )}
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden bg-gray-800 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Conversations</h2>
            <Button
              onClick={() => setSidebarOpen(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={createNewConversation} className="w-full cursor-pointer" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                activeConversation === conv.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
              onClick={() => setActiveConversation(conv.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {conv.title}
                  </div>
                  <div className="text-xs text-gray-400">
                    {conv.messages.length} messages
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteConversation(conv.id)
                  }}
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Status</span>
            <Badge variant={status.core ? "default" : "destructive"} className="text-xs">
              {status.core ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="text-xs text-gray-500">
            TTS: {ttsMode === 'system' ? 'macOS' : 'Edge-TTS'} • {voice}
          </div>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Jarvis Settings</DialogTitle>
                <DialogDescription>
                  Configure your voice assistant settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Microphone</label>
                  <Select value={selectedMic} onValueChange={setSelectedMic}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {microphones.map((mic) => (
                        <SelectItem key={mic.index} value={mic.index.toString()}>
                          {mic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2">
                    <Button
                      onClick={testMicrophone}
                      variant="outline"
                      size="sm"
                      disabled={micTesting}
                      className="w-full cursor-pointer"
                    >
                      {micTesting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 mr-2" />
                          Test Microphone
                        </>
                      )}
                    </Button>
                    {micTestResult && (
                      <div className={`text-xs mt-2 p-2 rounded ${
                        micTestResult.includes('✅') 
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : micTestResult.includes('⚠️')
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {micTestResult}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">TTS Service</label>
                  <Select value={ttsMode} onValueChange={handleTTSModeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">macOS System TTS (Fast)</SelectItem>
                      <SelectItem value="edge">Edge-TTS (High Quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Voice</label>
                  <Select value={voice} onValueChange={handleVoiceChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Speech Rate: {speechRate[0]} WPM
                  </label>
                  <Slider
                    value={speechRate}
                    onValueChange={(value) => {
                      setSpeechRate(value)
                      saveSettings()
                    }}
                    min={120}
                    max={250}
                    step={10}
                    className="w-full"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={testVoice} variant="outline" className="flex-1 cursor-pointer">
                    <Volume2 className="w-4 h-4 mr-2" />
                    Test Voice
                  </Button>
                  <Button onClick={saveSettings} className="flex-1 cursor-pointer">
                    Save Settings
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center space-x-4">
            {!sidebarOpen && (
              <Button
                onClick={() => setSidebarOpen(true)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                🤖 Jarvis
              </div>
              {getCurrentConversation() && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-sm text-gray-300 truncate max-w-xs">
                    {getCurrentConversation()?.title}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAnimatedView(!showAnimatedView)}
              variant="outline"
              size="sm"
              className="text-cyan-400 border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300 cursor-pointer"
              title={showAnimatedView ? "Show chat view" : "Show animated view"}
            >
              {showAnimatedView ? (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs">Chat</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-xs">Visual</span>
                </div>
              )}
            </Button>
            <Badge variant={status.core ? "default" : "destructive"} className="text-xs">
              {status.core ? 'Online' : 'Offline'}
            </Badge>
            {isSpeaking && (
              <div className="flex items-center space-x-1 text-blue-400">
                <Volume2 className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Speaking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Animated Blob View */}
        {showAnimatedView ? (
          <div className="flex-1 overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Animated Blob */}
              <div className="relative">
                <div 
                  className="absolute inset-0"
                  style={{
                    filter: 'blur(40px)',
                    opacity: 0.7
                  }}
                >
                  <div 
                    className={`w-64 h-64 rounded-full bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 ${
                      isSpeaking ? 'speaking-blob' : 'animate-blob'
                    }`}
                  />
                </div>
                <div 
                  className={`relative w-64 h-64 rounded-full bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-600 ${
                    isSpeaking ? 'speaking-blob-main' : 'animate-blob animation-delay-2000'
                  }`}
                  style={{
                    boxShadow: isSpeaking 
                      ? '0 0 100px rgba(0, 255, 255, 0.8), 0 0 200px rgba(0, 255, 255, 0.4)' 
                      : '0 0 50px rgba(0, 255, 255, 0.5)',
                    transition: 'box-shadow 0.3s ease'
                  }}
                />
                {/* Voice level bars */}
                {(isVoiceEnabled || isSpeaking) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-20 flex space-x-2">
                    {Array.from({length: 7}).map((_, i) => (
                      <div 
                        key={i}
                        className={`w-2 bg-gradient-to-t from-cyan-400 to-blue-500 rounded-full transition-all ${
                          isSpeaking ? 'speaking-bar' : 'duration-300'
                        }`}
                        style={{
                          height: isVoiceEnabled && voiceState === 'listening'
                            ? `${Math.max(8, (audioLevel * (i + 1)) / 20)}px`
                            : '20px',
                          animationDelay: `${i * 0.15}s`,
                          opacity: (isVoiceEnabled || isSpeaking) ? 1 : 0.3
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Status Text */}
              <div className="absolute bottom-20 text-center">
                <div className="text-white/80 text-lg font-medium">
                  {isSpeaking ? (
                    <span className="text-cyan-400">Jarvis is speaking...</span>
                  ) : voiceState === 'listening' ? (
                    <span className="text-blue-400">Listening...</span>
                  ) : voiceState === 'processing' ? (
                    <span className="text-yellow-400">Processing...</span>
                  ) : (
                    <span className="text-gray-400">Ready</span>
                  )}
                </div>
                {voiceTranscript && voiceState === 'listening' && (
                  <div className="mt-4 px-4 py-2 bg-gray-800/50 rounded-lg max-w-md">
                    <span className="text-gray-300 text-sm">{voiceTranscript}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Add CSS animations */}
            <style jsx>{`
              @keyframes blob {
                0% { transform: translateY(0px) scale(1); }
                33% { transform: translateY(-10px) scale(1.05); }
                66% { transform: translateY(10px) scale(0.95); }
                100% { transform: translateY(0px) scale(1); }
              }
              
              @keyframes speakingBar {
                0%, 100% { 
                  transform: scaleY(0.3);
                  opacity: 0.5;
                }
                50% { 
                  transform: scaleY(1);
                  opacity: 1;
                }
              }
              
              @keyframes speakingBlob {
                0%, 100% { 
                  transform: scale(1);
                }
                50% { 
                  transform: scale(1.1);
                }
              }
              
              @keyframes speakingBlobMain {
                0%, 100% { 
                  transform: scale(1);
                  opacity: 0.9;
                }
                50% { 
                  transform: scale(1.15);
                  opacity: 1;
                }
              }
              
              .animate-blob {
                animation: blob 7s infinite;
              }
              
              .animation-delay-2000 {
                animation-delay: 2s;
              }
              
              .speaking-bar {
                animation: speakingBar 1.2s ease-in-out infinite;
              }
              
              .speaking-blob {
                animation: speakingBlob 2s ease-in-out infinite;
              }
              
              .speaking-blob-main {
                animation: speakingBlobMain 2s ease-in-out infinite;
              }
            `}</style>
          </div>
        ) : (
        /* Chat Area */
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Voice Status Indicator */}
          {(isVoiceEnabled || voiceState !== 'idle') && (
            <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {voiceState === 'listening' && (
                  <>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-red-400 font-medium">
                      {voiceTranscript ? 'Recording: ' : 'Listening...'}
                    </span>
                    {voiceTranscript && (
                      <span className="text-sm text-gray-300 italic flex-1 truncate">
                        "{voiceTranscript}"
                      </span>
                    )}
                    <div className="flex space-x-1">
                      {Array.from({length: 5}).map((_, i) => (
                        <div 
                          key={i}
                          className="w-1 bg-red-400 rounded-full animate-pulse"
                          style={{
                            height: `${Math.max(4, (audioLevel * (i + 1)) / 100)}px`,
                            animationDelay: `${i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
                {voiceState === 'processing' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-yellow-400 font-medium">Processing...</span>
                  </>
                )}
                {voiceState === 'speaking' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400 font-medium">Speaking...</span>
                  </>
                )}
                {voiceState === 'idle' && isVoiceEnabled && (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-blue-400 font-medium">Voice enabled - Ready to listen</span>
                  </>
                )}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            {getCurrentMessages().length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h2 className="text-2xl font-semibold text-white mb-2">Welcome to Jarvis</h2>
                <p className="text-gray-400 mb-6">
                  Say "Hey Jarvis" or type a message to start a conversation
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md">
                  <Button
                    onClick={() => sendMessage("How are you?")}
                    variant="outline"
                    className="justify-start cursor-pointer"
                  >
                    💬 How are you?
                  </Button>
                  <Button
                    onClick={() => sendMessage("What's the current time?")}
                    variant="outline"
                    className="justify-start cursor-pointer"
                  >
                    ⏰ Current time
                  </Button>
                  <Button
                    onClick={() => sendMessage("Tell me a joke")}
                    variant="outline"
                    className="justify-start cursor-pointer"
                  >
                    😄 Tell me a joke
                  </Button>
                  <Button
                    onClick={() => sendMessage("What can you help me with?")}
                    variant="outline"
                    className="justify-start cursor-pointer"
                  >
                    🤝 What can you do?
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {getCurrentMessages().map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white ml-12'
                          : 'bg-gray-700 text-gray-100 mr-12'
                      }`}
                    >
                      <div className="text-xs font-medium mb-2 opacity-75">
                        {msg.role === 'user' ? 'You' : 'Jarvis'} • {msg.timestamp.toLocaleTimeString()}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        )}
        
        {/* Input Area - Always visible */}
        <div className="border-t border-gray-700 p-4 bg-gray-800">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message Jarvis..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSpeaking}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (isVoiceEnabled) {
                      stopVoiceRecording()
                    } else {
                      startVoiceRecording()
                    }
                  }}
                  variant={isVoiceEnabled ? "destructive" : "outline"}
                  className={`${voiceState === 'listening' ? 'animate-pulse bg-red-500 hover:bg-red-600' : ''} ${voiceState === 'processing' ? 'bg-yellow-500 hover:bg-yellow-600' : ''} select-none cursor-pointer min-w-[120px]`}
                  disabled={isSpeaking}
                >
                  {voiceState === 'listening' ? (
                    voiceTranscript ? (
                      // Show stop and send when there's transcript
                      <div className="flex items-center space-x-2">
                        <Square className="w-4 h-4 text-white" />
                        <span className="text-xs">Stop & Send</span>
                      </div>
                    ) : (
                      // Show stop icon when listening
                      <div className="flex items-center space-x-2">
                        <Square className="w-4 h-4 text-white" />
                        <span className="text-xs">Stop</span>
                      </div>
                    )
                  ) : voiceState === 'processing' ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                      <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                    </div>
                  ) : (
                    // Show start button when idle
                    <div className="flex items-center space-x-2">
                      <Mic className="w-4 h-4" />
                      <span className="text-sm">Start</span>
                    </div>
                  )}
                </Button>
                <Button type="submit" disabled={!message.trim() || isSpeaking} className="cursor-pointer">
                  {isSpeaking ? (
                    <Square className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant={isSpeaking ? "destructive" : "outline"}
                  onClick={stopTTS}
                  disabled={!isSpeaking}
                  className={isSpeaking ? "animate-pulse cursor-pointer" : "cursor-pointer"}
                  title="Stop Jarvis from speaking"
                >
                  <VolumeX className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">
                {isVoiceEnabled && voiceTranscript && (
                  <div className="mb-2 p-2 bg-gray-700 rounded text-white text-sm">
                    <span className="text-gray-400">Transcript: </span>
                    {voiceTranscript}
                  </div>
                )}
                {isVoiceEnabled ? (
                  <>🎤 Listening... Click "Stop" button to send your message</>
                ) : (
                  <>Click "Start" button to begin voice recording</>
                )}
                {isSpeaking && (
                  <> • Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">ESC</kbd> to stop speaking</>
                )}
              </div>
            </form>
          </div>
      </div>
    </div>
  )
}
