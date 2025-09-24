import { getAuthToken } from './database.js';

export const sessionOptions = {
  password: process.env.SESSION_PASSWORD,
  cookieName: 'sync_master_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(req, res) {
  const session = req.session;

  if (!session) {
    return {
      userId: null,
      spotifyConnected: false,
      youtubeConnected: false,
      save: async () => {},
    };
  }

  if (!session.userId) {
    session.spotifyConnected = false;
    session.youtubeConnected = false;
    return session;
  }

  const spotifyToken = await getAuthToken(session.userId, 'spotify');
  const youtubeToken = await getAuthToken(session.userId, 'youtube');

  session.spotifyConnected = !!spotifyToken;
  session.youtubeConnected = !!youtubeToken;

  return session;
}

export async function requireAuth(req, res, next) {
  const session = await getSession(req, res);

  if (!session || !session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return session;
}
