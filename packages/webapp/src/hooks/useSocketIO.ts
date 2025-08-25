'use client'

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketIOProps {
  onAudioStarting?: (data: Record<string, unknown>) => void;
  onAudioFinished?: (data: Record<string, unknown>) => void;
  onAudioStopped?: (data: Record<string, unknown>) => void;
  onPomodoroCommand?: (data: { action: 'start' | 'stop' | 'pause' | 'reset' }) => void;
  onPomodoroPhaseComplete?: (data: { phase: 'work' | 'break', nextPhase: 'break' | 'prompt', message: string }) => void;
  onPomodoroSync?: (data: { action: string, phase: string, duration?: number }) => void;
}

export function useSocketIO({ 
  onAudioStarting, 
  onAudioFinished, 
  onAudioStopped,
  onPomodoroCommand,
  onPomodoroPhaseComplete,
  onPomodoroSync
}: UseSocketIOProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO connection for real-time TTS events
    const socketInstance = io('http://localhost:7777');
    setSocket(socketInstance);
    
    // Connection status handlers
    socketInstance.on('connect', () => {
      console.log('🔗 Connected to server via Socket.IO');
      setIsConnected(true);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      setIsConnected(false);
    });
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      socketInstance.disconnect();
    };
  }, []); // Only run once on mount

  // Set up event listeners in a separate effect
  useEffect(() => {
    if (!socket) return;

    // Listen for audio events from server
    const handleAudioStarting = (data: any) => {
      console.log('🎵 Server audio starting event received:', data);
      onAudioStarting?.(data);
    };
    
    const handleAudioFinished = (data: any) => {
      console.log('🔚 Server audio finished event received:', data);
      onAudioFinished?.(data);
    };
    
    const handleAudioStopped = (data: any) => {
      console.log('🛑 Server audio stopped event received:', data);
      onAudioStopped?.(data);
    };

    const handlePomodoroCommand = (data: { action: 'start' | 'stop' | 'pause' | 'reset' }) => {
      console.log('🍅 Server pomodoro command received:', data);
      onPomodoroCommand?.(data);
    };

    const handlePomodoroPhaseComplete = (data: { phase: 'work' | 'break', nextPhase: 'break' | 'prompt', message: string }) => {
      console.log('🍅 Server pomodoro phase complete:', data);
      onPomodoroPhaseComplete?.(data);
    };

    const handlePomodoroSync = (data: { action: string, phase: string, duration?: number }) => {
      console.log('🍅 Server pomodoro sync:', data);
      onPomodoroSync?.(data);
    };

    socket.on('audio_starting', handleAudioStarting);
    socket.on('audio_finished', handleAudioFinished);
    socket.on('audio_stopped', handleAudioStopped);
    socket.on('pomodoro_command', handlePomodoroCommand);
    socket.on('pomodoro_phase_complete', handlePomodoroPhaseComplete);
    socket.on('pomodoro_sync', handlePomodoroSync);
    
    // Cleanup event listeners
    return () => {
      socket.off('audio_starting', handleAudioStarting);
      socket.off('audio_finished', handleAudioFinished);
      socket.off('audio_stopped', handleAudioStopped);
      socket.off('pomodoro_command', handlePomodoroCommand);
      socket.off('pomodoro_phase_complete', handlePomodoroPhaseComplete);
      socket.off('pomodoro_sync', handlePomodoroSync);
    };
  }, [socket, onAudioStarting, onAudioFinished, onAudioStopped, onPomodoroCommand, onPomodoroPhaseComplete, onPomodoroSync]);

  // Emit command via WebSocket
  const emitCommand = useCallback((command: any, callback?: (response: any) => void) => {
    if (socket && isConnected) {
      socket.emit('command', command, callback);
    } else {
      console.warn('Socket not connected, cannot emit command');
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    emitCommand
  };
}