import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Mic, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VoiceMessageProps {
  audioUrl: string;
  duration: number;
  timestamp: string;
  isOwn: boolean;
  onLoad?: () => void;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUrl,
  duration,
  timestamp,
  isOwn,
  onLoad,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleLoadedData = () => {
        setIsLoading(false);
        onLoad?.();
      };

      const handleError = () => {
        setIsLoading(false);
        setHasError(true);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.addEventListener("loadeddata", handleLoadedData);
      audio.addEventListener("error", handleError);
      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("ended", handleEnded);

      return () => {
        audio.removeEventListener("loadeddata", handleLoadedData);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [onLoad]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (audio && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const newTime = percent * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const changePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);

    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const downloadAudio = async () => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `voice-message-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download started",
        description: "Voice message download has been initiated.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Failed to download the voice message.",
        variant: "destructive",
      });
    }
  };

  if (hasError) {
    return (
      <div
        className={`max-w-xs lg:max-w-md rounded-lg border-2 border-dashed border-gray-300 p-4 ${
          isOwn ? "bg-red-50" : "bg-gray-50"
        }`}
      >
        <div className="text-center">
          <Mic className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Failed to load audio</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(audioUrl, "_blank")}
          >
            Open in new tab
          </Button>
        </div>
        <p
          className={`text-xs mt-2 ${isOwn ? "text-red-300" : "text-gray-500"}`}
        >
          {formatTime(timestamp)}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xs lg:max-w-md">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        playsInline
        muted={isMuted}
      />

      <div
        className={`relative rounded-lg p-4 ${
          isOwn
            ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {/* Voice Message Badge */}
        <Badge
          className={`absolute top-2 right-2 text-xs ${
            isOwn
              ? "bg-white/20 text-white border-0"
              : "bg-indigo-100 text-indigo-600 border-0"
          }`}
          variant="secondary"
        >
          🎵 Voice
        </Badge>

        {isLoading ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-300 animate-pulse rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 animate-pulse rounded mb-2"></div>
              <div className="h-2 bg-gray-300 animate-pulse rounded"></div>
            </div>
          </div>
        ) : (
          <>
            {/* Main Controls */}
            <div className="flex items-center space-x-3 mb-3">
              {/* Play/Pause Button */}
              <Button
                onClick={togglePlay}
                variant="ghost"
                size="sm"
                className={`w-10 h-10 rounded-full p-0 ${
                  isOwn
                    ? "bg-white/20 hover:bg-white/30 text-white"
                    : "bg-indigo-100 hover:bg-indigo-200 text-indigo-600"
                }`}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              {/* Waveform Visual (simplified as progress bar) */}
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
                <div className="relative cursor-pointer" onClick={handleSeek}>
                  <Progress
                    value={duration > 0 ? (currentTime / duration) * 100 : 0}
                    className={`h-2 ${isOwn ? "bg-white/20" : "bg-gray-300"}`}
                  />
                </div>
              </div>
            </div>

            {/* Secondary Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Playback Speed */}
                <Button
                  onClick={changePlaybackRate}
                  variant="ghost"
                  size="sm"
                  className={`h-6 px-2 text-xs ${
                    isOwn
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }`}
                >
                  {playbackRate}x
                </Button>

                {/* Mute Toggle */}
                <Button
                  onClick={toggleMute}
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    isOwn
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }`}
                >
                  {isMuted ? (
                    <VolumeX className="w-3 h-3" />
                  ) : (
                    <Volume2 className="w-3 h-3" />
                  )}
                </Button>

                {/* Download */}
                <Button
                  onClick={downloadAudio}
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    isOwn
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-600"
                  }`}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>

              {/* Timestamp */}
              <span
                className={`text-xs ${
                  isOwn ? "text-indigo-100" : "text-gray-500"
                }`}
              >
                {formatTime(timestamp)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceMessage;
