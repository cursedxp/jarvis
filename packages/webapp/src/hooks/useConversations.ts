'use client'

import { useState, useCallback } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  taskType?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // Load conversations from localStorage
  const loadConversations = useCallback(() => {
    try {
      const saved = localStorage.getItem('jarvis_conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        const conversations = parsed.map((conv: unknown) => {
          const convObj = conv as Record<string, unknown>;
          return {
            ...convObj,
            createdAt: new Date(convObj.createdAt as string),
            updatedAt: new Date(convObj.updatedAt as string),
            messages: (convObj.messages as unknown[]).map((msg: unknown) => {
              const msgObj = msg as Record<string, unknown>;
              return {
                ...msgObj,
                timestamp: new Date(msgObj.timestamp as string)
              };
            })
          };
        });
        setConversations(conversations);
        
        if (conversations.length > 0) {
          setActiveConversation(conversations[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  // Get current conversation messages
  const getCurrentMessages = useCallback((): Message[] => {
    if (!activeConversation) return [];
    const conversation = conversations.find(c => c.id === activeConversation);
    return conversation?.messages || [];
  }, [activeConversation, conversations]);

  // Create new conversation
  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversation(newConv.id);
  }, []);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    if (activeConversation) {
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === activeConversation 
            ? { 
                ...conv, 
                messages: [],
                title: 'New Chat',
                updatedAt: new Date()
              }
            : conv
        );
        localStorage.setItem('jarvis_conversations', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeConversation]);

  // Add message to conversation
  const addMessageToConversation = useCallback((
    role: 'user' | 'assistant', 
    content: string, 
    model?: string, 
    taskType?: string
  ) => {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
      model,
      taskType
    };
    
    console.log('📝 Adding message to conversation:', { 
      role, 
      content: content ? content.substring(0, 50) + '...' : 'No content', 
      activeConversation 
    });
    
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === activeConversation 
          ? { 
              ...conv, 
              messages: [...conv.messages, message],
              title: conv.messages.length === 0 ? (content ? content.slice(0, 30) + '...' : 'New Chat') : conv.title,
              updatedAt: new Date()
            }
          : conv
      );
      console.log('📚 Updated conversations:', updated.length, 'conversations');
      
      // Save to localStorage with the updated state
      localStorage.setItem('jarvis_conversations', JSON.stringify(updated));
      
      return updated;
    });
  }, [activeConversation]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    loadConversations,
    getCurrentMessages,
    createNewConversation,
    clearChatHistory,
    addMessageToConversation
  };
}