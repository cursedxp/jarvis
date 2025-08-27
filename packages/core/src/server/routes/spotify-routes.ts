import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createSpotifyService } from "../../services/spotify-service";
import { UserPreferenceManager } from "../../services/user-preferences";

interface SpotifyRoutesOptions {
  userPreferences: UserPreferenceManager;
}

interface SpotifyCallbackQuery {
  code?: string;
  state?: string;
  error?: string;
}

export async function spotifyRoutes(
  fastify: FastifyInstance,
  options: SpotifyRoutesOptions,
) {
  const { userPreferences } = options;

  // Initialize Spotify service
  const spotifyService = createSpotifyService(
    process.env.SPOTIFY_CLIENT_ID || "",
    process.env.SPOTIFY_CLIENT_SECRET || "",
    process.env.SPOTIFY_REDIRECT_URI ||
      "http://localhost:7777/auth/spotify/callback",
  );

  // Cache for playback data
  let playbackCache: { data: any; timestamp: number } | null = null;
  const CACHE_DURATION = 2000; // Cache for 2 seconds

  // Get Spotify authorization URL
  fastify.get(
    "/auth/spotify",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authUrl = spotifyService.getAuthUrl();

        return reply.send({
          success: true,
          authUrl,
          message: "Redirect user to this URL to authorize Spotify access",
        });
      } catch (error) {
        fastify.log.error(
          `Error generating Spotify auth URL: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to generate Spotify authorization URL",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Handle Spotify OAuth callback
  fastify.get<{ Querystring: SpotifyCallbackQuery }>(
    "/auth/spotify/callback",
    async (request, reply) => {
      const { code, error } = request.query;

      try {
        // Check for OAuth errors
        if (error) {
          fastify.log.warn("Spotify OAuth error: " + String(error));
          return reply.code(400).send({
            success: false,
            error: "Spotify authorization failed",
            details: error,
          });
        }

        // Check for authorization code
        if (!code) {
          return reply.code(400).send({
            success: false,
            error: "Missing authorization code",
            message: "No authorization code received from Spotify",
          });
        }

        // Exchange code for tokens
        const tokens = await spotifyService.exchangeCodeForTokens(code);

        // Save tokens to user preferences
        userPreferences.setSpotifyTokens(tokens);

        fastify.log.info("🎵 Spotify tokens saved successfully for user");

        // Return success response with redirect to frontend
        return reply.type("text/html").send(`
        <html>
          <head>
            <title>Spotify Connected - Jarvis</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #1DB954 0%, #191414 100%);
                color: white;
                text-align: center;
                padding: 50px 20px;
                margin: 0;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background: rgba(25, 20, 20, 0.9);
                border-radius: 20px;
                padding: 40px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
              }
              .success-icon {
                font-size: 4em;
                margin-bottom: 20px;
              }
              h1 {
                margin-bottom: 10px;
                font-size: 2em;
              }
              p {
                opacity: 0.8;
                line-height: 1.6;
                margin-bottom: 30px;
              }
              .close-btn {
                background: #1DB954;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s ease;
              }
              .close-btn:hover {
                background: #1ed760;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="success-icon">🎵</div>
              <h1>Spotify Connected!</h1>
              <p>Your Spotify account has been successfully connected to Jarvis. You can now control your music with voice commands!</p>
              <button class="close-btn" onclick="window.close()">Close Window</button>
            </div>
            <script>
              // Auto-close after 3 seconds if possible
              setTimeout(() => {
                try {
                  window.close();
                } catch (e) {
                  // Some browsers prevent closing, that's okay
                }
              }, 3000);
            </script>
          </body>
        </html>
      `);
      } catch (error) {
        fastify.log.error(
          `Error handling Spotify callback: ${error instanceof Error ? error.message : String(error)}`,
        );

        return reply.type("text/html").send(`
        <html>
          <head>
            <title>Connection Failed - Jarvis</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #191414;
                color: white;
                text-align: center;
                padding: 50px 20px;
                margin: 0;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 20px;
                padding: 40px;
              }
              .error-icon {
                font-size: 4em;
                margin-bottom: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="error-icon">❌</div>
              <h1>Connection Failed</h1>
              <p>Failed to connect your Spotify account. Please try again.</p>
              <button onclick="window.close()">Close Window</button>
            </div>
          </body>
        </html>
      `);
      }
    },
  );

  // Get current Spotify connection status
  fastify.get(
    "/spotify/status",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const hasTokens = userPreferences.hasSpotifyTokens();
        const tokens = userPreferences.getSpotifyTokens();

        if (!hasTokens || !tokens) {
          return reply.send({
            success: true,
            connected: false,
            message: "Spotify not connected",
          });
        }

        // Check if tokens are expired
        const isExpired = spotifyService.isTokenExpired(tokens);

        return reply.send({
          success: true,
          connected: true,
          expired: isExpired,
          scopes: tokens.scope?.split(" ") || [],
          expiresAt: new Date(tokens.expires_at).toISOString(),
          message: isExpired
            ? "Spotify connected but tokens expired"
            : "Spotify connected and ready",
        });
      } catch (error) {
        fastify.log.error(
          `Error checking Spotify status: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to check Spotify connection status",
        });
      }
    },
  );

  // Disconnect/remove Spotify tokens
  fastify.delete(
    "/spotify/disconnect",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        userPreferences.clearSpotifyTokens();

        return reply.send({
          success: true,
          message: "Spotify disconnected successfully",
        });
      } catch (error) {
        fastify.log.error(
          `Error disconnecting Spotify: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to disconnect Spotify",
        });
      }
    },
  );

  // Get current playback info
  fastify.get(
    "/spotify/playback",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Check cache first
        if (playbackCache && Date.now() - playbackCache.timestamp < CACHE_DURATION) {
          return reply.send({
            success: true,
            playback: playbackCache.data,
            cached: true,
          });
        }

        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        // Refresh tokens if needed
        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        const playback = await spotifyService.getCurrentPlayback(
          validTokens.access_token,
        );

        // Update cache
        playbackCache = {
          data: playback,
          timestamp: Date.now(),
        };

        return reply.send({
          success: true,
          playback,
          cached: false,
        });
      } catch (error: any) {
        // If rate limited, return cached data if available
        if (error.response?.status === 429 && playbackCache) {
          return reply.send({
            success: true,
            playback: playbackCache.data,
            cached: true,
            rateLimited: true,
          });
        }

        fastify.log.error(
          `Error getting Spotify playback: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to get playback information",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Get available devices
  fastify.get(
    "/spotify/devices",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        // Refresh tokens if needed
        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        const devices = await spotifyService.getAvailableDevices(
          validTokens.access_token,
        );

        return reply.send({
          success: true,
          devices,
        });
      } catch (error) {
        fastify.log.error(
          `Error getting Spotify devices: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to get available devices",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Control playback - play
  fastify.post(
    "/spotify/play",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        await spotifyService.play(validTokens.access_token);

        return reply.send({
          success: true,
          message: "Playback started",
        });
      } catch (error) {
        fastify.log.error(
          `Error starting playback: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to start playback",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Control playback - pause
  fastify.post(
    "/spotify/pause",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        await spotifyService.pause(validTokens.access_token);

        return reply.send({
          success: true,
          message: "Playback paused",
        });
      } catch (error) {
        fastify.log.error(
          `Error pausing playback: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to pause playback",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Control playback - next track
  fastify.post(
    "/spotify/next",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        await spotifyService.next(validTokens.access_token);

        return reply.send({
          success: true,
          message: "Skipped to next track",
        });
      } catch (error) {
        fastify.log.error(
          `Error skipping to next track: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to skip to next track",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Control playback - previous track
  fastify.post(
    "/spotify/previous",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        await spotifyService.previous(validTokens.access_token);

        return reply.send({
          success: true,
          message: "Skipped to previous track",
        });
      } catch (error) {
        fastify.log.error(
          `Error skipping to previous track: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to skip to previous track",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Control volume
  fastify.post(
    "/spotify/volume",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { volume } = request.query as { volume: string };

      try {
        const tokens = userPreferences.getSpotifyTokens();
        if (!tokens) {
          return reply.code(401).send({
            success: false,
            error: "Spotify not connected",
          });
        }

        const validTokens = spotifyService.isTokenExpired(tokens)
          ? await spotifyService.refreshTokens(tokens.refresh_token)
          : tokens;

        if (validTokens !== tokens) {
          userPreferences.setSpotifyTokens(validTokens);
        }

        const volumeLevel = parseInt(volume) || 50;
        await spotifyService.setVolume(validTokens.access_token, volumeLevel);

        return reply.send({
          success: true,
          message: `Volume set to ${volumeLevel}%`,
        });
      } catch (error) {
        fastify.log.error(
          `Error setting volume: ${error instanceof Error ? error.message : String(error)}`,
        );
        return reply.code(500).send({
          success: false,
          error: "Failed to set volume",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}
