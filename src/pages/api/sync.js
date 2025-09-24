import { getSession } from '../../lib/session.js';
import { withSessionRoute } from '../../lib/withSession.js';
import { getSpotifyPlaylist, getYouTubePlaylistBySpotifyId, createSyncHistory, updateSyncHistory, getAuthToken, getSyncHistoryByPlaylist } from '../../lib/database.js';
import SpotifyAPI from '../../lib/spotify-api.js';
import YouTubeMusicAPI from '../../lib/youtube-music-api.js';
import { syncPlaylist } from '../../lib/sync-service.js';

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
        message: 'Both Spotify and YouTube accounts must be connected to sync playlists'
      });
    }

    // Get playlist information
    const spotifyPlaylist = await getSpotifyPlaylist(playlistId);
    if (!spotifyPlaylist) {
      return res.status(404).json({ message: 'Spotify playlist not found' });
    }

    // Check if sync is already in progress
    const existingSync = await getSyncHistoryByPlaylist(session.userId, playlistId, 1);
    if (existingSync.length > 0 && existingSync[0].status === 'in_progress') {
      return res.status(409).json({
        message: 'A sync is already in progress for this playlist'
      });
    }

    // Initialize APIs
    const spotifyAPI = new SpotifyAPI(spotifyToken.access_token);

    const youtubeCredentials = {
      access_token: youtubeToken.access_token ?? undefined,
      refresh_token: youtubeToken.refresh_token ?? undefined,
      token_type: youtubeToken.token_type ?? undefined,
      scope: youtubeToken.scope ?? undefined,
      expiry_date: youtubeToken.expires_at ? new Date(youtubeToken.expires_at).getTime() : undefined,
    };

    const youtubeAPI = new YouTubeMusicAPI(youtubeCredentials);
    await youtubeAPI.authenticateWithToken(youtubeCredentials);

    // Create sync history entry
    const syncHistory = await createSyncHistory({
      user_id: session.userId,
      spotify_playlist_id: playlistId,
      youtube_playlist_id: null, // Will be set after creating/finding YouTube playlist
      playlist_name: spotifyPlaylist.name,
      spotify_playlist_name: spotifyPlaylist.name,
      youtube_playlist_name: null,
      status: 'in_progress',
      total_songs: spotifyPlaylist.tracks_total,
    });

    try {
      // Perform the sync
      const result = await syncPlaylist(
        spotifyAPI,
        youtubeAPI,
        spotifyPlaylist,
        session.userId,
        syncHistory.id
      );

      // Update sync history with results
      await updateSyncHistory(syncHistory.id, {
        status: result.success ? 'completed' : 'failed',
        youtube_playlist_id: result.youtubePlaylistId,
        youtube_playlist_name: result.youtubePlaylistName,
        songs_synced: result.songsSynced,
        songs_failed: result.songsFailed,
        completed_at: new Date().toISOString(),
        error_message: result.error || null,
      });

      return res.status(200).json({
        message: result.success ? 'Playlist synced successfully' : 'Sync completed with errors',
        result: {
          syncId: Number(syncHistory.id),
          status: result.success ? 'completed' : 'failed',
          songsSynced: result.songsSynced,
          songsFailed: result.songsFailed,
          youtubePlaylistId: result.youtubePlaylistId,
          youtubePlaylistName: result.youtubePlaylistName,
        },
      });

    } catch (syncError) {
      console.error('Error during sync:', syncError);

      // Update sync history with error
      await updateSyncHistory(syncHistory.id, {
        status: 'failed',
        error_message: syncError.message,
        completed_at: new Date().toISOString(),
      });

      return res.status(500).json({
        message: 'Sync failed',
        error: syncError.message,
      });
    }

  } catch (error) {
    console.error('Error in sync API:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);