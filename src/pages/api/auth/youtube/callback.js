import { getAuthToken, saveAuthToken, getUserByYouTubeId, createUser, getUserById } from '../../../../lib/database.js';
import { getSession } from '../../../../lib/session.js';
import { withSessionRoute } from '../../../../lib/withSession.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getSession(req, res);

    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('YouTube token exchange failed:', error);
      return res.status(400).json({ message: 'Failed to exchange code for token' });
    }

    const tokenData = await tokenResponse.json();

    // Get user profile from YouTube
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    oauth2Client.setCredentials(tokenData);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    let profileResponse;
    try {
      profileResponse = await youtube.channels.list({
        part: 'snippet,statistics',
        mine: true,
      });
    } catch (apiError) {
      const quotaExceeded =
        apiError?.errors?.some?.((err) => err.reason === 'quotaExceeded') ||
        apiError?.response?.status === 403;

      if (quotaExceeded) {
        console.warn('YouTube quota exceeded during auth callback');
        return res.status(429).json({
          message: 'YouTube API quota exceeded. Please try connecting again later.',
        });
      }

      throw apiError;
    }

    if (!profileResponse.data.items || profileResponse.data.items.length === 0) {
      return res.status(400).json({ message: 'Failed to fetch YouTube profile' });
    }

    const profile = profileResponse.data.items[0];
    const youtubeId = profile.id;

    // Check if user exists, prioritize current session user
    let user = null;
    
    // First, try to use the currently authenticated session user (Spotify user)
    if (session?.userId) {
      user = await getUserById(session.userId);
      if (user) {
        // Update existing Spotify user with YouTube ID
        const { updateUser } = await import('../../../../lib/database.js');
        await updateUser(user.id, {
          youtube_id: youtubeId,
          display_name: user.display_name || profile.snippet.title,
        });
        user.youtube_id = youtubeId;
      }
    }
    
    // If no session user, check if YouTube user already exists
    if (!user) {
      user = await getUserByYouTubeId(youtubeId);
    }
    
    // If still no user, create new one (this should not happen with enforced workflow)
    if (!user) {
      user = await createUser({
        youtube_id: youtubeId,
        display_name: profile.snippet.title,
      });
    }

    const existingToken = await getAuthToken(user.id, 'youtube');
    const refreshToken = tokenData.refresh_token || existingToken?.refresh_token || null;
    const scope = tokenData.scope || existingToken?.scope || null;

    // Save or update the auth token
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    await saveAuthToken(user.id, 'youtube', {
      access_token: tokenData.access_token,
      refresh_token: refreshToken,
      token_type: tokenData.token_type,
      expires_at: expiresAt.toISOString(),
      scope,
    });

    // Update session
    session.userId = user.id;
    session.youtubeConnected = true;
    await session.save();

    return res.redirect(302, '/');

  } catch (error) {
    console.error('Error in YouTube callback:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);