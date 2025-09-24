import { deleteAuthToken } from '../../../lib/database.js';
import { getSession } from '../../../lib/session.js';
import { withSessionRoute } from '../../../lib/withSession.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);

    if (session?.userId) {
      await Promise.all([
        deleteAuthToken(session.userId, 'spotify'),
        deleteAuthToken(session.userId, 'youtube'),
      ]);

      session.userId = null;
      session.spotifyConnected = false;
      session.youtubeConnected = false;
      await session.save();
    }

    res.setHeader(
      'Set-Cookie',
      'sync_master_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during unified logout:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);
