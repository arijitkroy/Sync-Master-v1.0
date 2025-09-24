const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email',
  'user-library-read'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const scopes = SPOTIFY_SCOPES.join(' ');
    const authUrl = new URL('https://accounts.spotify.com/authorize');

    authUrl.searchParams.append('client_id', process.env.SPOTIFY_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', process.env.SPOTIFY_REDIRECT_URI);
    authUrl.searchParams.append('scope', scopes);
    authUrl.searchParams.append('state', 'spotify-auth');

    return res.status(200).json({
      authUrl: authUrl.toString(),
    });

  } catch (error) {
    console.error('Error generating Spotify auth URL:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
