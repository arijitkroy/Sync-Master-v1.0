import { google } from 'googleapis';

class YouTubeMusicAPIWrapper {
  constructor(credentials) {
    this.credentials = credentials;
    const oauth2Client = this.getOAuth2Client();
    this.youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    if (credentials) {
      this.authenticateWithToken(credentials).catch((error) => {
        console.error('Failed to authenticate YouTube API wrapper during initialization:', error.message);
      });
    }
  }

  getOAuth2Client() {
    const { OAuth2 } = google.auth;
    return new OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );
  }

  async authenticateWithToken(tokens) {
    if (!tokens) {
      throw new Error('Missing YouTube authentication tokens');
    }

    const oauth2Client = this.getOAuth2Client();
    const normalizedTokens = { ...tokens };

    // Normalize possible expires_at ISO string to expiry_date (ms timestamp)
    if (!normalizedTokens.expiry_date && normalizedTokens.expires_at) {
      normalizedTokens.expiry_date = new Date(normalizedTokens.expires_at).getTime();
    }

    oauth2Client.setCredentials(normalizedTokens);

    // Refresh access token if missing or expired
    const needsRefresh =
      !oauth2Client.credentials.access_token ||
      (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date <= Date.now());

    if (needsRefresh && normalizedTokens.refresh_token) {
      const refreshed = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(refreshed.credentials);
    }

    this.youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });

    this.credentials = {
      access_token: oauth2Client.credentials.access_token,
      refresh_token: oauth2Client.credentials.refresh_token || normalizedTokens.refresh_token,
      token_type: oauth2Client.credentials.token_type || normalizedTokens.token_type,
      scope: oauth2Client.credentials.scope || normalizedTokens.scope,
      expiry_date: oauth2Client.credentials.expiry_date,
    };

    return this.credentials;
  }

  async getUserProfile() {
    try {
      const response = await this.youtube.channels.list({
        part: 'snippet,statistics',
        mine: true,
      });
      return response.data.items[0];
    } catch (error) {
      console.error('Error fetching YouTube profile:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchTracks(query, maxResults = 10) {
    try {
      const response = await this.youtube.search.list({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults,
        videoCategoryId: '10', // Music category
      });
      return response.data.items;
    } catch (error) {
      console.error('Error searching YouTube tracks:', error.response?.data || error.message);
      throw error;
    }
  }

  async createPlaylist(title, description = '', privacyStatus = 'private') {
    try {
      const response = await this.youtube.playlists.insert({
        part: 'snippet,status',
        requestBody: {
          snippet: {
            title,
            description,
          },
          status: {
            privacyStatus,
          },
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating YouTube playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async updatePlaylist(playlistId, updates) {
    try {
      const response = await this.youtube.playlists.update({
        part: 'snippet,status',
        requestBody: {
          id: playlistId,
          snippet: updates.snippet,
          status: updates.status,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating YouTube playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async deletePlaylist(playlistId) {
    try {
      await this.youtube.playlists.delete({
        id: playlistId,
      });
      return true;
    } catch (error) {
      console.error('Error deleting YouTube playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async addVideoToPlaylist(playlistId, videoId) {
    try {
      const response = await this.youtube.playlistItems.insert({
        part: 'snippet',
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error adding video to playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async removeVideoFromPlaylist(playlistId, videoId) {
    try {
      // First, find the playlist item
      const playlistItems = await this.youtube.playlistItems.list({
        part: 'id',
        playlistId,
      });

      const itemToDelete = playlistItems.data.items.find(
        item => item.snippet.resourceId.videoId === videoId
      );

      if (itemToDelete) {
        await this.youtube.playlistItems.delete({
          id: itemToDelete.id,
        });
      }

      return true;
    } catch (error) {
      console.error('Error removing video from playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPlaylistItems(playlistId, maxResults = 50) {
    try {
      const response = await this.youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults,
      });
      return response.data.items;
    } catch (error) {
      console.error('Error fetching playlist items:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAllPlaylistItems(playlistId) {
    let allItems = [];
    let pageToken;
    const maxResults = 50;

    do {
      const response = await this.youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId,
        maxResults,
        pageToken,
      });

      allItems = allItems.concat(response.data.items);

      if (response.data.nextPageToken) {
        pageToken = response.data.nextPageToken;
      } else {
        pageToken = null;
      }
    } while (pageToken);

    return allItems;
  }

  async getPlaylists(maxResults = 25) {
    try {
      const response = await this.youtube.playlists.list({
        part: 'snippet,contentDetails,status',
        mine: true,
        maxResults,
      });
      return response.data.items;
    } catch (error) {
      console.error('Error fetching playlists:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPlaylist(playlistId) {
    try {
      const response = await this.youtube.playlists.list({
        part: 'snippet,contentDetails,status',
        id: playlistId,
      });
      return response.data.items[0];
    } catch (error) {
      console.error('Error fetching playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async refreshToken(refreshToken) {
    try {
      const oauth2Client = this.getOAuth2Client();
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();
      this.youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client,
      });

      return credentials;
    } catch (error) {
      console.error('Error refreshing YouTube token:', error.response?.data || error.message);
      throw error;
    }
  }

  // Helper method to search for songs with better matching
  async searchTrackWithMetadata(artist, title, duration = null) {
    let searchQuery = `${artist} - ${title}`;

    // Add duration if available to improve search accuracy
    if (duration) {
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      searchQuery += ` ${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    const results = await this.searchTracks(searchQuery, 5);

    // Filter for music videos and return the best match
    const musicResults = results.filter(item =>
      item.snippet.categoryId === '10' || // Music category
      item.snippet.title.toLowerCase().includes(artist.toLowerCase()) ||
      item.snippet.title.toLowerCase().includes(title.toLowerCase())
    );

    return musicResults.length > 0 ? musicResults[0] : results[0];
  }
}

export default YouTubeMusicAPIWrapper;
