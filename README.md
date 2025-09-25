# 🎵 Sync Master

**Seamlessly sync your Spotify playlists to YouTube Music with intelligent song selection and smart matching.**

Sync Master is a modern web application that bridges the gap between Spotify and YouTube Music, allowing you to transfer your favorite playlists with precision and control. Built with Next.js and featuring a stunning dark neon UI, it offers both full playlist syncing and individual song selection for the ultimate music management experience.

## ✨ Features

### 🎯 **Smart Playlist Syncing**
- **Intelligent Matching**: Advanced algorithm matches songs across platforms
- **Sync Status Tracking**: Real-time progress monitoring and detailed history
- **Conflict Resolution**: Handles duplicate songs and missing tracks gracefully

### 🎵 **Individual Song Selection**
- **Granular Control**: Choose specific songs from any playlist
- **Search & Filter**: Find songs quickly with built-in search functionality
- **Bulk Actions**: Select all, deselect all, or choose individual tracks

### ❤️ **Liked Songs Support**
- **Special Category**: Your Spotify Liked Songs get dedicated treatment
- **Selective Sync**: Choose which liked songs to transfer
- **Organized Display**: Separate section for easy access

### 🎨 **Modern UI/UX**
- **Dark Neon Theme**: Stunning cyberpunk-inspired interface
- **Glass Morphism**: Beautiful translucent cards and surfaces
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Smooth Animations**: Engaging hover effects and transitions

### 🔒 **Secure Authentication**
- **OAuth Integration**: Secure login with Spotify and YouTube
- **Session Management**: Persistent authentication with automatic token refresh
- **Privacy First**: No passwords stored, only secure API tokens

### 📊 **Advanced Features**
- **Sync History**: Complete log of all sync operations
- **Error Handling**: Detailed error messages and recovery suggestions
- **API Optimization**: Efficient API usage to respect rate limits
- **Large Playlist Support**: Smart handling of playlists with 20+ songs

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Spotify Developer Account
- YouTube Data API v3 access
- Firebase project for data storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/sync-master.git
   cd sync-master
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Spotify API Setup -- https://developer.spotify.com
   SPOTIFY_CLIENT_ID=
   SPOTIFY_CLIENT_SECRET=
   SPOTIFY_REDIRECT_URI=

   # YouTube API v3 Setup -- https://console.cloud.google.com/apis/dashboard
   YOUTUBE_CLIENT_ID=
   YOUTUBE_CLIENT_SECRET=
   YOUTUBE_REDIRECT_URI=

   # Random 32 characters String
   SESSION_PASSWORD=

   # Optional
   NEXTAUTH_URL=
   NEXTAUTH_SECRET=

   # Firebase Initialization
   FIREBASE_API_KEY=
   FIREBASE_AUTH_DOMAIN=
   FIREBASE_PROJECT_ID=
   FIREBASE_STORAGE_BUCKET=
   FIREBASE_MESSAGING_SENDER_ID=
   FIREBASE_APP_ID=

   # FIrebase-Admin / Service Account Initialization
   FIREBASE_PRIVATE_KEY_ID=
   FIREBASE_PRIVATE_KEY=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_CLIENT_ID=
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore
- **Authentication**: OAuth 2.0 (Spotify & YouTube)
- **APIs**: Spotify Web API, YouTube Data API v3
- **Styling**: Tailwind CSS with custom neon theme
- **Icons**: Lucide React

## 📖 Usage Guide

### Getting Started
1. **Connect Spotify**: Authenticate with your Spotify account first
2. **Connect YouTube**: Link your YouTube/Google account second
3. **Browse Playlists**: View your Spotify playlists organized by category

### Syncing Options
- **Smart Sync**: Automatically sync entire playlists (for playlists under 20 songs)
- **Select Songs**: Choose specific tracks for precise control
- **Sync All**: Transfer complete playlists including Liked Songs

### Managing Large Playlists
- Playlists with 20+ songs require individual song selection
- Use the search feature to find specific tracks quickly
- Select all filtered results or choose individual songs

## 🔧 Configuration

### API Setup
1. **Spotify Developer Dashboard**: Create an app and get client credentials
2. **Google Cloud Console**: Enable YouTube Data API v3 and create OAuth credentials
3. **Firebase Console**: Set up Firestore database and get service account key

### Required Scopes
- **Spotify**: `playlist-read-private`, `playlist-modify-public`, `user-library-read`
- **YouTube**: `youtube`, `youtube.readonly`, `youtubepartner`

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 Legal & Privacy

### Privacy Policy
Your privacy is important to us. Read our comprehensive [Privacy Policy](https://sync-master-ultimate.vercel.app/privacy.html) to understand how we collect, use, and protect your data.

**Key Points:**
- We only access playlist and song data necessary for syncing
- No personal data is stored beyond what's required for functionality
- All data is encrypted and securely stored in Firebase
- You can delete your data at any time

### Terms of Service
By using Sync Master, you agree to our [Terms of Service](https://sync-master-ultimate.vercel.app/terms.html).

**Important Notes:**
- Service is provided "as-is" without warranties
- Users are responsible for complying with platform terms
- We respect intellectual property rights
- Service availability may vary

## 📊 Roadmap

- [ ] **Apple Music Integration**: Expand to include Apple Music syncing
- [ ] **Batch Operations**: Sync multiple playlists simultaneously
- [ ] **Scheduled Syncing**: Automatic periodic playlist updates
- [ ] **Mobile App**: Native iOS and Android applications
- [ ] **Collaborative Playlists**: Support for shared playlist syncing

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Spotify** for their comprehensive Web API
- **YouTube** for the Data API v3
- **Next.js** team for the amazing framework
- **Tailwind CSS** for the utility-first styling approach
- **Firebase** for reliable backend services

---

<div align="center">

**Made with ❤️ by Arijit Kumar Roy**

[Website](https://sync-master-ultimate.vercel.app) • [Privacy Policy](https://sync-master-ultimate.vercel.app/privacy.html) • [Terms of Service](https://sync-master-ultimate.vercel.app/terms.html)

</div>
