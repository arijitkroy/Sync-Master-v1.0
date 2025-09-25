import { useState, useEffect, useRef } from 'react';
import { SpotifyAuth } from '../components/auth/spotify-auth.js';
import { YouTubeAuth } from '../components/auth/youtube-auth.js';
import { PlaylistList } from '../components/playlists/playlist-list.js';
import { SyncStatus } from '../components/sync/sync-status.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card.js';
import { Settings, LogOut, RefreshCw, Heart, ChevronDown } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState(null);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    checkAuthStatus();
    loadPlaylists();
    loadSyncHistory();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSpotifyConnected(data.spotifyConnected);
        setYoutubeConnected(data.youtubeConnected);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const response = await fetch('/api/playlists/spotify');
      if (response.status === 401) {
        setIsUnauthorized(true);
        setError(null);
        setPlaylists([]);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setPlaylists(data.playlists);
        setError(null);
        setIsUnauthorized(false);
      } else {
        // Handle scope issues specifically
        if (data.requiresReauth && data.missingScope) {
          setError(`${data.message} Missing permission: ${data.missingScope}`);
          // Optionally disconnect Spotify to force re-auth
          setSpotifyConnected(false);
        } else {
          setError(data.message);
        }

        setIsUnauthorized(false);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const loadSyncHistory = async () => {
    try {
      const response = await fetch('/api/sync/history');
      if (response.ok) {
        const data = await response.json();
        setSyncHistory(data.history);
      }
    } catch (error) {
      console.error('Error loading sync history:', error);
    }
  };

  const handleSync = async (playlistId, selectedSongIds = null) => {
    try {
      setError(null);
      const requestBody = { playlistId };
      
      // Add selected songs if provided (for individual song selection)
      if (selectedSongIds && selectedSongIds.length > 0) {
        requestBody.selectedSongIds = selectedSongIds;
      }
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      const result = await response.json();
      const syncedCount = result.result.songsSynced;
      const totalCount = selectedSongIds ? selectedSongIds.length : 'all';
      
      alert(`Sync completed! ${syncedCount} of ${totalCount} songs synced successfully.`);

      // Refresh data
      loadPlaylists();
      loadSyncHistory();

    } catch (error) {
      console.error('Error syncing playlist:', error);
      setError(error.message);
    }
  };


  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout-all', { method: 'POST' });
      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-surface p-8 rounded-2xl neon-border">
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="w-12 h-12 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-lg text-white neon-text-subtle">Loading Sync Master...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="header-glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 neon-gradient-bg rounded-full flex items-center justify-center p-1">
                <img 
                  src="/favicon.ico" 
                  alt="Sync Master Logo" 
                  className="w-10 h-10 object-contain rounded-full"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white neon-text-subtle">Sync Master</h1>
                <p className="text-sm text-cyan-300">Spotify → YouTube Music</p>
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-4">
                <div ref={profileMenuRef} className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProfileMenu((prev) => !prev)}
                    className="flex items-center gap-2 glass-surface border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-400"
                    aria-haspopup="true"
                    aria-expanded={showProfileMenu}
                  >
                    <span className="truncate max-w-[120px] sm:max-w-none text-cyan-200">
                      {user.display_name || 'Profile'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : 'rotate-0'}`} />
                  </Button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-44 rounded-lg border border-cyan-400/30 glass-surface shadow-lg backdrop-blur-md z-10">
                      <div className="px-4 py-3 border-b border-cyan-400/20">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm text-white truncate">{user.email || user.display_name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-cyan-200 hover:bg-cyan-400/10"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {spotifyConnected && youtubeConnected && (
          <div className="mb-6 p-4 warning-neon rounded-lg text-sm">
            <span className="font-semibold">⚠️ Warning:</span> Avoid refreshing this page while a sync is in progress. Doing so may interrupt the process and consume additional API quota.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 error-neon rounded-lg">
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Authentication Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-8 text-center neon-text-subtle">Connect Your Accounts</h2>
          <div className="flex justify-center">
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl w-full">
              <div className="flex justify-center">
                <SpotifyAuth
                  isConnected={spotifyConnected}
                  onAuthSuccess={() => {
                    setSpotifyConnected(true);
                    loadPlaylists();
                  }}
                />
              </div>
              <div className="flex justify-center">
                <YouTubeAuth
                  isConnected={youtubeConnected}
                  spotifyConnected={spotifyConnected}
                  onAuthSuccess={() => {
                    setYoutubeConnected(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {spotifyConnected && youtubeConnected && (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <h2 className="text-3xl font-bold text-white neon-text-subtle">Your Music</h2>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={loadPlaylists}
                  className="flex items-center gap-2 glass-surface border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400/50 hover:text-cyan-400"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Liked Songs Section */}
            {playlists.some(p => p.id === 'liked_songs') && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white neon-text-subtle flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400 fill-current" />
                  Your Liked Songs
                </h3>
                <PlaylistList
                  playlists={playlists.filter(p => p.id === 'liked_songs')}
                  onSync={handleSync}
                  isLoading={playlistsLoading}
                />
              </div>
            )}

            {/* Regular Playlists Section */}
            {playlists.filter(p => p.id !== 'liked_songs').length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white neon-text-subtle">Your Playlists</h3>
                <PlaylistList
                  playlists={playlists.filter(p => p.id !== 'liked_songs')}
                  onSync={handleSync}
                  isLoading={playlistsLoading}
                />
              </div>
            )}

            {/* Sync History */}
            <SyncStatus
              syncHistory={syncHistory}
              onRefresh={loadSyncHistory}
            />
          </div>
        )}

        {/* Getting Started Guide */}
        {(!spotifyConnected || !youtubeConnected) && (
          <Card className="max-w-4xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Follow these steps to start syncing your playlists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-gray-600">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <div>
                    <strong>Connect Spotify</strong> - Authorize access to your Spotify playlists
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <div>
                    <strong>Connect YouTube Music</strong> - Authorize access to create and manage playlists
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <div>
                    <strong>Select & Sync</strong> - Choose your playlists and start the synchronization
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="mt-16 border-t border-cyan-400/10 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-6 md:gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3 text-center md:text-left">
              <h3 className="text-lg font-semibold text-white">Sync Master</h3>
              <p className="text-sm text-gray-400 max-w-xl mx-auto md:mx-0">
                Seamlessly sync your Spotify playlists to YouTube Music with confidence.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-3 text-sm">
              <a href="/terms.html" className="text-cyan-300 hover:text-cyan-200">
                Terms & Conditions
              </a>
              <span className="hidden sm:block text-cyan-300/40">•</span>
              <a href="/privacy.html" className="text-cyan-300 hover:text-cyan-200">
                Privacy Policy
              </a>
            </div>
          </div>

          <p className="mt-6 text-xs text-gray-500 text-center md:text-left">
            © {new Date().getFullYear()} Sync Master. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}