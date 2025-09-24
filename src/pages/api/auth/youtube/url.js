const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtubepartner',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if user has Spotify connected first (enforced workflow)
    const { getSession } = await import('../../../../lib/session.js');
    const { getAuthToken } = await import('../../../../lib/database.js');
    
    const session = await getSession(req, res);
    if (session?.userId) {
      const spotifyToken = await getAuthToken(session.userId, 'spotify');
      if (!spotifyToken) {
        return res.status(400).json({ 
          message: 'Please connect Spotify first before connecting YouTube' 
        });
      }
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: YOUTUBE_SCOPES,
      prompt: 'consent',
    });

    return res.status(200).json({
      authUrl,
    });

  } catch (error) {
    console.error('Error generating YouTube auth URL:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
