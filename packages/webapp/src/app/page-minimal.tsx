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
  Plus, MessageSquare, Trash2, Edit3, Menu, X, Eye, EyeOff, History, ChevronLeft
} from "lucide-react"

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

export default function JarvisMinimal() {
  const [message, setMessage] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voice, setVoice] = useState('Alex')
  const [speechRate, setSpeechRate] = useState([180])
  const [ttsMode, setTtsMode] = useState<'system' | 'edge'>('system')
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle')
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [showChatHistory, setShowChatHistory] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    loadSettings()
    loadConversations()
  }, [])

  const loadSettings = () => {
    const savedVoice = localStorage.getItem('jarvis_voice')
    const savedRate = localStorage.getItem('jarvis_speech_rate')
    const savedTtsMode = localStorage.getItem('jarvis_tts_mode')
    
    if (savedVoice) setVoice(savedVoice)
    if (savedRate) setSpeechRate([parseInt(savedRate)])
    if (savedTtsMode) setTtsMode(savedTtsMode as 'system' | 'edge')
  }

  const saveSettings = () => {
    localStorage.setItem('jarvis_voice', voice)
    localStorage.setItem('jarvis_speech_rate', speechRate[0].toString())
    localStorage.setItem('jarvis_tts_mode', ttsMode)
    setSettingsOpen(false)
  }

  const loadConversations = () => {
    const saved = localStorage.getItem('jarvis_conversations')
    if (saved) {
      const parsed = JSON.parse(saved)
      setConversations(parsed)
      if (parsed.length > 0 && !activeConversation) {
        setActiveConversation(parsed[0].id)
      }
    } else {
      createNewConversation()
    }
  }

  const createNewConversation = () => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    const updated = [newConv, ...conversations]
    setConversations(updated)
    setActiveConversation(newConv.id)
    localStorage.setItem('jarvis_conversations', JSON.stringify(updated))
  }

  const addMessageToConversation = (role: 'user' | 'assistant', content: string) => {
    const updated = conversations.map(conv => {
      if (conv.id === activeConversation) {
        const newMessage: Message = {
          role,
          content,
          timestamp: new Date()
        }
        return {
          ...conv,
          messages: [...conv.messages, newMessage],
          updatedAt: new Date(),
          title: conv.messages.length === 0 ? content.slice(0, 30) + '...' : conv.title
        }
      }
      return conv
    })
    setConversations(updated)
    localStorage.setItem('jarvis_conversations', JSON.stringify(updated))
  }

  const sendMessage = async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return

    if (!activeConversation) {
      createNewConversation()
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
        
        if (data.content && isVoiceInput) {
          if (data.ttsMode === 'system') {
            speakText(data.content)
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }

    setIsSpeaking(false)
    setVoiceState('idle')
    setMessage('')
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      const voices = window.speechSynthesis.getVoices()
      const selectedVoice = voices.find(v => v.name === voice)
      if (selectedVoice) utterance.voice = selectedVoice
      utterance.rate = speechRate[0] / 180
      window.speechSynthesis.speak(utterance)
    }
  }

  const stopTTS = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setVoiceState('idle')
    
    if (ttsMode === 'edge') {
      fetch('http://localhost:7777/api/tts/stop', { method: 'POST' }).catch(() => {})
    }
  }

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()
      
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = 'en-US'
      
      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setVoiceTranscript(prev => prev + finalTranscript)
        } else if (interimTranscript) {
          setVoiceTranscript(prev => {
            const parts = prev.split(' ')
            parts[parts.length - 1] = interimTranscript
            return parts.join(' ')
          })
        }
      }
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsVoiceEnabled(false)
        setVoiceState('idle')
      }
      
      recognitionInstance.onend = () => {
        if (isVoiceEnabled) {
          try {
            recognitionInstance.start()
          } catch (e) {
            console.log('Failed to restart recognition:', e)
          }
        }
      }
      
      setRecognition(recognitionInstance)
    }
  }

  const startVoiceRecording = () => {
    if (!recognition) {
      initializeSpeechRecognition()
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
    
    if (isVoiceEnabled || voiceState === 'listening') {
      return
    }
    
    try {
      recognition.start()
      setIsVoiceEnabled(true)
      setVoiceState('listening')
      setVoiceTranscript('')
    } catch (error) {
      console.error('Failed to start recognition:', error)
      setIsVoiceEnabled(false)
      setVoiceState('idle')
    }
  }

  const stopVoiceRecording = () => {
    if (!recognition || !isVoiceEnabled) return
    
    try {
      recognition.stop()
    } catch (error) {
      console.error('Failed to stop recognition:', error)
    }
    
    setIsVoiceEnabled(false)
    setVoiceState('idle')
    
    if (voiceTranscript.trim()) {
      sendMessage(voiceTranscript.trim(), true)
      setVoiceTranscript('')
    }
  }

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
      {/* Chat History Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-gray-900/95 backdrop-blur-sm border-r border-cyan-500/20 transition-transform duration-300 z-40 ${
        showChatHistory ? 'translate-x-0' : '-translate-x-full'
      } w-96`}>
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-cyan-400 font-semibold text-lg">Chat History</h2>
            <Button
              onClick={() => setShowChatHistory(false)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-y-auto h-full pb-20">
          {getCurrentMessages().map((msg, idx) => (
            <div key={idx} className={`p-4 ${msg.role === 'user' ? 'bg-gray-800/50' : ''}`}>
              <div className="flex items-start space-x-2">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  msg.role === 'user' ? 'bg-blue-500' : 'bg-cyan-500'
                }`} />
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    {msg.role === 'user' ? 'You' : 'Jarvis'}
                  </div>
                  <div className="text-white/90 text-sm">{msg.content}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Animated Interface */}
      <div className="flex flex-col h-full">
        {/* Control Buttons - Top */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
          <Button
            onClick={() => setShowChatHistory(!showChatHistory)}
            variant="outline"
            size="sm"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
          >
            <History className="w-4 h-4 mr-2" />
            History
          </Button>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900 border-cyan-500/50">
              <DialogHeader>
                <DialogTitle className="text-cyan-400">Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400">TTS Mode</label>
                  <Select value={ttsMode} onValueChange={(v) => setTtsMode(v as 'system' | 'edge')}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System TTS</SelectItem>
                      <SelectItem value="edge">Edge TTS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Voice</label>
                  <Select value={voice} onValueChange={setVoice}>
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alex">Alex</SelectItem>
                      <SelectItem value="Samantha">Samantha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Speech Rate: {speechRate[0]} WPM</label>
                  <Slider
                    value={speechRate}
                    onValueChange={setSpeechRate}
                    min={120}
                    max={300}
                    step={10}
                    className="mt-2"
                  />
                </div>
                <Button onClick={saveSettings} className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Animated Blob - Center */}
        <div className="flex-1 flex items-center justify-center">
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
          <div className="absolute bottom-32 text-center">
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
              <div className="mt-4 px-4 py-2 bg-gray-800/50 rounded-lg max-w-md backdrop-blur-sm">
                <span className="text-gray-300 text-sm">{voiceTranscript}</span>
              </div>
            )}
          </div>
        </div>

        {/* Control Buttons - Bottom */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <Button
            onClick={() => {
              if (isVoiceEnabled) {
                stopVoiceRecording()
              } else {
                startVoiceRecording()
              }
            }}
            size="lg"
            variant={isVoiceEnabled ? "destructive" : "default"}
            className={`${
              isVoiceEnabled 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-cyan-600 hover:bg-cyan-700'
            } min-w-[140px] cursor-pointer`}
          >
            {isVoiceEnabled ? (
              <div className="flex items-center space-x-2">
                <Square className="w-5 h-5" />
                <span>Stop</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Mic className="w-5 h-5" />
                <span>Start</span>
              </div>
            )}
          </Button>
          
          {isSpeaking && (
            <Button
              onClick={stopTTS}
              size="lg"
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 cursor-pointer"
            >
              <VolumeX className="w-5 h-5 mr-2" />
              Stop Speaking
            </Button>
          )}
        </div>
      </div>

      {/* CSS Animations */}
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
  )
}