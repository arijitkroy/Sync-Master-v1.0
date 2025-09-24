import { getSession } from '../../../../lib/session.js';
import { withSessionRoute } from '../../../../lib/withSession.js';
import { getAuthToken } from '../../../../lib/database.js';
import SpotifyAPI from '../../../../lib/spotify-api.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    if (!session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { playlistId } = req.query;

    if (!playlistId) {
      return res.status(400).json({ message: 'Playlist ID is required' });
    }

    // Get Spotify token
    const spotifyToken = await getAuthToken(session.userId, 'spotify');
    if (!spotifyToken) {
      return res.status(401).json({ message: 'Spotify not connected' });
    }

    // Initialize Spotify API
    const spotifyAPI = new SpotifyAPI(spotifyToken.access_token);

    // Fetch tracks
    let tracks = [];
    try {
      tracks = await spotifyAPI.getAllPlaylistTracks(playlistId);
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          message: 'Spotify session expired. Please reconnect your Spotify account.' 
        });
      }
      
      // Check if it's a scope issue for liked songs
      if (error.response?.status === 403 && 
          error.response?.data?.error?.message === 'Insufficient client scope' &&
          playlistId === 'liked_songs') {
        return res.status(401).json({
          message: 'Please reconnect your Spotify account to access Liked Songs. The app needs additional permissions.',
          requiresReauth: true,
          missingScope: 'user-library-read'
        });
      }
      
      throw error;
    }

    return res.status(200).json({
      tracks: tracks || [],
      total: tracks?.length || 0,
      playlistId
    });

  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);
