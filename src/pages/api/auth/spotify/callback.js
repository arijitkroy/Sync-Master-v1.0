import { getAuthToken, saveAuthToken, getUserBySpotifyId, createUser } from '../../../../lib/database';
import { getSession } from '../../../../lib/session.js';
import { withSessionRoute } from '../../../../lib/withSession.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Spotify token exchange failed:', error);
      return res.status(400).json({ message: 'Failed to exchange code for token' });
    }

    const tokenData = await tokenResponse.json();

    // Get user profile from Spotify
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Failed to fetch Spotify profile');
      return res.status(400).json({ message: 'Failed to fetch user profile' });
    }

    const profile = await profileResponse.json();


    // Check if user exists, create if not (await required)
    let user = await getUserBySpotifyId(profile.id);
    if (!user) {
      user = await createUser({
        spotify_id: profile.id,
        display_name: profile.display_name,
        email: profile.email,
      });
    }

    // Save or update the auth token
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    await saveAuthToken(user.id, 'spotify', {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_at: expiresAt.toISOString(),
      scope: tokenData.scope,
    });

    // Update session
    const session = await getSession(req, res);
    session.userId = user.id;
    session.spotifyConnected = true;
    await session.save();

    return res.redirect(302, '/');

  } catch (error) {
    console.error('Error in Spotify callback:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export default withSessionRoute(handler);
