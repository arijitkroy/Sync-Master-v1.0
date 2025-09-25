import { getAuthToken, deleteAuthToken } from './database.js';

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 1 minute buffer to account for clock drift

const parseExpiry = (token) => {
  if (!token?.expires_at) return null;

  const expiresAt = new Date(token.expires_at).getTime();
  if (Number.isNaN(expiresAt)) {
    return null;
  }

  return expiresAt;
};

const isTokenExpired = (token) => {
  const expiresAt = parseExpiry(token);
  if (!expiresAt) return false;

  return expiresAt - TOKEN_EXPIRY_BUFFER_MS <= Date.now();
};

export async function logoutUserSession(session, reason = 'manual_logout') {
  if (!session) return;

  if (session.userId) {
    try {
      await Promise.all([
        deleteAuthToken(session.userId, 'spotify'),
        deleteAuthToken(session.userId, 'youtube'),
      ]);
    } catch (error) {
      console.error('Error clearing auth tokens during logout:', error);
    }
  }

  session.userId = null;
  session.spotifyConnected = false;
  session.youtubeConnected = false;
  session.logoutReason = reason;

  if (typeof session.save === 'function') {
    await session.save();
  }
}

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

  const spotifyExpired = isTokenExpired(spotifyToken);
  const youtubeExpired = isTokenExpired(youtubeToken);

  if (spotifyExpired || youtubeExpired) {
    await logoutUserSession(session, 'token_expired');
    return session;
  }

  session.spotifyConnected = !!spotifyToken;
  session.youtubeConnected = !!youtubeToken;
  session.logoutReason = null;

  return session;
}

export async function requireAuth(req, res, next) {
  const session = await getSession(req, res);

  if (!session || !session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  return session;
}
