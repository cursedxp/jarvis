# Spotify Integration Setup

To enable Spotify music control in Jarvis, you need to set up a Spotify app and configure your credentials.

## 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the app details:
   - **App name**: Jarvis Voice Assistant
   - **App description**: Personal voice assistant with music control
   - **Website**: http://localhost:3000 (or leave blank)
   - **Redirect URI**: `http://localhost:7777/auth/spotify/callback`
   - **API/SDKs**: Check "Web API" and "Web Playback SDK"

## 2. Get Your Credentials

1. After creating the app, you'll see your app dashboard
2. Click on your app name to open settings  
3. Copy the **Client ID**
4. Click "View client secret" and copy the **Client Secret**

## 3. Configure Jarvis

1. Open the `.env` file in your Jarvis project root
2. Replace the placeholder values:
   ```bash
   SPOTIFY_CLIENT_ID=your_actual_client_id_here
   SPOTIFY_CLIENT_SECRET=your_actual_client_secret_here
   ```
3. Save the file
4. Restart your Jarvis server

## 4. Test the Integration

1. Open Jarvis in your browser (http://localhost:3000)
2. Look for the Spotify widget in the interface
3. Click "Connect Spotify" to authenticate
4. Try voice commands like:
   - "play some music"
   - "pause music" 
   - "next song"
   - "set volume to 50"

## Required Spotify Scopes

The integration requests these permissions:
- `user-modify-playback-state` - Control playback (play/pause/skip)
- `user-read-playback-state` - Read current playback status
- `user-read-currently-playing` - See what's currently playing
- `streaming` - Play music through Web Playback SDK
- `user-read-email` - Basic profile access
- `user-read-private` - Basic profile access

## Troubleshooting

- **"Invalid redirect URI"**: Make sure the redirect URI in your Spotify app settings exactly matches `http://localhost:7777/auth/spotify/callback`
- **"Invalid client"**: Double-check your Client ID and Client Secret are correct
- **Playback not working**: Ensure you have an active Spotify device (mobile app, desktop app, or web player)