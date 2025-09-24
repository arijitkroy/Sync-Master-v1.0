import { adminDb } from './firebase.js';

// Ensure Firebase is initialized
function getDb() {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }
  return adminDb;
}

// Helper function to generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// User operations
export const createUser = async (userData) => {
  const id = generateId();
  const userDoc = {
    id,
    spotify_id: userData.spotify_id || null,
    youtube_id: userData.youtube_id || null,
    email: userData.email || null,
    display_name: userData.display_name || null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  await getDb().collection('users').doc(id).set(userDoc);
  return { id, ...userData };
};

export const getUserBySpotifyId = async (spotifyId) => {
  const querySnapshot = await getDb().collection('users').where('spotify_id', '==', spotifyId).get();
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
};

export const getUserByYouTubeId = async (youtubeId) => {
  const querySnapshot = await getDb().collection('users').where('youtube_id', '==', youtubeId).get();
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
};

export const getUserById = async (userId) => {
  const userSnap = await getDb().collection('users').doc(userId).get();
  return userSnap.exists ? { id: userSnap.id, ...userSnap.data() } : null;
};

export const updateUser = async (userId, userData) => {
  await getDb().collection('users').doc(userId).update({
    ...userData,
    updated_at: new Date(),
  });
  return true;
};

// Auth token operations
export const saveAuthToken = async (userId, service, tokenData) => {
  const tokenId = `${userId}_${service}`;
  const tokenDoc = {
    user_id: userId,
    service,
    access_token: tokenData.access_token || null,
    refresh_token: tokenData.refresh_token || null,
    token_type: tokenData.token_type || null,
    expires_at: tokenData.expires_at || null,
    scope: tokenData.scope || null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  await getDb().collection('auth_tokens').doc(tokenId).set(tokenDoc);
  return true;
};

export const getAuthToken = async (userId, service) => {
  const tokenId = `${userId}_${service}`;
  const tokenSnap = await getDb().collection('auth_tokens').doc(tokenId).get();
  return tokenSnap.exists ? tokenSnap.data() : null;
};

export const deleteAuthToken = async (userId, service) => {
  const tokenId = `${userId}_${service}`;
  await getDb().collection('auth_tokens').doc(tokenId).delete();
  return true;
};

// Spotify playlist operations
export const saveSpotifyPlaylist = async (userId, playlistData) => {
  const playlistDoc = {
    id: playlistData.id,
    user_id: userId,
    name: playlistData.name || null,
    description: playlistData.description || null,
    external_url: playlistData.external_urls?.spotify || playlistData.external_url || null,
    image_url: playlistData.images?.[0]?.url || playlistData.image_url || null,
    is_public: playlistData.is_public !== undefined ? Boolean(playlistData.is_public) : null,
    is_collaborative: playlistData.is_collaborative !== undefined ? Boolean(playlistData.is_collaborative) : null,
    owner_id: playlistData.owner?.id || playlistData.owner_id || null,
    owner_name: playlistData.owner?.display_name || playlistData.owner_name || null,
    tracks_total: playlistData.tracks?.total || playlistData.tracks_total || null,
    snapshot_id: playlistData.snapshot_id || null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  await getDb().collection('spotify_playlists').doc(playlistData.id).set(playlistDoc);
  return true;
};

export const getSpotifyPlaylists = async (userId) => {
  const db = getDb();
  const querySnapshot = await db.collection('spotify_playlists')
    .where('user_id', '==', userId)
    .get();
  const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Sort by created_at in JavaScript since we don't have the index yet
  return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getSpotifyPlaylist = async (playlistId) => {
  const playlistSnap = await getDb().collection('spotify_playlists').doc(playlistId).get();
  return playlistSnap.exists ? { id: playlistSnap.id, ...playlistSnap.data() } : null;
};

// YouTube playlist operations
export const saveYouTubePlaylist = async (userId, playlistData) => {
  const playlistDoc = {
    id: playlistData.id,
    user_id: userId,
    spotify_playlist_id: playlistData.spotify_playlist_id || null,
    name: playlistData.name || null,
    description: playlistData.description || null,
    privacy_status: playlistData.privacy_status || null,
    created_at: new Date(),
    updated_at: new Date(),
  };
  
  await getDb().collection('youtube_playlists').doc(playlistData.id).set(playlistDoc);
  return playlistDoc;
};

export const getYouTubePlaylists = async (userId) => {
  const querySnapshot = await getDb().collection('youtube_playlists')
    .where('user_id', '==', userId)
    .get();
  const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const getYouTubePlaylistBySpotifyId = async (spotifyPlaylistId) => {
  const querySnapshot = await getDb().collection('youtube_playlists')
    .where('spotify_playlist_id', '==', spotifyPlaylistId)
    .get();
  return querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
};

// Song mapping operations
export const saveSongMapping = async (mappingData = {}) => {
  const mappingId = generateId();
  const mappingDoc = {
    id: mappingId,
    spotify_playlist_id: mappingData.spotify_playlist_id || null,
    youtube_playlist_id: mappingData.youtube_playlist_id || null,
    spotify_track_id: mappingData.spotify_track_id || null,
    youtube_video_id: mappingData.youtube_video_id || null,
    spotify_track_name: mappingData.spotify_track_name || null,
    spotify_artist_name: mappingData.spotify_artist_name || null,
    youtube_video_title: mappingData.youtube_video_title || null,
    youtube_channel_title: mappingData.youtube_channel_title || null,
    sync_status: mappingData.sync_status || null,
    error_message: mappingData.error_message || null,
    created_at: new Date(),
  };
  
  await getDb().collection('song_mappings').doc(mappingId).set(mappingDoc);
  return true;
};

export const getSongMappings = async (spotifyPlaylistId, youtubePlaylistId) => {
  let query = getDb().collection('song_mappings');
  
  if (spotifyPlaylistId) {
    query = query.where('spotify_playlist_id', '==', spotifyPlaylistId);
  }
  if (youtubePlaylistId) {
    query = query.where('youtube_playlist_id', '==', youtubePlaylistId);
  }
  
  const querySnapshot = await query.get();
  const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return docs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// Sync history operations
export const createSyncHistory = async (syncData) => {
  const syncId = generateId();
  const syncDoc = {
    id: syncId,
    user_id: syncData.user_id,
    spotify_playlist_id: syncData.spotify_playlist_id,
    youtube_playlist_id: syncData.youtube_playlist_id || null,
    playlist_name: syncData.playlist_name,
    spotify_playlist_name: syncData.spotify_playlist_name,
    youtube_playlist_name: syncData.youtube_playlist_name || null,
    status: syncData.status,
    total_songs: syncData.total_songs || 0,
    songs_synced: 0,
    songs_failed: 0,
    started_at: new Date(),
    completed_at: null,
    error_message: null,
  };
  
  await getDb().collection('sync_history').doc(syncId).set(syncDoc);
  return { id: syncId, ...syncData };
};

export const updateSyncHistory = async (syncId, updateData) => {
  await getDb().collection('sync_history').doc(syncId).update({
    ...updateData,
    updated_at: new Date(),
  });
  return true;
};

export const getSyncHistory = async (userId, limitCount = 50) => {
  const db = getDb();
  const querySnapshot = await db.collection('sync_history')
    .where('user_id', '==', userId)
    .get();
  const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Sort by started_at in JavaScript and limit
  return docs
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, limitCount);
};

export const getSyncHistoryByPlaylist = async (userId, spotifyPlaylistId) => {
  const querySnapshot = await getDb().collection('sync_history')
    .where('user_id', '==', userId)
    .where('spotify_playlist_id', '==', spotifyPlaylistId)
    .get();
  const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return docs
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, 10);
};

export default getDb;