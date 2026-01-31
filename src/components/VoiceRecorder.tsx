import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  Send,
  Trash2,
  Volume2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface VoiceRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceSend: (audioBlob: Blob, duration: number) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  isOpen,
  onClose,
  onVoiceSend,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { toast } = useToast();

  // Cleanup function
  const cleanup = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  useEffect(() => {
    return cleanup;
  }, [audioUrl]);

  const resetState = () => {
    cleanup();
    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setVolume(0);
    audioChunksRef.current = [];
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    resetState();
    onClose();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Start volume monitoring for visual feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(Math.min((volume / 128) * 100, 100));

        if (isRecording) {
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      cleanup();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSend = () => {
    if (audioBlob && duration > 0) {
      onVoiceSend(audioBlob, duration);
      handleClose();
      toast({
        title: "Voice message sent",
        description: `${formatDuration(duration)} audio message sent successfully.`,
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mic className="w-5 h-5 mr-2" />
            Voice Message
          </DialogTitle>
          <DialogDescription>
            Record a voice message to send in your conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!audioBlob ? (
            // Recording Interface
            <div className="text-center space-y-4">
              {/* Recording Indicator */}
              <div
                className={`w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? isPaused
                      ? "bg-yellow-100 border-4 border-yellow-500"
                      : "bg-red-100 border-4 border-red-500 animate-pulse"
                    : "bg-gray-100 border-4 border-gray-300"
                }`}
              >
                <Mic
                  className={`w-6 h-6 sm:w-8 sm:h-8 ${
                    isRecording
                      ? isPaused
                        ? "text-yellow-600"
                        : "text-red-600"
                      : "text-gray-400"
                  }`}
                />
              </div>

              {/* Duration and Status */}
              <div>
                <div className="text-2xl font-mono font-bold text-gray-900">
                  {formatDuration(duration)}
                </div>
                <Badge
                  variant={
                    isRecording
                      ? isPaused
                        ? "secondary"
                        : "destructive"
                      : "outline"
                  }
                  className="mt-2"
                >
                  {isRecording
                    ? isPaused
                      ? "⏸️ Paused"
                      : "🔴 Recording"
                    : "Ready to record"}
                </Badge>
              </div>

              {/* Volume Indicator */}
              {isRecording && (
                <div className="w-full max-w-xs mx-auto">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                    <Volume2 className="w-4 h-4" />
                    <span>Volume</span>
                  </div>
                  <Progress value={volume} className="h-2" />
                </div>
              )}

              {/* Recording Controls */}
              <div className="flex justify-center space-x-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={pauseRecording}
                      variant="outline"
                      disabled={!isRecording}
                    >
                      {isPaused ? (
                        <Play className="w-4 h-4" />
                      ) : (
                        <Pause className="w-4 h-4" />
                      )}
                    </Button>
                    <Button onClick={stopRecording} variant="destructive">
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  </>
                )}
              </div>

              {/* Tips */}
              <div className="text-xs text-gray-500 mt-4">
                <p>
                  💡 Tip: Speak clearly and hold the device close to your mouth
                  for best quality
                </p>
              </div>
            </div>
          ) : (
            // Playback Interface
            <div className="space-y-4">
              {/* Audio Player */}
              <div className="bg-gray-50 rounded-lg p-4">
                <audio
                  ref={audioRef}
                  src={audioUrl || ""}
                  onLoadedMetadata={(e) => {
                    const audio = e.target as HTMLAudioElement;
                    setDuration(Math.floor(audio.duration));
                  }}
                  onTimeUpdate={(e) => {
                    const audio = e.target as HTMLAudioElement;
                    setCurrentTime(Math.floor(audio.currentTime));
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />

                <div className="flex items-center space-x-4">
                  <Button
                    onClick={playAudio}
                    variant="outline"
                    size="sm"
                    className="w-10 h-10 rounded-full p-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <Progress
                      value={duration > 0 ? (currentTime / duration) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetState();
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button
                  onClick={handleSend}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceRecorder;
