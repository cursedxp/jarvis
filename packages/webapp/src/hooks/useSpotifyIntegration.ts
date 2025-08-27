'use client'

import { useState, useCallback } from 'react'

export function useSpotifyIntegration() {
  const [spotifyConnected, setSpotifyConnected] = useState(false)

  // Check Spotify connection status
  const checkSpotifyConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:7777/spotify/status')
      const data = await response.json()
      setSpotifyConnected(data.success && data.connected && !data.expired)
    } catch (error) {
      console.error('Failed to check Spotify connection:', error)
      setSpotifyConnected(false)
    }
  }, [])

  const handleSpotifyConnect = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:7777/auth/spotify')
      const data = await response.json()
      
      if (data.success && data.authUrl) {
        // Open Spotify auth in new window
        window.open(data.authUrl, 'spotify-auth', 'width=600,height=700')
        
        // Check connection status periodically
        const checkConnection = setInterval(async () => {
          await checkSpotifyConnection()
          if (spotifyConnected) {
            clearInterval(checkConnection)
          }
        }, 2000)
        
        // Clear interval after 60 seconds
        setTimeout(() => clearInterval(checkConnection), 60000)
      }
    } catch (error) {
      console.error('Failed to initiate Spotify connection:', error)
    }
  }, [checkSpotifyConnection, spotifyConnected])

  const handleSpotifyStateUpdate = useCallback((data: Record<string, unknown>) => {
    // Handle real-time music state updates from Socket.IO
    console.log('🎵 Music state update received:', data)
  }, [])

  return {
    spotifyConnected,
    checkSpotifyConnection,
    handleSpotifyConnect,
    handleSpotifyStateUpdate
  }
}