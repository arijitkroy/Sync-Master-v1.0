import { getSession } from '../../../lib/session.js';
import { withSessionRoute } from '../../../lib/withSession.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);

    if (!session?.userId) {
      return res.status(200).json({
        authenticated: false,
        user: null,
        spotifyConnected: false,
        youtubeConnected: false,
      });
    }

    const { getAuthToken, getUserById } = await import('../../../lib/database.js');
    const spotifyToken = await getAuthToken(session.userId, 'spotify');
    const youtubeToken = await getAuthToken(session.userId, 'youtube');
    const user = await getUserById(session.userId);

    return res.status(200).json({
      authenticated: true,
      user: user ? {
        id: user.id,
        display_name: user.display_name,
        email: user.email,
      } : null,
      spotifyConnected: !!spotifyToken,
      youtubeConnected: !!youtubeToken,
    });

  } catch (error) {
    console.error('Error checking auth status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);
