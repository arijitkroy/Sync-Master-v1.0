import { getSession } from '../../../lib/session.js';
import { getSyncHistory } from '../../../lib/database.js';
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

    const history = await getSyncHistory(session.userId, 50);

    return res.status(200).json({
      history: history.map(item => ({
        id: item.id,
        playlist_name: item.playlist_name,
        spotify_playlist_name: item.spotify_playlist_name,
        youtube_playlist_name: item.youtube_playlist_name,
        status: 'completed',
        total_songs: item.total_songs,
        songs_synced: item.songs_synced,
        songs_failed: item.songs_failed,
        started_at: item.started_at,
        completed_at: item.completed_at,
        error_message: null,
      })),
    });

  } catch (error) {
    console.error('Error fetching sync history:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);