'use client'

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Settings, History, Calendar } from "lucide-react";
import dynamic from 'next/dynamic';

// Custom components
import { AnimatedBlob } from './AnimatedBlob';
import { VoiceControls } from './VoiceControls';
import { SettingsDialog } from './SettingsDialog';
import { ChatHistory } from './ChatHistory';

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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  
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
    onAudioStopped
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
  }, [ttsMode]);

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
            console.error('System TTS failed:', error);
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
    stopTTSHook();
    stopAudioLevelSimulation();
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

  return (
    <div className="relative h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black overflow-hidden">
      
      {/* Chat History */}
      <ChatHistory 
        isVisible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        messages={getCurrentMessages()}
        onClearHistory={clearChatHistory}
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
          defaultWidth={800}
          defaultHeight={600}
        >
          <iframe
            src="/planning"
            className="w-full h-full border-0"
            title="Planning App"
          />
        </FloatingWindow>
      </div>
    </div>
  );
}