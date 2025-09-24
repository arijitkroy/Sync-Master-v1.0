import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState } from "react";
import { Music, Users, Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export function PlaylistList({ playlists, onSync, onPlaylistSelect, selectedPlaylists, isLoading }) {
  const [syncingPlaylists, setSyncingPlaylists] = useState(new Set());
  const [checkingPlaylists, setCheckingPlaylists] = useState(new Set());
  const [syncStatus, setSyncStatus] = useState(new Map());

  const checkSyncStatus = async (playlistId) => {
    setCheckingPlaylists(prev => new Set(prev).add(playlistId));
    try {
      const response = await fetch('/api/sync/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playlistId }),
      });
      
      const result = await response.json();
      setSyncStatus(prev => new Map(prev).set(playlistId, result));
      
      if (result.isUpToDate) {
        alert(`✅ "${result.youtubePlaylistName || 'Playlist'}" is up to date!\n\nAll ${result.totalTracks} songs are already synced.`);
      } else if (result.exists) {
        const proceed = confirm(
          `🔄 Sync Status for "${result.youtubePlaylistName || 'Playlist'}":\n\n` +
          `• Total songs: ${result.totalTracks}\n` +
          `• Already synced: ${result.syncedTracks}\n` +
          `• Missing songs: ${result.missingSongs}\n\n` +
          `Missing songs include:\n${result.missingSongsList?.map(song => `• ${song.name} - ${song.artist}`).join('\n') || 'Various tracks'}\n\n` +
          `Do you want to sync the missing songs?`
        );
        if (proceed) {
          await handleSync(playlistId);
        }
      } else {
        const proceed = confirm(
          `🆕 New Sync Required:\n\n` +
          `This playlist doesn't exist on YouTube yet.\n` +
          `Total songs to sync: ${result.totalTracks}\n\n` +
          `Do you want to create the playlist and sync all songs?`
        );
        if (proceed) {
          await handleSync(playlistId);
        }
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
      alert('Error checking sync status. Please try again.');
    } finally {
      setCheckingPlaylists(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    }
  };

  const handleSync = async (playlistId) => {
    setSyncingPlaylists(prev => new Set(prev).add(playlistId));
    try {
      await onSync(playlistId);
      // Clear sync status after successful sync
      setSyncStatus(prev => {
        const newMap = new Map(prev);
        newMap.delete(playlistId);
        return newMap;
      });
    } finally {
      setSyncingPlaylists(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    }
  };

  const handleToggleSelect = (playlistId) => {
    onPlaylistSelect(playlistId);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <h3 className="text-lg font-semibold text-gray-600">Loading playlists…</h3>
          <p className="text-sm text-gray-500">Hang tight while we fetch your latest Spotify data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!playlists || playlists.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Music className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Playlists Found</h3>
          <p className="text-gray-500 text-center">
            Connect your Spotify account to see your playlists
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {playlists.map((playlist) => {
        const isSelected = selectedPlaylists.has(playlist.id);
        const isSyncing = syncingPlaylists.has(playlist.id);
        const isChecking = checkingPlaylists.has(playlist.id);
        const status = syncStatus.get(playlist.id);

        const imageUrl = playlist.image_url || playlist.images?.[0]?.url || null;
        const trackCount =
          typeof playlist.tracks_total === 'number'
            ? playlist.tracks_total
            : playlist.tracks?.total || 0;
        const ownerName = playlist.owner?.display_name || playlist.owner_name || 'Unknown';
        const lastUpdated = playlist.updated_at || playlist.created_at;

        return (
          <Card 
            key={playlist.id} 
            className={`playlist-card cursor-pointer transition-all ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleToggleSelect(playlist.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg leading-6 truncate text-white neon-text-subtle">
                    {playlist.name}
                  </CardTitle>
                </div>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={playlist.name}
                    className="w-12 h-12 rounded-lg object-cover ml-3 flex-shrink-0"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Music className="w-4 h-4 text-cyan-400" />
                  <span>{trackCount} song{trackCount === 1 ? '' : 's'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <span className="truncate">{ownerName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>
                    {new Date(lastUpdated || playlist.added_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Sync Status Indicator */}
              {status && (
                <div className="mb-3 p-2 rounded-md text-xs flex items-center gap-2" 
                     style={{
                       backgroundColor: status.isUpToDate ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                       border: `1px solid ${status.isUpToDate ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`
                     }}>
                  {status.isUpToDate ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-green-700">Up to date ({status.totalTracks} songs)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-700">
                        {status.missingSongs} of {status.totalTracks} songs need sync
                      </span>
                    </>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelect(playlist.id);
                  }}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 sync-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    checkSyncStatus(playlist.id);
                  }}
                  disabled={isSyncing || isChecking}
                >
                  {isSyncing ? "Syncing..." : isChecking ? "Checking..." : "Smart Sync"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
