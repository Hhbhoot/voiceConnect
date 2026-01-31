import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Video,
  VideoOff,
  RotateCcw,
  Maximize,
  Minimize,
} from "lucide-react";
import { webrtcService } from "@/services/webrtc";
import { useSocket } from "@/contexts/SocketContext";
import { authService, type User } from "@/services/auth";
import { useToast } from "@/components/ui/use-toast";

const Call = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socket } = useSocket();

  const {
    targetUser,
    offer,
    isIncoming,
    isVideoCall = false,
  } = location.state as {
    targetUser: User;
    offer?: RTCSessionDescriptionInit;
    isIncoming: boolean;
    isVideoCall?: boolean;
  };

  const [callStatus, setCallStatus] = useState<
    "connecting" | "connected" | "ended"
  >("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout>();
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callEndedRef = useRef(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);

    initializeCall();

    // Socket event listeners
    if (socket) {
      socket.on("call-answered", handleCallAnswered);
      socket.on("call-ended", handleCallEnded);
      socket.on("call-rejected", handleCallRejected);
      socket.on("ice-candidate", handleIceCandidate);
    }

    return () => {
      // Cleanup listeners
      if (socket) {
        socket.off("call-answered", handleCallAnswered);
        socket.off("call-ended", handleCallEnded);
        socket.off("call-rejected", handleCallRejected);
        socket.off("ice-candidate", handleIceCandidate);
      }

      // End call if not already ended (e.g. user closed tab or pressed back)
      if (!callEndedRef.current) {
        endCall(true);
      }

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [socket]);

  // Re-attach local stream when video is toggled on or camera is switched
  useEffect(() => {
    if (isVideoCall && isVideoOn && localVideoRef.current) {
      const stream = webrtcService.getCurrentLocalStream();
      if (stream) {
        localVideoRef.current.srcObject = stream;
      }
    }
  }, [isVideoOn, isVideoCall]);

  const initializeCall = async () => {
    try {
      await webrtcService.initializePeerConnection(targetUser.id);
      const localStream = await webrtcService.getUserMedia(!isVideoCall);

      // Setup local media
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
      }

      webrtcService.addLocalStreamToPeer();

      if (isIncoming && offer) {
        // Answer incoming call
        const answer = await webrtcService.createAnswer(offer);
        if (socket) {
          socket.emit("answer-call", {
            targetUserId: targetUser.id,
            answer,
            isVideoCall,
          });
        }
        setCallStatus("connected");
        attachRemoteStream();
      } else {
        // Make outgoing call
        const offer = await webrtcService.createOffer();
        if (socket) {
          socket.emit("call-user", {
            targetUserId: targetUser.id,
            offer,
            isVideoCall,
          });
        }
      }

      // Start call timer
      callStartTime.current = Date.now();
      durationInterval.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(elapsed);
      }, 1000);
    } catch (error) {
      console.error("Error initializing call:", error);
      toast({
        title: "Call Error",
        description: "Failed to initialize the call",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  };

  const attachRemoteStream = () => {
    const remoteStream = webrtcService.getRemoteStream();
    if (remoteStream) {
      if (remoteAudioRef.current && !isVideoCall) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
      if (isVideoCall && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    }
  };

  const handleCallAnswered = async (data: {
    answer: RTCSessionDescriptionInit;
  }) => {
    try {
      await webrtcService.handleAnswer(data.answer);
      setCallStatus("connected");
      attachRemoteStream();
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  };

  const handleCallEnded = () => {
    console.log("Remote ended call");
    setCallStatus("ended");
    endCall(false); // Don't notify server as they already know
  };

  const handleCallRejected = () => {
    toast({
      title: "Call Rejected",
      description: `${targetUser.username} declined your call`,
      variant: "destructive",
    });
    navigate("/dashboard");
  };

  const handleIceCandidate = async (data: { candidate: RTCIceCandidate }) => {
    try {
      await webrtcService.handleIceCandidate(data.candidate);
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  };

  const toggleMute = () => {
    const muted = webrtcService.toggleMute();
    setIsMuted(muted);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 0 : 1;
    }
  };

  const toggleVideo = () => {
    const videoDisabled = webrtcService.toggleVideo();
    setIsVideoOn(!videoDisabled);
  };

  const switchCamera = async () => {
    try {
      const newStream = await webrtcService.switchCamera();
      if (newStream && localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Failed to switch camera",
        variant: "destructive",
      });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const endCall = (notifyServer = true) => {
    if (callEndedRef.current) return;
    callEndedRef.current = true;

    if (notifyServer && callStartTime.current && socket) {
      const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
      socket.emit("end-call", { targetUserId: targetUser.id, duration });
    }

    webrtcService.endCall();

    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    // Only navigate if we're still mounted (this might set state on unmounted component if not careful, but navigate handles it)
    navigate("/dashboard");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case "connecting":
        return "bg-yellow-500";
      case "connected":
        return "bg-green-500";
      case "ended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case "connecting":
        return isIncoming ? "Answering..." : "Calling...";
      case "connected":
        return formatDuration(callDuration);
      case "ended":
        return "Call ended";
      default:
        return "Unknown";
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 ${isVideoCall ? "relative overflow-hidden" : "flex items-center justify-center p-4"}`}
    >
      {/* Hidden audio elements */}
      <audio ref={localAudioRef} autoPlay muted />
      <audio ref={remoteAudioRef} autoPlay />

      {isVideoCall ? (
        // Video Call Layout
        <div className="relative w-full h-full">
          {/* Remote Video (Main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${isFullscreen ? "fixed inset-0 z-40" : ""}`}
          />

          {/* Local Video (Picture-in-Picture) */}
          <div
            className={`absolute ${isFullscreen ? "top-4 right-4 z-50" : "top-4 right-4"} w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-white/20 ${!isVideoOn ? "bg-gray-800" : ""}`}
          >
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <VideoOff className="w-8 h-8 text-white/50" />
              </div>
            )}
          </div>

          {/* Video Call Controls Overlay */}
          <div
            className={`absolute bottom-0 left-0 right-0 ${isFullscreen ? "z-50" : ""} bg-gradient-to-t from-black/80 to-transparent p-6`}
          >
            {/* Status and User Info */}
            <div className="flex items-center justify-between mb-6 text-white">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10 ring-2 ring-white/20">
                  <AvatarImage src={targetUser.avatar} />
                  <AvatarFallback className="bg-gradient-to-r from-indigo-500 to-purple-500">
                    {targetUser.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{targetUser.username}</h3>
                  <Badge
                    className={`${getStatusColor()} text-white border-0 text-xs`}
                  >
                    {getStatusText()}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={toggleFullscreen}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Video Call Controls */}
            <div className="flex justify-center space-x-2 sm:space-x-4">
              {/* Video Toggle */}
              <Button
                onClick={toggleVideo}
                variant={isVideoOn ? "secondary" : "destructive"}
                size="lg"
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full p-0"
              >
                {isVideoOn ? (
                  <Video className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </Button>

              {/* Mute Button */}
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full p-0"
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </Button>

              {/* End Call Button */}
              <Button
                onClick={() => endCall()}
                variant="destructive"
                size="lg"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 p-0"
              >
                <PhoneOff className="w-6 h-6 sm:w-8 sm:h-8" />
              </Button>

              {/* Switch Camera */}
              <Button
                onClick={switchCamera}
                variant="secondary"
                size="lg"
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full p-0"
              >
                <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>

              {/* Speaker Button */}
              <Button
                onClick={toggleSpeaker}
                variant={isSpeakerOn ? "default" : "secondary"}
                size="lg"
                className="w-10 h-10 sm:w-14 sm:h-14 rounded-full p-0"
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </Button>
            </div>
          </div>

          {/* Fallback when no remote video */}
          {callStatus === "connected" && !isVideoCall && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
              <div className="text-center text-white">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 ring-4 ring-white/20">
                  <AvatarImage src={targetUser.avatar} />
                  <AvatarFallback className="text-2xl bg-gradient-to-r from-indigo-500 to-purple-500">
                    {targetUser.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold">{targetUser.username}</h2>
                <p className="text-white/70">Audio Only</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Audio Only Call Layout (Original)
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/10 backdrop-blur-md text-white">
          <CardContent className="p-8 text-center">
            {/* Status */}
            <div className="mb-6">
              <Badge
                className={`${getStatusColor()} text-white border-0 px-3 py-1 text-sm`}
              >
                {getStatusText()}
              </Badge>
            </div>

            {/* User Avatar */}
            <div className="mb-6">
              <Avatar className="w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4 ring-4 ring-white/20">
                <AvatarImage src={targetUser.avatar} />
                <AvatarFallback className="text-2xl bg-gradient-to-r from-indigo-500 to-purple-500">
                  {targetUser.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-2">{targetUser.username}</h2>
              <p className="text-white/70">
                {callStatus === "connecting"
                  ? isIncoming
                    ? "Incoming call"
                    : "Outgoing call"
                  : "In call"}
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4 sm:space-x-6 mb-6">
              {/* Mute Button */}
              <Button
                onClick={toggleMute}
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0"
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </Button>

              {/* End Call Button */}
              <Button
                onClick={() => endCall()}
                variant="destructive"
                size="lg"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 hover:bg-red-600 p-0"
              >
                <PhoneOff className="w-6 h-6 sm:w-8 sm:h-8" />
              </Button>

              {/* Speaker Button */}
              <Button
                onClick={toggleSpeaker}
                variant={isSpeakerOn ? "default" : "secondary"}
                size="lg"
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0"
              >
                {isSpeakerOn ? (
                  <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </Button>
            </div>

            {/* Connection Info */}
            {callStatus === "connected" && (
              <div className="text-sm text-white/60">
                <p>Connected • {isVideoCall ? "HD Video" : "HD Audio"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Call;
