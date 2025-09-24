import { getSession } from '../../../lib/session.js';
import { getSpotifyPlaylists, getAuthToken, saveSpotifyPlaylist } from '../../../lib/database.js';
import SpotifyAPI from '../../../lib/spotify-api.js';
import { withSessionRoute } from '../../../lib/withSession.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);
    if (!session?.userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get Spotify access token
    const authToken = await getAuthToken(session.userId, 'spotify');
    if (!authToken) {
      return res.status(200).json({
        playlists: [],
        message: 'Please connect your Spotify account first.'
      });
    }

    // Initialize Spotify API client
    const spotify = new SpotifyAPI(authToken.access_token);

    // Fetch playlists from Spotify API
    let spotifyResponse;
    try {
      spotifyResponse = await spotify.getUserPlaylists(50, 0);
    } catch (apiError) {
      const errorMessage = apiError.response?.data?.error?.message || apiError.message;
      if (errorMessage && errorMessage.toLowerCase().includes('access token expired')) {
        session.spotifyConnected = false;
        await session.save();
        console.warn('Spotify token expired, prompting re-authentication');
        return res.status(401).json({
          message: 'Spotify session expired. Please reconnect your Spotify account.'
        });
      }
      throw apiError;
    }
    const spotifyPlaylists = spotifyResponse.items || [];

    // Get user's saved tracks count for "Liked Songs"
    let likedSongsCount = 0;
    try {
      const savedTracksResponse = await spotify.getUserSavedTracks(1, 0);
      likedSongsCount = savedTracksResponse.total || 0;
    } catch (error) {
      console.error('Error fetching saved tracks count:', error);
      
      // Check if it's a scope issue
      if (error.response?.status === 403 && 
          error.response?.data?.error?.message === 'Insufficient client scope') {
        console.warn('Missing user-library-read scope for accessing saved tracks');
        // Return error to prompt re-authentication
        return res.status(401).json({
          message: 'Please reconnect your Spotify account to access Liked Songs. The app needs additional permissions.',
          requiresReauth: true,
          missingScope: 'user-library-read'
        });
      }
      
      // For other errors, set count to 0 but still create the playlist
      likedSongsCount = 0;
    }

    // Create "Liked Songs" virtual playlist
    const likedSongsPlaylist = {
      id: 'liked_songs',
      name: 'Liked Songs',
      description: 'Your saved tracks from Spotify',
      external_url: 'https://open.spotify.com/collection/tracks',
      image_url: null, // Spotify doesn't provide an image for liked songs
      is_public: false,
      is_collaborative: false,
      owner_id: session.userId,
      owner_name: 'You',
      tracks_total: likedSongsCount,
      snapshot_id: null,
    };

    // Save "Liked Songs" as a special playlist
    await saveSpotifyPlaylist(session.userId, likedSongsPlaylist);

    // Save regular playlists to database
    for (const playlist of spotifyPlaylists) {
      await saveSpotifyPlaylist(session.userId, {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        external_url: playlist.external_urls?.spotify,
        image_url: playlist.images?.[0]?.url ?? null,
        is_public: playlist.public,
        is_collaborative: playlist.collaborative,
        owner_id: playlist.owner?.id ?? null,
        owner_name: playlist.owner?.display_name ?? null,
        tracks_total: playlist.tracks?.total ?? null,
        snapshot_id: playlist.snapshot_id ?? null,
      });
    }

    // Get updated playlists from database
    const playlists = await getSpotifyPlaylists(session.userId);
    const playlistData = playlists || [];

    if (!playlistData || playlistData.length === 0) {
      return res.status(200).json({
        playlists: [],
        message: 'No playlists found. Connect your Spotify account to see playlists.'
      });
    }

    return res.status(200).json({
      playlists: playlistData.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        image_url: playlist.image_url,
        tracks_total: playlist.tracks_total,
        owner: {
          id: playlist.owner_id,
          display_name: playlist.owner_name,
        },
        is_public: playlist.is_public,
        is_collaborative: playlist.is_collaborative,
        external_url: playlist.external_url,
        snapshot_id: playlist.snapshot_id,
        created_at: playlist.created_at,
        updated_at: playlist.updated_at,
      })),
    });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);