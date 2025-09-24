import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { Music, Heart, X, CheckCircle, Search } from "lucide-react";

export function SongSelector({ playlistId, playlistName, onClose, onSync }) {
  const [songs, setSongs] = useState([]);
  const [selectedSongs, setSelectedSongs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSongs();
  }, [playlistId]);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/playlists/spotify/tracks?playlistId=${playlistId}`);
      const data = await response.json();
      setSongs(data.tracks || []);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSong = (trackId) => {
    setSelectedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filteredSongs = getFilteredSongs();
    setSelectedSongs(new Set(filteredSongs.map(song => song.track.id)));
  };

  const deselectAll = () => {
    setSelectedSongs(new Set());
  };

  const getFilteredSongs = () => {
    if (!searchTerm) return songs;
    return songs.filter(song => 
      song.track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.track.artists.some(artist => 
        artist.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const handleSync = async () => {
    if (selectedSongs.size === 0) {
      alert('Please select at least one song to sync.');
      return;
    }

    setSyncing(true);
    try {
      await onSync(playlistId, Array.from(selectedSongs));
      onClose();
    } catch (error) {
      console.error('Error syncing selected songs:', error);
      alert('Error syncing songs. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const filteredSongs = getFilteredSongs();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] glass-surface neon-border flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-400 fill-current" />
              Select Songs from {playlistName}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="glass-surface border-gray-400/30 text-gray-300 hover:bg-gray-400/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search and Controls */}
          <div className="space-y-3 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search songs or artists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 glass-surface border border-cyan-400/30 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400/50 focus:outline-none"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={selectAll}
                  className="glass-surface border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
                >
                  Select All ({filteredSongs.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deselectAll}
                  className="glass-surface border-gray-400/30 text-gray-300 hover:bg-gray-400/10"
                >
                  Deselect All
                </Button>
              </div>
              
              <div className="text-sm text-gray-400">
                {selectedSongs.size} of {songs.length} songs selected
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col pt-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-400">Loading songs...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {filteredSongs.map((song, index) => {
                  const track = song.track;
                  const isSelected = selectedSongs.has(track.id);
                  
                  return (
                    <div
                      key={track.id}
                      onClick={() => toggleSong(track.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-cyan-400/10 border-cyan-400/50' 
                          : 'glass-surface border-gray-400/20 hover:border-cyan-400/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'bg-cyan-400 border-cyan-400' 
                            : 'border-gray-400'
                        }`}>
                          {isSelected && <CheckCircle className="w-3 h-3 text-black" />}
                        </div>
                        
                        {track.album?.images?.[0]?.url ? (
                          <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{track.name}</h4>
                          <p className="text-gray-400 text-sm truncate">
                            {track.artists.map(artist => artist.name).join(', ')}
                          </p>
                          {track.album?.name && (
                            <p className="text-gray-500 text-xs truncate">{track.album.name}</p>
                          )}
                        </div>
                        
                        <div className="text-gray-400 text-sm">
                          {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex-shrink-0 pt-4 border-t border-gray-400/20">
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="glass-surface border-gray-400/30 text-gray-300 hover:bg-gray-400/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSync}
                    disabled={selectedSongs.size === 0 || syncing}
                    className="sync-button text-black font-semibold"
                  >
                    {syncing ? 'Syncing...' : `Sync ${selectedSongs.size} Songs`}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
