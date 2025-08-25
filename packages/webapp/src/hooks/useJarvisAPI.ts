'use client'

import { useState, useCallback } from 'react';
import { Message } from './useConversations';

interface UseJarvisAPIProps {
  onMessageSent?: (message: string, isVoice: boolean) => void;
  onResponseReceived?: (content: string, model?: string, taskType?: string) => void;
  onModelChanged?: (model: string) => void;
  onTaskTypeDetected?: (taskType: string) => void;
}

export function useJarvisAPI({
  onMessageSent,
  onResponseReceived,
  onModelChanged,
  onTaskTypeDetected
}: UseJarvisAPIProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Send message to API
  const sendMessage = useCallback(async (
    text: string, 
    isVoiceInput: boolean = false,
    conversationHistory: Message[] = []
  ) => {
    if (!text.trim()) return;
    
    console.log('💬 Sending message to API:', text);
    setIsLoading(true);
    setError(null);
    
    // Notify that message is being sent
    onMessageSent?.(text, isVoiceInput);
    
    try {
      const response = await fetch('http://localhost:7777/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chat',
          payload: { 
            message: text,
            conversationHistory
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update state based on response
        if (data.model) onModelChanged?.(data.model);
        if (data.taskType) onTaskTypeDetected?.(data.taskType);
        
        // Notify response received
        onResponseReceived?.(data.content, data.model, data.taskType);
        
        return {
          content: data.content,
          model: data.model,
          taskType: data.taskType,
          ttsMode: data.ttsMode
        };
      } else {
        throw new Error(`API request failed: ${response.statusText}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error sending message:', error);
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [onMessageSent, onResponseReceived, onModelChanged, onTaskTypeDetected]);

  // Load available voices
  const loadAvailableVoices = useCallback(async (ttsMode: 'system' | 'edge') => {
    try {
      if (ttsMode === 'edge') {
        const response = await fetch('http://localhost:7777/api/tts/voices');
        if (response.ok) {
          const data = await response.json();
          return data.voices || [];
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to load voices:', error);
      return [];
    }
  }, []);

  // Change TTS mode
  const changeTTSMode = useCallback(async (mode: 'system' | 'edge') => {
    try {
      await fetch('http://localhost:7777/api/tts/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      return true;
    } catch (error) {
      console.error('Failed to change TTS mode:', error);
      return false;
    }
  }, []);

  // Change voice
  const changeVoice = useCallback(async (voice: string, ttsMode: 'system' | 'edge') => {
    if (ttsMode === 'edge') {
      try {
        await fetch('http://localhost:7777/api/tts/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voice })
        });
        return true;
      } catch (error) {
        console.error('Failed to change voice:', error);
        return false;
      }
    }
    return true;
  }, []);

  // Speak text via API
  const speakTextViaAPI = useCallback(async (text: string) => {
    try {
      const response = await fetch('http://localhost:7777/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('🚫 Edge TTS request failed:', error);
      throw error;
    }
  }, []);

  return {
    isLoading,
    error,
    sendMessage,
    loadAvailableVoices,
    changeTTSMode,
    changeVoice,
    speakTextViaAPI
  };
}