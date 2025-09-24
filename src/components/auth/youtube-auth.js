import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useState } from "react";

export function YouTubeAuth({ onAuthSuccess, isConnected = false, spotifyConnected = false }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleYouTubeAuth = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/youtube/url");
      const data = await response.json();
      
      if (!response.ok) {
        alert(data.message || 'Error connecting to YouTube');
        setIsLoading(false);
        return;
      }
      
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error initiating YouTube auth:", error);
      alert('Error connecting to YouTube. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm glass-surface neon-border">
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex flex-col items-center gap-3 text-white">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              spotifyConnected ? 'youtube-neon' : 'bg-gray-600'
            }`}>
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              spotifyConnected ? 'bg-cyan-400 text-black' : 'bg-gray-500 text-gray-300'
            }`}>
              2
            </div>
          </div>
          <span className="text-lg font-semibold">Step 2: Connect YouTube</span>
        </CardTitle>
        <CardDescription className="text-gray-400 text-center">
          Create and manage YouTube Music playlists
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <Button 
          onClick={isConnected || !spotifyConnected ? undefined : handleYouTubeAuth}
          disabled={isLoading || isConnected || !spotifyConnected}
          className={`w-full font-semibold py-3 ${
            isConnected 
              ? "bg-green-600 text-white cursor-not-allowed opacity-75"
              : !spotifyConnected
              ? "bg-gray-600 text-gray-300 cursor-not-allowed opacity-50"
              : "youtube-neon auth-button text-white"
          }`}
        >
          {isConnected 
            ? "✓ Connected" 
            : !spotifyConnected 
            ? "Connect Spotify First"
            : isLoading 
            ? "Connecting..." 
            : "Connect with YouTube"
          }
        </Button>
      </CardContent>
    </Card>
  );
}
