import { BaseHandler } from './base-handler';
import { Command, Orchestrator } from '../orchestrator';
import { intentAnalyzer } from '../../services/intent-analyzer';
import { SpotifyService, SpotifyTokens } from '../../services/spotify-service';
import { UserPreferenceManager } from '../../services/user-preferences';

export class MusicHandler extends BaseHandler {
  private userPreferences: UserPreferenceManager;
  private spotifyService: SpotifyService;
  private io?: any;

  constructor(
    _orchestrator: Orchestrator, 
    userPreferences: UserPreferenceManager,
    spotifyService: SpotifyService,
    io?: any
  ) {
    super();
    this.userPreferences = userPreferences;
    this.spotifyService = spotifyService;
    this.io = io;
    console.log('🎵 MUSIC HANDLER: Initialized with Spotify service');
  }

  getHandlerName(): string {
    return 'MusicHandler';
  }

  getCommands(): string[] {
    return ['music', 'spotify', 'play', 'pause', 'next', 'previous', 'volume'];
  }

  async handle(command: Command): Promise<any> {
    const { message } = command.payload;
    
    console.log('🎵 MUSIC HANDLER: Processing message:', message);
    
    try {
      // Check if user has Spotify tokens
      const tokens = await this.getUserSpotifyTokens();
      if (!tokens) {
        return this.createErrorResponse('music-auth-required', 
          'Spotify authentication required. Please connect your Spotify account first.',
          { authUrl: this.spotifyService.getAuthUrl() }
        );
      }

      // Refresh tokens if expired
      const validTokens = await this.ensureValidTokens(tokens);
      
      // Use AI-powered intent analysis for music commands
      const analysis = await intentAnalyzer.analyzeIntent(message, []);
      console.log('🎵 MUSIC HANDLER: Intent analysis result:', {
        intent: analysis.intent,
        confidence: analysis.confidence,
        entities: analysis.entities,
        reasoning: analysis.reasoning
      });
      
      // Handle music-specific intents
      const result = await this.handleMusicIntent(analysis, validTokens, message);
      
      // Emit real-time updates via Socket.IO
      if (this.io && result.success) {
        this.io.emit('music_state_update', {
          action: result.action,
          data: result.data
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Error processing command:', error);
      return this.createErrorResponse('music-error',
        `I encountered an error while processing your music request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handleMusicIntent(analysis: any, tokens: SpotifyTokens, originalMessage: string): Promise<any> {
    const { intent, entities } = analysis;
    
    switch (intent) {
      case 'MUSIC_PLAY':
        return await this.handlePlay(tokens, entities, originalMessage);
      
      case 'MUSIC_PAUSE':
        return await this.handlePause(tokens);
      
      case 'MUSIC_NEXT':
        return await this.handleNext(tokens);
      
      case 'MUSIC_PREVIOUS':
        return await this.handlePrevious(tokens);
      
      case 'MUSIC_VOLUME':
        return await this.handleVolume(tokens, entities);
      
      case 'MUSIC_SEARCH':
        return await this.handleSearch(tokens, entities, originalMessage);
      
      case 'MUSIC_STATUS':
        return await this.handleStatus(tokens);
      
      default:
        // Check for basic music keywords if AI intent is unclear
        return await this.handleBasicCommands(originalMessage.toLowerCase(), tokens);
    }
  }

  private async handlePlay(tokens: SpotifyTokens, entities: any, _originalMessage: string): Promise<any> {
    try {
      // Check if specific track/artist was requested
      if (entities.songName || entities.artistName) {
        const searchQuery = entities.songName || entities.artistName;
        const searchResults = await this.spotifyService.search(tokens.access_token, searchQuery);
        
        if (searchResults.tracks.items.length > 0) {
          const track = searchResults.tracks.items[0];
          await this.spotifyService.play(tokens.access_token, [track.uri]);
          
          return this.createSuccessResponse('music-play', {
            action: 'play',
            track: {
              name: track.name,
              artist: track.artists[0]?.name,
              uri: track.uri
            }
          }, `Now playing "${track.name}" by ${track.artists[0]?.name}`);
        } else {
          return this.createErrorResponse('music-not-found', 
            `I couldn't find any tracks matching "${searchQuery}"`);
        }
      } else {
        // Resume current playback
        await this.spotifyService.play(tokens.access_token);
        
        const currentPlayback = await this.spotifyService.getCurrentPlayback(tokens.access_token);
        const trackInfo = currentPlayback?.item ? 
          `"${currentPlayback.item.name}" by ${currentPlayback.item.artists[0]?.name}` : 
          'your music';
          
        return this.createSuccessResponse('music-play', {
          action: 'resume',
          playback: currentPlayback
        }, `Resuming ${trackInfo}`);
      }
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Play command failed:', error);
      return this.createErrorResponse('music-play-failed', 
        'Failed to start playback. Make sure Spotify is active on one of your devices.');
    }
  }

  private async handlePause(tokens: SpotifyTokens): Promise<any> {
    try {
      await this.spotifyService.pause(tokens.access_token);
      
      return this.createSuccessResponse('music-pause', {
        action: 'pause'
      }, 'Music paused');
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Pause command failed:', error);
      return this.createErrorResponse('music-pause-failed', 'Failed to pause playback');
    }
  }

  private async handleNext(tokens: SpotifyTokens): Promise<any> {
    try {
      await this.spotifyService.next(tokens.access_token);
      
      // Get new current track info
      const currentPlayback = await this.spotifyService.getCurrentPlayback(tokens.access_token);
      const trackInfo = currentPlayback?.item ? 
        `"${currentPlayback.item.name}" by ${currentPlayback.item.artists[0]?.name}` : 
        'next track';
      
      return this.createSuccessResponse('music-next', {
        action: 'next',
        track: currentPlayback?.item
      }, `Skipped to ${trackInfo}`);
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Next command failed:', error);
      return this.createErrorResponse('music-next-failed', 'Failed to skip to next track');
    }
  }

  private async handlePrevious(tokens: SpotifyTokens): Promise<any> {
    try {
      await this.spotifyService.previous(tokens.access_token);
      
      // Get new current track info
      const currentPlayback = await this.spotifyService.getCurrentPlayback(tokens.access_token);
      const trackInfo = currentPlayback?.item ? 
        `"${currentPlayback.item.name}" by ${currentPlayback.item.artists[0]?.name}` : 
        'previous track';
      
      return this.createSuccessResponse('music-previous', {
        action: 'previous',
        track: currentPlayback?.item
      }, `Skipped to ${trackInfo}`);
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Previous command failed:', error);
      return this.createErrorResponse('music-previous-failed', 'Failed to skip to previous track');
    }
  }

  private async handleVolume(tokens: SpotifyTokens, entities: any): Promise<any> {
    try {
      const volume = entities.volumeLevel || 50; // Default to 50% if not specified
      await this.spotifyService.setVolume(tokens.access_token, volume);
      
      return this.createSuccessResponse('music-volume', {
        action: 'volume',
        volume
      }, `Volume set to ${volume}%`);
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Volume command failed:', error);
      return this.createErrorResponse('music-volume-failed', 'Failed to set volume');
    }
  }

  private async handleSearch(tokens: SpotifyTokens, entities: any, originalMessage: string): Promise<any> {
    try {
      const query = entities.searchQuery || originalMessage.replace(/search|find|look for/gi, '').trim();
      const results = await this.spotifyService.search(tokens.access_token, query);
      
      const tracks = results.tracks.items.slice(0, 5); // Top 5 results
      
      return this.createSuccessResponse('music-search', {
        action: 'search',
        query,
        tracks
      }, `Found ${results.tracks.items.length} tracks for "${query}"`);
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Search command failed:', error);
      return this.createErrorResponse('music-search-failed', 'Failed to search for music');
    }
  }

  private async handleStatus(tokens: SpotifyTokens): Promise<any> {
    try {
      const playback = await this.spotifyService.getCurrentPlayback(tokens.access_token);
      
      if (!playback) {
        return this.createSuccessResponse('music-status', {
          action: 'status',
          isPlaying: false
        }, 'No music is currently playing');
      }
      
      const track = playback.item;
      const statusMessage = playback.is_playing ? 
        `Currently playing "${track?.name}" by ${track?.artists[0]?.name}` :
        `Paused on "${track?.name}" by ${track?.artists[0]?.name}`;
      
      return this.createSuccessResponse('music-status', {
        action: 'status',
        playback
      }, statusMessage);
    } catch (error) {
      console.error('🎵 MUSIC HANDLER: Status command failed:', error);
      return this.createErrorResponse('music-status-failed', 'Failed to get playback status');
    }
  }

  private async handleBasicCommands(message: string, tokens: SpotifyTokens): Promise<any> {
    if (message.includes('play')) {
      return await this.handlePlay(tokens, {}, message);
    } else if (message.includes('pause') || message.includes('stop')) {
      return await this.handlePause(tokens);
    } else if (message.includes('next') || message.includes('skip')) {
      return await this.handleNext(tokens);
    } else if (message.includes('previous') || message.includes('back')) {
      return await this.handlePrevious(tokens);
    } else if (message.includes('status') || message.includes('what') && message.includes('playing')) {
      return await this.handleStatus(tokens);
    }
    
    return this.createErrorResponse('music-unknown-command', 
      'I can help you control Spotify playback. Try "play music", "pause", "next song", or "what\'s playing?"');
  }

  private async getUserSpotifyTokens(): Promise<SpotifyTokens | null> {
    try {
      console.log('🎵 MUSIC HANDLER: Checking for Spotify tokens...');
      const tokens = this.userPreferences.getSpotifyTokens();
      console.log('🎵 MUSIC HANDLER: Tokens found:', !!tokens);
      return tokens;
    } catch (error) {
      console.log('🎵 MUSIC HANDLER: Error getting tokens:', error);
      return null;
    }
  }

  private async ensureValidTokens(tokens: SpotifyTokens): Promise<SpotifyTokens> {
    if (this.spotifyService.isTokenExpired(tokens)) {
      console.log('🔄 MUSIC HANDLER: Refreshing expired Spotify tokens');
      const refreshedTokens = await this.spotifyService.refreshTokens(tokens.refresh_token);
      
      // Save refreshed tokens
      this.userPreferences.setSpotifyTokens(refreshedTokens);
      
      return refreshedTokens;
    }
    
    return tokens;
  }
}