import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { useState } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from "lucide-react";

export function SyncStatus({ syncHistory, onRefresh }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case "pending":
        return <Clock className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "failed":
        return "text-red-600 bg-red-50 border-red-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "pending":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  if (!syncHistory || syncHistory.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Sync History
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            View your playlist synchronization history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Sync History</h3>
            <p className="text-gray-500 text-center">
              Start syncing your playlists to see the history here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sync History
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          View your playlist synchronization history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {syncHistory.map((sync) => (
            <div
              key={sync.id}
              className={`p-4 rounded-lg border ${getStatusColor(sync.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getStatusIcon(sync.status)}
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{sync.playlist_name}</h4>
                    <p className="text-sm opacity-75 mb-2">
                      {sync.spotify_playlist_name} → {sync.youtube_playlist_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs opacity-60">
                      <span>
                        Started: {new Date(sync.started_at).toLocaleString()}
                      </span>
                      {sync.completed_at && (
                        <span>
                          Completed: {new Date(sync.completed_at).toLocaleString()}
                        </span>
                      )}
                      {sync.songs_synced !== undefined && (
                        <span>
                          Songs: {sync.songs_synced}/{sync.total_songs}
                        </span>
                      )}
                    </div>
                    {sync.error_message && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {sync.error_message}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium uppercase px-2 py-1 rounded-full bg-white/50">
                    {sync.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
