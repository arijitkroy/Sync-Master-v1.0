import { getYouTubePlaylistBySpotifyId, saveYouTubePlaylist, saveSongMapping, getSongMappings } from './database.js';

export class SyncService {
  constructor(spotifyAPI, youtubeAPI, userId) {
    this.spotifyAPI = spotifyAPI;
    this.youtubeAPI = youtubeAPI;
    this.userId = userId;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async syncPlaylist(spotifyPlaylistId, options = {}) {
    const {
      createNewPlaylist = false,
      updateExisting = true,
      skipExisting = false
    } = options;

    try {
      // Get Spotify playlist details
      const spotifyPlaylist = await this.spotifyAPI.getPlaylist(spotifyPlaylistId);
      if (!spotifyPlaylist) {
        throw new Error('Spotify playlist not found');
      }

      // Get all tracks from Spotify playlist
      const spotifyTracks = await this.spotifyAPI.getAllPlaylistTracks(spotifyPlaylistId);
      console.log(`Found ${spotifyTracks.length} tracks in Spotify playlist`);

      // Find or create YouTube playlist
      let youtubePlaylist = await getYouTubePlaylistBySpotifyId(spotifyPlaylistId);

      if (!youtubePlaylist || createNewPlaylist) {
        if (createNewPlaylist && youtubePlaylist) {
          // Delete existing playlist if creating new one
          await this.youtubeAPI.deletePlaylist(youtubePlaylist.id);
        }

        // Create new YouTube playlist
        const youtubePlaylistData = await this.youtubeAPI.createPlaylist(
          `${spotifyPlaylist.name} (Synced from Spotify)`,
          spotifyPlaylist.description || `Synced playlist from Spotify: ${spotifyPlaylist.name}`,
          'private'
        );

        youtubePlaylist = await saveYouTubePlaylist(this.userId, {
          id: youtubePlaylistData.id,
          spotify_playlist_id: spotifyPlaylistId,
          name: youtubePlaylistData.snippet.title,
          description: youtubePlaylistData.snippet.description,
          privacy_status: youtubePlaylistData.status.privacyStatus,
        });

        console.log(`Created new YouTube playlist: ${youtubePlaylist.name}`);
      } else if (updateExisting) {
        console.log(`Using existing YouTube playlist: ${youtubePlaylist.name}`);
      }

      if (!youtubePlaylist) {
        throw new Error('Failed to create or find YouTube playlist');
      }

      // Get existing mappings to avoid duplicates
      const existingMappings = await getSongMappings(spotifyPlaylistId, youtubePlaylist.id);
      const existingMappingByTrack = new Map(
        existingMappings.map(mapping => [mapping.spotify_track_id, mapping])
      );

      // Process tracks
      let syncedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (const track of spotifyTracks) {
        try {
          const trackInfo = track.track;
          const existingMapping = existingMappingByTrack.get(trackInfo.id);

          if (existingMapping) {
            if (existingMapping.sync_status === 'matched' && (skipExisting || !updateExisting)) {
              console.log(`Skipping already synced track: ${trackInfo.name}`);
              skippedCount++;
              continue;
            }

            if (existingMapping.sync_status === 'not_found') {
              console.log(`Skipping track previously not found on YouTube: ${trackInfo.name}`);
              skippedCount++;
              continue;
            }
          }

          const searchQuery = `${trackInfo.artists[0].name} - ${trackInfo.name}`;

          // Search for the track on YouTube
          let searchResults;
          try {
            searchResults = await this.youtubeAPI.searchTracks(searchQuery, 3);
          } catch (apiError) {
            if (apiError?.code === 403 || apiError?.response?.status === 403) {
              throw new Error('YouTube quota exceeded. Please wait before running another sync.');
            }
            throw apiError;
          }

          // Find the best match
          let bestMatch = null;
          let matchScore = 0;

          for (const result of searchResults) {
            if (result.id.videoId) {
              const titleSimilarity = this.calculateSimilarity(
                result.snippet.title.toLowerCase(),
                `${trackInfo.artists[0].name} - ${trackInfo.name}`.toLowerCase()
              );

              const artistSimilarity = this.calculateSimilarity(
                result.snippet.channelTitle.toLowerCase(),
                trackInfo.artists[0].name.toLowerCase()
              );

              const score = titleSimilarity * 0.7 + artistSimilarity * 0.3;

              if (score > matchScore) {
                matchScore = score;
                bestMatch = result;
              }
            }
          }

          if (bestMatch && matchScore > 0.3) {
            // Add to YouTube playlist
            await this.youtubeAPI.addVideoToPlaylist(youtubePlaylist.id, bestMatch.id.videoId);

            // Save mapping
            await saveSongMapping({
              spotify_playlist_id: spotifyPlaylistId,
              youtube_playlist_id: youtubePlaylist.id,
              spotify_track_id: trackInfo.id,
              youtube_video_id: bestMatch.id.videoId,
              spotify_track_name: trackInfo.name,
              spotify_artist_name: trackInfo.artists[0].name,
              youtube_video_title: bestMatch.snippet.title,
              youtube_channel_title: bestMatch.snippet.channelTitle,
              sync_status: 'matched',
            });

            syncedCount++;
            console.log(`Synced: ${trackInfo.name} by ${trackInfo.artists[0].name}`);
          } else {
            // Track not found
            await saveSongMapping({
              spotify_playlist_id: spotifyPlaylistId,
              youtube_playlist_id: youtubePlaylist.id,
              spotify_track_id: trackInfo.id,
              spotify_track_name: trackInfo.name,
              spotify_artist_name: trackInfo.artists[0].name,
              sync_status: 'not_found',
            });

            failedCount++;
            skippedCount++;
            console.log(`Not found: ${trackInfo.name} by ${trackInfo.artists[0].name}`);
          }

        } catch (trackError) {
          console.error(`Error syncing track ${track.track.name}:`, trackError);

          // Save error mapping
          await saveSongMapping({
            spotify_playlist_id: spotifyPlaylistId,
            youtube_playlist_id: youtubePlaylist.id,
            spotify_track_id: track.track.id,
            spotify_track_name: track.track.name,
            spotify_artist_name: track.track.artists[0]?.name,
            sync_status: 'error',
            error_message: trackError.message,
          });

          failedCount++;
          errors.push({
            track: track.track.name,
            error: trackError.message,
          });
        }

        // Throttle YouTube API requests to avoid hitting quota limits
        await this.delay(150);
      }

      console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed`);

      return {
        success: failedCount === 0,
        youtubePlaylistId: youtubePlaylist.id,
        youtubePlaylistName: youtubePlaylist.name,
        songsSynced: syncedCount,
        songsFailed: failedCount,
        songsSkipped: skippedCount,
        totalSongs: spotifyTracks.length,
        errors: errors.slice(0, 10), // Return first 10 errors
      };

    } catch (error) {
      console.error('Error in syncPlaylist:', error);
      throw error;
    }
  }

  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export async function syncPlaylist(spotifyAPI, youtubeAPI, spotifyPlaylist, userId, syncHistoryId) {
  const syncService = new SyncService(spotifyAPI, youtubeAPI, userId);

  try {
    const result = await syncService.syncPlaylist(spotifyPlaylist.id);

    // Update sync history if provided
    if (syncHistoryId) {
      const { updateSyncHistory } = await import('./database.js');
      await updateSyncHistory(syncHistoryId, {
        status: result.success ? 'completed' : 'completed_with_errors',
        songs_synced: result.songsSynced,
        songs_failed: result.songsFailed,
        completed_at: new Date().toISOString(),
      });
    }

    return result;

  } catch (error) {
    console.error('Error in syncPlaylist function:', error);

    if (syncHistoryId) {
      const { updateSyncHistory } = await import('./database.js');
      await updateSyncHistory(syncHistoryId, {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });
    }

    throw error;
  }
}
