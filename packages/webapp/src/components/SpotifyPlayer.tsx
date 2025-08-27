"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Music,
} from "lucide-react";
import Image from "next/image";

interface Track {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: { name: string; images: Array<{ url: string }> };
  duration_ms: number;
  uri: string;
}

interface PlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: Track | null;
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

interface SpotifyPlayerProps {
  isConnected: boolean;
  onConnect: () => void;
  onMusicStateUpdate?: (data: any) => void;
}

export default function SpotifyPlayer({
  isConnected,
  onConnect,
  onMusicStateUpdate,
}: SpotifyPlayerProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(50);
  const volumeRef = useRef<HTMLDivElement>(null);

  // Fetch current playback state
  const fetchPlaybackState = useCallback(async () => {
    if (!isConnected) return;

    try {
      const response = await fetch("http://localhost:7777/spotify/playback");
      const data = await response.json();

      if (data.success && data.playback) {
        setPlaybackState(data.playback);
        setVolume(data.playback.volume_percent || 50);
        setError(null);
      } else if (response.status === 401) {
        // Handle auth error
        setError("Spotify connection expired");
      } else {
        setPlaybackState(null);
      }
    } catch (error) {
      console.error("Failed to fetch playback state:", error);
      setError("Failed to get playback state");
    }
  }, [isConnected]);

  // Poll for playback state updates
  useEffect(() => {
    if (!isConnected) return;

    fetchPlaybackState();
    const interval = setInterval(fetchPlaybackState, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected, fetchPlaybackState]);

  // Handle click outside to close volume slider
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        volumeRef.current &&
        !volumeRef.current.contains(event.target as Node)
      ) {
        setShowVolumeSlider(false);
      }
    };

    if (showVolumeSlider) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVolumeSlider]);

  const handlePlayPause = async () => {
    if (!isConnected || isLoading) return;

    setIsLoading(true);
    try {
      const endpoint = playbackState?.is_playing
        ? "http://localhost:7777/spotify/pause"
        : "http://localhost:7777/spotify/play";
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json();

      if (data.success) {
        await fetchPlaybackState(); // Refresh state
      } else {
        setError(data.error || "Failed to control playback");
      }
    } catch (error) {
      console.error("Playback control error:", error);
      setError("Failed to control playback");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipNext = async () => {
    if (!isConnected || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:7777/spotify/next", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        // Add small delay before refreshing to let Spotify update
        setTimeout(fetchPlaybackState, 500);
      } else {
        setError(data.error || "Failed to skip track");
      }
    } catch (error) {
      console.error("Skip next error:", error);
      setError("Failed to skip track");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipPrevious = async () => {
    if (!isConnected || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:7777/spotify/previous", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        // Add small delay before refreshing to let Spotify update
        setTimeout(fetchPlaybackState, 500);
      } else {
        setError(data.error || "Failed to go to previous track");
      }
    } catch (error) {
      console.error("Skip previous error:", error);
      setError("Failed to go to previous track");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
    if (!isConnected) return;

    setVolume(newVolume);

    try {
      const response = await fetch(
        `http://localhost:7777/spotify/volume?volume=${newVolume}`,
        {
          method: "POST",
        }
      );
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Failed to set volume");
        // Revert volume on error
        setVolume(playbackState?.volume_percent || 50);
      }
    } catch (error) {
      console.error("Volume control error:", error);
      setError("Failed to set volume");
      setVolume(playbackState?.volume_percent || 50);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (!playbackState?.item?.duration_ms || !playbackState?.progress_ms) {
      return 0;
    }
    return (playbackState.progress_ms / playbackState.item.duration_ms) * 100;
  };

  if (!isConnected) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-foreground w-72 h-32 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-center h-full space-x-3">
          <Music className="w-8 h-8 text-green-500" />
          <div className="text-center">
            <p className="text-sm text-gray-300">Spotify not connected</p>
            <button
              onClick={onConnect}
              className="text-green-500 hover:text-green-400 text-sm underline mt-1"
            >
              Connect Spotify
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!playbackState || !playbackState.item) {
    return (
      <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-foreground w-72 h-32 shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-center h-full space-x-3">
          <Music className="w-8 h-8 text-gray-500" />
          <div className="text-center">
            <p className="text-sm text-gray-300">No music playing</p>
            <p className="text-xs text-gray-500 mt-1">Start music on Spotify</p>
          </div>
        </div>
      </div>
    );
  }

  const track = playbackState.item;
  const albumImage = track.album.images[0]?.url;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-3 text-foreground w-82 h-32 shadow-lg hover:shadow-xl transition-shadow">
      {error && (
        <div className="bg-red-600 bg-opacity-20 border border-red-600 rounded p-2 mb-1">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      <div className="flex items-start space-x-3 h-full">
        {/* Album Art */}
        <div className="flex-shrink-0 relative h-26 w-26">
          {albumImage ? (
            <Image
              src={albumImage}
              alt={track.album.name}
              fill
              className="rounded object-cover"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="w-24 h-24 bg-gray-700 rounded flex items-center justify-center">
              <Music className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Track Info and Controls */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-2">
          {/* Track Info and Volume Control */}
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-sm font-medium truncate" title={track.name}>
                {track.name}
              </p>
              <p
                className="text-xs text-gray-400 truncate"
                title={track.artists[0]?.name}
              >
                {track.artists[0]?.name}
              </p>
            </div>

            {/* Volume Control */}
            <div
              className="flex items-center relative flex-shrink-0"
              ref={volumeRef}
            >
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="text-black hover:text-gray-700 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              {showVolumeSlider && (
                <div className="absolute -top-8 right-0 bg-gray-900 border border-gray-600 rounded p-1 z-50">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) =>
                      handleVolumeChange(parseInt(e.target.value))
                    }
                    className="w-16 h-1 bg-gray-600 rounded-xl appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #10b981 0%, #10b981 ${volume}%, #4b5563 ${volume}%, #4b5563 100%)`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-start space-x-1">
            <button
              onClick={handleSkipPrevious}
              disabled={isLoading}
              className="text-black hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 rounded-full p-1.5 transition-colors disabled:opacity-50 mx-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : playbackState.is_playing ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" />
              )}
            </button>

            <button
              onClick={handleSkipNext}
              disabled={isLoading}
              className="text-black hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
