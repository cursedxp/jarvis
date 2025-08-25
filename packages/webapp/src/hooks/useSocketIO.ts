'use client'

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketIOProps {
  onAudioStarting?: (data: any) => void;
  onAudioFinished?: (data: any) => void;
  onAudioStopped?: (data: any) => void;
}

export function useSocketIO({ 
  onAudioStarting, 
  onAudioFinished, 
  onAudioStopped 
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

    socket.on('audio_starting', handleAudioStarting);
    socket.on('audio_finished', handleAudioFinished);
    socket.on('audio_stopped', handleAudioStopped);
    
    // Cleanup event listeners
    return () => {
      socket.off('audio_starting', handleAudioStarting);
      socket.off('audio_finished', handleAudioFinished);
      socket.off('audio_stopped', handleAudioStopped);
    };
  }, [socket, onAudioStarting, onAudioFinished, onAudioStopped]);

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