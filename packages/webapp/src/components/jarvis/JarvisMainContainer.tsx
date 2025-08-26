'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Settings, History, Calendar } from "lucide-react";
import dynamic from 'next/dynamic';

// Custom components
import { AnimatedBlob } from './AnimatedBlob';
import { VoiceControls } from './VoiceControls';
import { SettingsDialog } from './SettingsDialog';
import { ChatHistory } from './ChatHistory';
import { PomodoroWidget, PomodoroWidgetRef } from './PomodoroWidget';
import SpotifyPlayer from '../SpotifyPlayer';

// Custom hooks
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useTTS } from '@/hooks/useTTS';
import { useAudioAnimation } from '@/hooks/useAudioAnimation';
import { useConversations } from '@/hooks/useConversations';
import { useSocketIO } from '@/hooks/useSocketIO';
import { useJarvisAPI } from '@/hooks/useJarvisAPI';

const FloatingWindow = dynamic(
  () => import('./FloatingWindow').then(mod => ({ default: mod.FloatingWindow })), 
  { ssr: false }
);

export function JarvisMainContainer() {
  // UI State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showPlanningApp, setShowPlanningApp] = useState(false);
  const [showKanbanApp, setShowKanbanApp] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
  // Window Management
  const [windowZIndices, setWindowZIndices] = useState({ planning: 40, kanban: 41 });
  const [nextZIndex, setNextZIndex] = useState(42);
  
  // Pomodoro State
  const [isAwaitingPomodoroConfirmation, setIsAwaitingPomodoroConfirmation] = useState(false);
  const pomodoroWidgetRef = useRef<PomodoroWidgetRef>(null);
  
  // Spotify State
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  
  // Widget visibility
  const [showWidgets, setShowWidgets] = useState(true);
  
  // Voice/TTS State
  const [voice, setVoice] = useState('Alex');
  const [speechRate, setSpeechRate] = useState([180]);
  const [ttsMode, setTtsMode] = useState<'system' | 'edge'>('system');
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  
  // Model State
  const [currentModel, setCurrentModel] = useState<string>('main');
  const [detectedTaskType, setDetectedTaskType] = useState<string>('');

  // Animation hook
  const { 
    realTimeAudioLevel, 
    startAudioLevelSimulation, 
    stopAudioLevelSimulation 
  } = useAudioAnimation();

  // Conversations hook
  const {
    conversations,
    activeConversation,
    loadConversations,
    getCurrentMessages,
    createNewConversation,
    clearChatHistory,
    addMessageToConversation
  } = useConversations();

  // Socket.IO callbacks with useCallback to prevent re-renders
  const onAudioStarting = useCallback(() => {
    setVoiceState('speaking');
    startAudioLevelSimulation();
  }, [startAudioLevelSimulation]);

  const onAudioFinished = useCallback(() => {
    setVoiceState('idle');
    stopAudioLevelSimulation();
  }, [stopAudioLevelSimulation]);

  const onAudioStopped = useCallback(() => {
    setVoiceState('idle');
    stopAudioLevelSimulation();
  }, [stopAudioLevelSimulation]);

  // Socket.IO hook  
  const { socket, isConnected } = useSocketIO({
    onAudioStarting,
    onAudioFinished,
    onAudioStopped,
    onPomodoroCommand: (data) => {
      console.log('🍅 Received pomodoro command:', data.action);
      if (data.action === 'start') {
        pomodoroWidgetRef.current?.startTimer();
      } else if (data.action === 'stop') {
        pomodoroWidgetRef.current?.pauseTimer();
      } else if (data.action === 'reset') {
        pomodoroWidgetRef.current?.resetTimer();
      }
    },
    onPomodoroPhaseComplete: (data) => {
      console.log('🍅 Received pomodoro phase complete:', data);
      
      // Make TTS announcement
      speakText(data.message);
      
      if (data.nextPhase === 'prompt') {
        // After break, wait for user response to continue
        setIsAwaitingPomodoroConfirmation(true);
      }
    },
    onPomodoroSync: (data) => {
      console.log('🍅 FRONTEND: Received pomodoro sync:', data);
      
      // Sync the frontend widget with backend service state
      if (data.action === 'start_work' && data.duration) {
        console.log(`🍅 FRONTEND: Starting timer with ${data.duration} minutes`);
        // Start work session in widget with the correct duration
        pomodoroWidgetRef.current?.startTimer(data.duration);
      } else if (data.action === 'start_break' && data.duration) {
        console.log('🍅 FRONTEND: Break started, maintaining widget state');
        // Widget doesn't need to show break timer - that's handled conversationally
        // Just keep the widget in its current state showing the break phase
      } else if (data.action === 'stop') {
        console.log('🍅 FRONTEND: Stopping/resetting timer');
        // Reset widget to idle
        pomodoroWidgetRef.current?.resetTimer();
      }
    },
    onMusicStateUpdate: (data) => {
      console.log('🎵 Received music state update:', data);
      handleSpotifyStateUpdate(data);
    }
  });

  // API hook
  const {
    isLoading: apiLoading,
    sendMessage: apiSendMessage,
    loadAvailableVoices,
    changeTTSMode,
    changeVoice: apiChangeVoice,
    speakTextViaAPI
  } = useJarvisAPI({
    onMessageSent: (message, isVoice) => {
      addMessageToConversation('user', message);
      if (isVoice) {
        console.log('💭 User finished speaking, Jarvis processing');
        setVoiceState('processing');
      }
    },
    onResponseReceived: (content, model, taskType) => {
      addMessageToConversation('assistant', content, model, taskType);
    },
    onModelChanged: setCurrentModel,
    onTaskTypeDetected: setDetectedTaskType
  });

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
        startAudioLevelSimulation();
      } else {
        stopAudioLevelSimulation();
      }
    },
    onStateChange: setVoiceState
  });

  // Voice recognition hook
  const { 
    transcript, 
    startListening, 
    stopListening 
  } = useVoiceRecognition({
    onTranscript: (text) => sendMessage(text, true),
    onStateChange: setVoiceState
  });

  // Initialize on mount
  useEffect(() => {
    loadConversations();
    loadAndSetAvailableVoices();
    checkSpotifyConnection();
  }, [ttsMode]);

  // Check Spotify connection status
  const checkSpotifyConnection = async () => {
    try {
      const response = await fetch('http://localhost:7777/spotify/status');
      const data = await response.json();
      setSpotifyConnected(data.success && data.connected && !data.expired);
    } catch (error) {
      console.error('Failed to check Spotify connection:', error);
      setSpotifyConnected(false);
    }
  };

  // Load available voices and update state
  const loadAndSetAvailableVoices = async () => {
    const voices = await loadAvailableVoices(ttsMode);
    setAvailableVoices(voices);
    
    if (ttsMode === 'edge' && voices.length > 0 && !voices.includes(voice)) {
      setVoice(voices[0]);
    }
  };

  // Send message handler
  const sendMessage = async (text: string, isVoiceInput: boolean = false) => {
    if (!text.trim()) return;
    
    // Handle Pomodoro confirmation if waiting for response
    if (isAwaitingPomodoroConfirmation && isVoiceInput) {
      const lowerText = text.toLowerCase().trim();
      if (lowerText.includes('yes') || lowerText.includes('continue') || lowerText.includes('sure') || lowerText.includes('start')) {
        console.log('🍅 User confirmed to continue Pomodoro via voice');
        // Send continue message to backend to start new session
        try {
          const result = await apiSendMessage('continue pomodoro', false, getCurrentMessages());
          speakText('Starting your next Pomodoro session!');
        } catch (error) {
          console.error('Failed to continue Pomodoro:', error);
        }
        setIsAwaitingPomodoroConfirmation(false);
        return;
      } else if (lowerText.includes('no') || lowerText.includes('stop') || lowerText.includes('cancel')) {
        console.log('🍅 User declined to continue Pomodoro via voice');
        speakText('Pomodoro session ended. Great work!');
        setIsAwaitingPomodoroConfirmation(false);
        return;
      }
    }
    
    if (!activeConversation) {
      createNewConversation();
      setTimeout(() => sendMessage(text, isVoiceInput), 100);
      return;
    }

    try {
      const result = await apiSendMessage(text, isVoiceInput, getCurrentMessages());
      
      // Handle TTS for voice inputs
      if (result && result.content && isVoiceInput) {
        console.log('🗣️ Speaking response:', { 
          mode: result.ttsMode, 
          content: result.content.slice(0, 50) + '...' 
        });
        
        if (result.ttsMode === 'system') {
          // System TTS - start animation and TTS together
          console.log('🤖 System TTS - starting animation and TTS together');
          setVoiceState('speaking');
          startAudioLevelSimulation();
          
          speakText(result.content).catch(error => {
            // Only log error if it's not due to user stopping TTS
            if (error && error.message !== 'Speech interrupted by user') {
              console.error('System TTS failed:', error);
            } else {
              console.log('🛑 System TTS interrupted by user');
            }
            // Cleanup states - the TTS hook should have already cleaned them up,
            // but this ensures consistency
            setVoiceState('idle');
            stopAudioLevelSimulation();
          });
        } else {
          // Edge TTS - WebSocket will handle animation timing
          console.log('🔥 Edge TTS - using WebSocket for perfect sync');
          
          try {
            const ttsResult = await speakTextViaAPI(result.content);
            if (ttsResult.success) {
              console.log('✅ Edge TTS request completed successfully in', ttsResult.ttsDuration, 'ms');
            } else {
              console.error('❌ Edge TTS failed:', ttsResult.message);
              setVoiceState('idle');
              stopAudioLevelSimulation();
            }
          } catch (error) {
            console.error('🚫 Edge TTS request failed:', error);
            setVoiceState('idle');
            stopAudioLevelSimulation();
          }
        }
      } else {
        // No voice output - clean state
        console.log('🔇 No voice output - cleaning up states');
        setVoiceState('idle');
        stopAudioLevelSimulation();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setVoiceState('idle');
      stopAudioLevelSimulation();
    }
  };

  // Voice control handlers
  const handleStartVoice = () => {
    setIsVoiceEnabled(true);
    startListening();
  };

  const handleStopVoice = () => {
    setIsVoiceEnabled(false);
    stopListening();
  };

  const handleStopTTS = () => {
    console.log('🛑 User stopped TTS - cleaning up states');
    stopTTSHook();
    stopAudioLevelSimulation();
    setVoiceState('idle');
  };

  // Settings handlers
  const handleTTSModeChange = async (mode: 'system' | 'edge') => {
    setTtsMode(mode);
    await changeTTSMode(mode);
  };

  const handleVoiceChange = async (newVoice: string) => {
    setVoice(newVoice);
    await apiChangeVoice(newVoice, ttsMode);
  };

  const saveSettings = () => {
    localStorage.setItem('jarvis_settings', JSON.stringify({
      voice,
      speechRate,
      ttsMode
    }));
    setSettingsOpen(false);
  };

  // Window management handlers
  const bringWindowToFront = (windowId: 'planning' | 'kanban') => {
    setWindowZIndices(prev => ({
      ...prev,
      [windowId]: nextZIndex
    }));
    setNextZIndex(prev => prev + 1);
  };

  // Spotify handlers
  const handleSpotifyConnect = async () => {
    try {
      const response = await fetch('http://localhost:7777/auth/spotify');
      const data = await response.json();
      
      if (data.success && data.authUrl) {
        // Open Spotify auth in new window
        window.open(data.authUrl, 'spotify-auth', 'width=600,height=700');
        
        // Check connection status periodically
        const checkConnection = setInterval(async () => {
          await checkSpotifyConnection();
          if (spotifyConnected) {
            clearInterval(checkConnection);
          }
        }, 2000);
        
        // Clear interval after 60 seconds
        setTimeout(() => clearInterval(checkConnection), 60000);
      }
    } catch (error) {
      console.error('Failed to initiate Spotify connection:', error);
    }
  };

  const handleSpotifyStateUpdate = (data: Record<string, unknown>) => {
    // Handle real-time music state updates from Socket.IO
    console.log('🎵 Music state update received:', data);
  };

  return (
    <div className="relative h-screen bg-background overflow-hidden">
      
      {/* Chat History */}
      <ChatHistory 
        isVisible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        messages={getCurrentMessages()}
        onClearHistory={clearChatHistory}
      />

      {/* Main Interface */}
      <div className="flex flex-col h-full">
        {/* Model Indicator - Top Left */}
        <div className="absolute top-6 left-6 z-30 flex items-center gap-2">
          {/* Model Indicator */}
          {detectedTaskType && (
            <div className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-xl">
              {detectedTaskType.toUpperCase()} MODE
            </div>
          )}
        </div>

        {/* Settings Dialog - Keep position for dialog */}
        <div className="absolute top-6 right-6 z-30">
          
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

        {/* Widget Toggle Button - Top Center */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-30">
          <button
            onClick={() => setShowWidgets(!showWidgets)}
            className="bg-card/20 backdrop-blur-sm text-foreground 
                       rounded-xl px-4 py-1 transition-all duration-200 hover:bg-card/30
                       shadow-lg hover:shadow-xl cursor-pointer"
            title={showWidgets ? "Hide Widgets" : "Show Widgets"}
          >
            <div className="w-6 h-0.5 bg-foreground rounded-full mx-auto"></div>
          </button>
        </div>

        {/* Widget Container - Top Center */}
        <div className={`absolute top-12 left-1/2 transform -translate-x-1/2 z-30 flex gap-4 items-center justify-center
                        transition-all duration-500 ease-in-out
                        ${showWidgets 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
                        }`}>
          {/* Spotify Player Widget */}
          <SpotifyPlayer 
            isConnected={spotifyConnected}
            onConnect={handleSpotifyConnect}
            onMusicStateUpdate={handleSpotifyStateUpdate}
          />
          
          {/* Pomodoro Widget */}
          <PomodoroWidget 
            ref={pomodoroWidgetRef}
            onBreakStart={() => {
              console.log('🍅 Break time started');
              speakText("Time for a 5-minute break!");
            }}
            onPromptContinue={() => {
              console.log('🍅 Prompting to continue Pomodoro');
              speakText("Ready to continue your Pomodoro session? Say yes to continue or no to stop.");
              setIsAwaitingPomodoroConfirmation(true);
            }}
            onContinueYes={() => {
              console.log('🍅 User chose to continue via UI');
              setIsAwaitingPomodoroConfirmation(false);
            }}
            onContinueNo={() => {
              console.log('🍅 User chose to stop via UI');
              setIsAwaitingPomodoroConfirmation(false);
            }}
          />
        </div>

        {/* App Buttons - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-3">
          <Button
            onClick={() => setShowKanbanApp(!showKanbanApp)}
            variant="ghost"
            size="sm"
            className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
            title="Kanban Board"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 002 2m0 0v10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2" />
            </svg>
          </Button>
          <Button
            onClick={() => setShowPlanningApp(!showPlanningApp)}
            variant="ghost"
            size="sm"
            className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
            title="Planning App"
          >
            <Calendar className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => setShowChatHistory(!showChatHistory)}
            variant="ghost"
            size="sm"
            className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
            title="Chat History"
          >
            <History className="w-5 h-5" />
          </Button>
          <Button
            onClick={() => setSettingsOpen(true)}
            variant="ghost"
            size="sm"
            className="text-foreground hover:text-foreground hover:bg-accent cursor-pointer p-3"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Planning App Floating Window */}
        <FloatingWindow
          isOpen={showPlanningApp}
          onClose={() => setShowPlanningApp(false)}
          title="Planning App"
          defaultWidth={800}
          defaultHeight={600}
          zIndex={windowZIndices.planning}
          onFocus={() => bringWindowToFront('planning')}
        >
          <iframe
            src="/planning"
            className="w-full h-full border-0"
            title="Planning App"
          />
        </FloatingWindow>

        {/* Kanban Board Floating Window */}
        <FloatingWindow
          isOpen={showKanbanApp}
          onClose={() => setShowKanbanApp(false)}
          title="Kanban Board"
          defaultWidth={1200}
          defaultHeight={800}
          zIndex={windowZIndices.kanban}
          onFocus={() => bringWindowToFront('kanban')}
        >
          <iframe
            src="/kanban"
            className="w-full h-full border-0"
            title="Kanban Board"
          />
        </FloatingWindow>
      </div>
    </div>
  );
}