import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useState } from "react";

export function SpotifyAuth({ onAuthSuccess, isConnected = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSpotifyAuth = async () => {
    // Show confirmation dialog first
    setShowConfirmation(true);
  };

  const confirmSpotifyAuth = async (forceReauth = false) => {
    setShowConfirmation(false);
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/spotify/url");
      const { authUrl } = await response.json();
      
      // Add force reauth parameter if user wants to change account
      const finalAuthUrl = forceReauth ? `${authUrl}&show_dialog=true` : authUrl;
      window.location.href = finalAuthUrl;
    } catch (error) {
      console.error("Error initiating Spotify auth:", error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-sm glass-surface neon-border">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex flex-col items-center gap-3 text-white">
            <div className="relative">
              <div className="w-12 h-12 spotify-neon rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.301.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 text-black rounded-full flex items-center justify-center text-xs font-bold">
                1
              </div>
            </div>
            <span className="text-lg font-semibold">Step 1: Connect Spotify</span>
          </CardTitle>
          <CardDescription className="text-gray-400 text-center">
            Access your Spotify playlists and tracks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Button 
            onClick={isConnected ? undefined : handleSpotifyAuth}
            disabled={isLoading || isConnected}
            className={`w-full font-semibold py-3 ${
              isConnected 
                ? "bg-green-600 text-white cursor-not-allowed opacity-75" 
                : "spotify-neon auth-button text-white"
            }`}
          >
            {isConnected ? "✓ Connected" : isLoading ? "Connecting..." : "Connect with Spotify"}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 glass-surface neon-border">
            <CardHeader>
              <CardTitle className="text-white text-center">Spotify Account Selection</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Choose how you want to connect to Spotify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => confirmSpotifyAuth(false)}
                className="w-full spotify-neon text-white font-semibold"
              >
                Continue with Current Account
              </Button>
              <Button
                onClick={() => confirmSpotifyAuth(true)}
                variant="outline"
                className="w-full glass-surface border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
              >
                Choose Different Account
              </Button>
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="w-full glass-surface border-gray-400/30 text-gray-300 hover:bg-gray-400/10"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
