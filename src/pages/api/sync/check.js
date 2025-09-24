import { getSession } from '../../../lib/session.js';
import { withSessionRoute } from '../../../lib/withSession.js';
import { getSpotifyPlaylist, getYouTubePlaylistBySpotifyId, getSongMappings, getAuthToken } from '../../../lib/database.js';
import SpotifyAPI from '../../../lib/spotify-api.js';
import YouTubeMusicAPI from '../../../lib/youtube-music-api.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    if (!session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { playlistId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ message: 'Playlist ID is required' });
    }

    // Check if user has both Spotify and YouTube connected
    const spotifyToken = await getAuthToken(session.userId, 'spotify');
    const youtubeToken = await getAuthToken(session.userId, 'youtube');

    if (!spotifyToken || !youtubeToken) {
      return res.status(400).json({
        message: 'Both Spotify and YouTube accounts must be connected'
      });
    }

    // Get playlist information
    const spotifyPlaylist = await getSpotifyPlaylist(playlistId);
    if (!spotifyPlaylist) {
      return res.status(404).json({ message: 'Spotify playlist not found' });
    }

    // Check if YouTube playlist exists
    const youtubePlaylist = await getYouTubePlaylistBySpotifyId(playlistId);
    
    if (!youtubePlaylist) {
      return res.status(200).json({
        exists: false,
        needsSync: true,
        message: 'YouTube playlist does not exist. Full sync required.',
        totalTracks: spotifyPlaylist.tracks_total || 0,
        syncedTracks: 0,
        missingSongs: spotifyPlaylist.tracks_total || 0
      });
    }

    // Initialize Spotify API to get current tracks
    const spotifyAPI = new SpotifyAPI(spotifyToken.access_token);
    const spotifyTracks = await spotifyAPI.getAllPlaylistTracks(playlistId);

    // Get existing song mappings
    const existingMappings = await getSongMappings(playlistId, youtubePlaylist.id);
    const mappedTrackIds = new Set(
      existingMappings
        .filter(mapping => mapping.sync_status === 'matched')
        .map(mapping => mapping.spotify_track_id)
    );

    // Check which songs are missing
    const missingSongs = spotifyTracks.filter(track => 
      !mappedTrackIds.has(track.track.id)
    );

    const syncedCount = spotifyTracks.length - missingSongs.length;
    const isUpToDate = missingSongs.length === 0;

    return res.status(200).json({
      exists: true,
      needsSync: !isUpToDate,
      isUpToDate,
      message: isUpToDate 
        ? 'Playlist is up to date. No sync needed.' 
        : `${missingSongs.length} songs need to be synced.`,
      totalTracks: spotifyTracks.length,
      syncedTracks: syncedCount,
      missingSongs: missingSongs.length,
      youtubePlaylistId: youtubePlaylist.id,
      youtubePlaylistName: youtubePlaylist.name,
      missingSongsList: missingSongs.slice(0, 5).map(track => ({
        name: track.track.name,
        artist: track.track.artists[0]?.name
      }))
    });

  } catch (error) {
    console.error('Error checking sync status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);
