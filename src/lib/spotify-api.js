import axios from 'axios';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

class SpotifyAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.client = axios.create({
      baseURL: SPOTIFY_API_BASE,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getUserProfile() {
    try {
      const response = await this.client.get('/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching Spotify user profile:', error.response?.data || error.message);
      throw error;
    }
  }

  async getUserPlaylists(limit = 50, offset = 0) {
    try {
      const response = await this.client.get('/me/playlists', {
        params: {
          limit,
          offset,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Spotify playlists:', error.response?.data || error.message);
      throw error;
    }
  }

  async getUserSavedTracks(limit = 50, offset = 0) {
    try {
      const response = await this.client.get('/me/tracks', {
        params: {
          limit,
          offset,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Spotify saved tracks:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAllUserSavedTracks() {
    try {
      let allTracks = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await this.getUserSavedTracks(limit, offset);
        allTracks = allTracks.concat(response.items);
        
        hasMore = response.items.length === limit;
        offset += limit;
        
        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allTracks;
    } catch (error) {
      console.error('Error fetching all saved tracks:', error);
      throw error;
    }
  }

  async getPlaylist(playlistId) {
    try {
      const response = await this.client.get(`/playlists/${playlistId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Spotify playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    try {
      const response = await this.client.get(`/playlists/${playlistId}/tracks`, {
        params: {
          limit,
          offset,
          market: 'from_token',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAllPlaylistTracks(playlistId) {
    // Handle "Liked Songs" special case
    if (playlistId === 'liked_songs') {
      return await this.getAllUserSavedTracks();
    }

    let allTracks = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getPlaylistTracks(playlistId, limit, offset);
      allTracks = allTracks.concat(response.items);
      
      if (response.next) {
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    return allTracks;
  }

  async getTrack(trackId) {
    try {
      const response = await this.client.get(`/tracks/${trackId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching track:', error.response?.data || error.message);
      throw error;
    }
  }

  async searchTracks(query, limit = 10, offset = 0) {
    try {
      const response = await this.client.get('/search', {
        params: {
          q: query,
          type: 'track',
          limit,
          offset,
          market: 'from_token',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching tracks:', error.response?.data || error.message);
      throw error;
    }
  }

  async createPlaylist(userId, name, description = '', isPublic = false) {
    try {
      const response = await this.client.post(`/users/${userId}/playlists`, {
        name,
        description,
        public: isPublic,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async addTracksToPlaylist(playlistId, trackUris) {
    try {
      const response = await this.client.post(`/playlists/${playlistId}/tracks`, {
        uris: trackUris,
      });
      return response.data;
    } catch (error) {
      console.error('Error adding tracks to playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async removeTracksFromPlaylist(playlistId, tracks) {
    try {
      const response = await this.client.delete(`/playlists/${playlistId}/tracks`, {
        data: {
          tracks: tracks.map(track => ({ uri: track.uri })),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error removing tracks from playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async updatePlaylist(playlistId, updates) {
    try {
      const response = await this.client.put(`/playlists/${playlistId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating playlist:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAudioFeatures(trackIds) {
    try {
      const response = await this.client.get('/audio-features', {
        params: {
          ids: trackIds.join(','),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching audio features:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSeveralTracks(trackIds) {
    try {
      const response = await this.client.get('/tracks', {
        params: {
          ids: trackIds.join(','),
          market: 'from_token',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching several tracks:', error.response?.data || error.message);
      throw error;
    }
  }

  isTokenExpired() {
    // This is a basic check. In a real implementation, you'd check the token expiry
    return false;
  }

  async refreshToken(refreshToken, clientId, clientSecret) {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
      });
      
      this.accessToken = response.data.access_token;
      this.client.defaults.headers['Authorization'] = `Bearer ${this.accessToken}`;
      
      return response.data;
    } catch (error) {
      console.error('Error refreshing Spotify token:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default SpotifyAPI;
