import axios from 'axios';

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  uri: string;
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  shuffle_state: boolean;
  repeat_state: string;
  volume_percent: number;
  device: {
    id: string;
    name: string;
    type: string;
    volume_percent: number;
  };
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
  };
}

export class SpotifyService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl = 'https://api.spotify.com/v1';
  private authUrl = 'https://accounts.spotify.com';
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // Minimum 1 second between requests
  private retryAfter: number = 0;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(): string {
    const scopes = [
      'user-modify-playback-state',
      'user-read-playback-state', 
      'user-read-currently-playing',
      'streaming',
      'user-read-email',
      'user-read-private'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: this.generateState()
    });

    return `${this.authUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<SpotifyTokens> {
    try {
      const response = await axios.post(`${this.authUrl}/api/token`, {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = response.data;
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      
      console.log('🎵 SPOTIFY: Successfully exchanged authorization code for tokens');
      return tokens;
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to exchange code for tokens:', error);
      throw new Error('Failed to get Spotify access tokens');
    }
  }

  async refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
    try {
      const response = await axios.post(`${this.authUrl}/api/token`, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens = response.data;
      tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      tokens.refresh_token = refreshToken; // Keep original refresh token if not provided
      
      console.log('🔄 SPOTIFY: Successfully refreshed access token');
      return tokens;
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to refresh tokens:', error);
      throw new Error('Failed to refresh Spotify tokens');
    }
  }

  async getCurrentPlayback(accessToken: string): Promise<SpotifyPlaybackState | null> {
    // Check rate limiting
    await this.checkRateLimit();
    
    try {
      const response = await axios.get(`${this.baseUrl}/me/player`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      this.lastRequestTime = Date.now();
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 204) {
        return null; // No active playback
      }
      if (error.response?.status === 429) {
        // Handle rate limiting
        const retryAfter = parseInt(error.response.headers['retry-after'] || '3');
        this.retryAfter = Date.now() + (retryAfter * 1000);
        console.warn(`⏳ SPOTIFY: Rate limited. Retry after ${retryAfter} seconds`);
        return null;
      }
      console.error('🚨 SPOTIFY: Failed to get current playback:', error.message);
      throw error;
    }
  }

  async play(accessToken: string, uris?: string[]): Promise<void> {
    try {
      const body: any = {};
      if (uris) {
        body.uris = uris;
      }

      await axios.put(`${this.baseUrl}/me/player/play`, body, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('▶️ SPOTIFY: Started playback');
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to start playback:', error);
      throw error;
    }
  }

  async pause(accessToken: string): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/me/player/pause`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('⏸️ SPOTIFY: Paused playback');
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to pause playback:', error);
      throw error;
    }
  }

  async next(accessToken: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/me/player/next`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('⏭️ SPOTIFY: Skipped to next track');
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to skip to next track:', error);
      throw error;
    }
  }

  async previous(accessToken: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/me/player/previous`, {}, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log('⏮️ SPOTIFY: Skipped to previous track');
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to skip to previous track:', error);
      throw error;
    }
  }

  async setVolume(accessToken: string, volumePercent: number): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/me/player/volume`, {}, {
        params: { volume_percent: volumePercent },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`🔊 SPOTIFY: Set volume to ${volumePercent}%`);
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to set volume:', error);
      throw error;
    }
  }

  async search(accessToken: string, query: string, type: string = 'track', limit: number = 10): Promise<SpotifySearchResult> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          q: query,
          type,
          limit
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`🔍 SPOTIFY: Search results for "${query}": ${response.data.tracks?.items?.length || 0} tracks`);
      return response.data;
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to search:', error);
      throw error;
    }
  }

  async getSavedTracks(accessToken: string, limit: number = 50): Promise<SpotifyTrack[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/tracks`, {
        params: { limit },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const tracks = response.data.items.map((item: any) => item.track);
      console.log(`💾 SPOTIFY: Retrieved ${tracks.length} saved tracks`);
      return tracks;
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to get saved tracks:', error);
      throw error;
    }
  }

  async getAvailableDevices(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/me/player/devices`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      console.log(`🎧 SPOTIFY: Found ${response.data.devices?.length || 0} available devices`);
      return response.data.devices || [];
    } catch (error) {
      console.error('🚨 SPOTIFY: Failed to get available devices:', error);
      throw error;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  isTokenExpired(tokens: SpotifyTokens): boolean {
    return Date.now() >= tokens.expires_at;
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Check if we're in a retry-after period
    if (this.retryAfter > now) {
      const waitTime = this.retryAfter - now;
      console.log(`⏳ SPOTIFY: Waiting ${waitTime}ms due to rate limit`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Check minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

}

export const createSpotifyService = (clientId: string, clientSecret: string, redirectUri: string): SpotifyService => {
  return new SpotifyService(clientId, clientSecret, redirectUri);
};