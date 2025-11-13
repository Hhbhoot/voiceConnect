import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  Calendar,
  MoreVertical,
  Video,
  Mic,
  AlertCircle,
} from "lucide-react";
import { authService, type User } from "@/services/auth";
import { useToast } from "@/components/ui/use-toast";

interface CallRecord {
  id: string;
  caller: {
    id: string;
    username: string;
    avatar: string;
  } | null;
  recipient: {
    id: string;
    username: string;
    avatar: string;
  } | null;
  status:
    | "initiated"
    | "ringing"
    | "answered"
    | "ended"
    | "missed"
    | "rejected"
    | "failed";
  type: "voice" | "video";
  duration: number;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  createdAt: string;
}

const History = () => {
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);
    loadCallHistory(user.id);
  }, [navigate]);

  const loadCallHistory = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/calls/${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch call history: ${response.status}`);
      }

      const history = await response.json();
      console.log("📞 Loaded call history:", history);

      // Filter out calls with invalid data
      const validCalls = history.filter((call: any) => {
        return call && (call.caller || call.recipient) && call.id;
      });

      setCallHistory(validCalls);
    } catch (error) {
      console.error("Error loading call history:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load call history",
      );
      toast({
        title: "Error",
        description: "Failed to load call history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today ${date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (error) {
      return "Unknown time";
    }
  };

  const getCallIcon = (call: CallRecord) => {
    if (call.status === "missed" || call.status === "rejected") {
      return PhoneMissed;
    }

    // Safe check for caller ID
    const callerId = call.caller?.id;
    const currentUserId = currentUser?.id;

    if (!callerId || !currentUserId) {
      return Phone;
    }

    return callerId === currentUserId ? PhoneOutgoing : PhoneIncoming;
  };

  const getCallTypeColor = (call: CallRecord) => {
    if (call.status === "missed" || call.status === "rejected") {
      return "text-red-600";
    }

    // Safe check for caller ID
    const callerId = call.caller?.id;
    const currentUserId = currentUser?.id;

    if (!callerId || !currentUserId) {
      return "text-gray-600";
    }

    return callerId === currentUserId ? "text-blue-600" : "text-green-600";
  };

  const getCallStatusText = (call: CallRecord) => {
    switch (call.status) {
      case "answered":
      case "ended":
        const callerId = call.caller?.id;
        const currentUserId = currentUser?.id;
        if (!callerId || !currentUserId) return "Unknown";
        return callerId === currentUserId ? "Outgoing" : "Incoming";
      case "missed":
        return "Missed";
      case "rejected":
        return "Declined";
      case "failed":
        return "Failed";
      default:
        const callerIdDefault = call.caller?.id;
        const currentUserIdDefault = currentUser?.id;
        if (!callerIdDefault || !currentUserIdDefault) return "Unknown";
        return callerIdDefault === currentUserIdDefault
          ? "Outgoing"
          : "Incoming";
    }
  };

  const getOtherParticipant = (call: CallRecord) => {
    if (!currentUser?.id) {
      return (
        call.caller ||
        call.recipient || {
          id: "unknown",
          username: "Unknown User",
          avatar: "",
        }
      );
    }

    if (call.caller?.id === currentUser.id) {
      return (
        call.recipient || {
          id: "unknown",
          username: "Unknown User",
          avatar: "",
        }
      );
    } else {
      return (
        call.caller || { id: "unknown", username: "Unknown User", avatar: "" }
      );
    }
  };

  const handleCallBack = (participant: any, isVideo: boolean = false) => {
    if (!participant || participant.id === "unknown") {
      toast({
        title: "Cannot call back",
        description: "User information is not available.",
        variant: "destructive",
      });
      return;
    }

    navigate("/call", {
      state: {
        targetUser: participant,
        isIncoming: false,
        isVideoCall: isVideo,
      },
    });
  };

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Error Loading Call History
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-2">
              <Button
                onClick={() => loadCallHistory(currentUser?.id || "")}
                variant="outline"
              >
                Try Again
              </Button>
              <Button onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Call History
                </h1>
                <p className="text-sm text-gray-500">
                  {callHistory.length} calls total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Recent Calls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse"
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : callHistory.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No call history
                </h3>
                <p className="text-gray-500 mb-4">
                  Your call history will appear here after you make or receive
                  calls
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Start Calling
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-1 p-6">
                  {callHistory.map((call) => {
                    const CallIcon = getCallIcon(call);
                    const otherParticipant = getOtherParticipant(call);

                    return (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={otherParticipant.avatar} />
                              <AvatarFallback>
                                {(otherParticipant.username ||
                                  "?")[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center ${getCallTypeColor(call)}`}
                            >
                              <CallIcon className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">
                                {otherParticipant.username || "Unknown User"}
                              </h3>
                              {call.type === "video" && (
                                <Badge variant="outline" className="text-xs">
                                  <Video className="w-3 h-3 mr-1" />
                                  Video
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>{formatDate(call.createdAt)}</span>
                              <span>•</span>
                              <span>{getCallStatusText(call)}</span>
                              {call.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(call.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              call.status === "missed" ||
                              call.status === "rejected"
                                ? "destructive"
                                : call.status === "answered" ||
                                    call.status === "ended"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {getCallStatusText(call)}
                          </Badge>

                          {/* Quick action buttons - shown on hover */}
                          {otherParticipant.id !== "unknown" && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCallBack(otherParticipant, false)
                                }
                                title="Call back (Voice)"
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCallBack(otherParticipant, true)
                                }
                                title="Call back (Video)"
                              >
                                <Video className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default History;
