import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Search,
  Settings,
  History,
  LogOut,
  Mic,
  MicOff,
  Users,
  PhoneCall,
  MessageCircle,
  Video,
} from "lucide-react";
import { authService, type User } from "@/services/auth";
import { useSocket } from "@/contexts/SocketContext";
import { webrtcService } from "@/services/webrtc";
import { useToast } from "@/components/ui/use-toast";
import CallingIndicator from "@/components/CallingIndicator";
import BackendStatus from "@/components/BackendStatus";
import { useChatNotifications } from "@/contexts/ChatNotificationContext";

const Dashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { socket, isConnected, connectSocket, disconnectSocket } = useSocket();
  const { unreadCount } = useChatNotifications();
  const [outgoingCall, setOutgoingCall] = useState<{
    targetUser: User;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);

    // Load users initially
    loadUsers();
  }, [navigate, socket]);

  // Setup socket event listeners when socket is available
  useEffect(() => {
    if (socket && isConnected) {
      console.log("🔌 Setting up Dashboard socket listeners");

      const handleUserOnline = (userData: User) => {
        console.log("👋 User came online:", userData.username);
        setUsers((prev) =>
          prev.map((u) => (u.id === userData.id ? { ...u, online: true } : u)),
        );
      };

      const handleUserOffline = (userData: { id: string }) => {
        console.log("👋 User went offline:", userData.id);
        setUsers((prev) =>
          prev.map((u) => (u.id === userData.id ? { ...u, online: false } : u)),
        );
      };

      socket.on("user-online", handleUserOnline);
      socket.on("user-offline", handleUserOffline);

      return () => {
        console.log("🧹 Cleaning up Dashboard socket listeners");
        socket.off("user-online", handleUserOnline);
        socket.off("user-offline", handleUserOffline);
      };
    }
  }, [socket, isConnected]);

  // Reload users when connection is established
  useEffect(() => {
    if (isConnected) {
      loadUsers();
    }
  }, [isConnected]);

  const loadUsers = async () => {
    try {
      const userList = await authService.getUsers();
      const currentUserId = authService.getCurrentUser()?.id;
      setUsers(userList.filter((u) => u.id !== currentUserId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    }
  };

  const handleCall = async (targetUser: User) => {
    setOutgoingCall({ targetUser });
    toast({
      title: "📞 Calling...",
      description: `Calling ${targetUser.username}`,
    });

    // Clear the indicator after a short delay and navigate
    setTimeout(() => {
      setOutgoingCall(null);
      navigate("/call", {
        state: { targetUser, isIncoming: false, isVideoCall: false },
      });
    }, 1500);
  };

  const handleVideoCall = async (targetUser: User) => {
    setOutgoingCall({ targetUser });
    toast({
      title: "📹 Video Calling...",
      description: `Video calling ${targetUser.username}`,
    });

    // Clear the indicator after a short delay and navigate
    setTimeout(() => {
      setOutgoingCall(null);
      navigate("/call", {
        state: { targetUser, isIncoming: false, isVideoCall: true },
      });
    }, 1500);
  };

  // Incoming call handling is now managed globally

  const handleLogout = () => {
    authService.logout();
    disconnectSocket(); // Use context disconnect
    navigate("/");
  };

  // Notification permission is now handled globally
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      {/* Calling Indicator */}
      <CallingIndicator
        isVisible={!!outgoingCall}
        targetUserName={outgoingCall?.targetUser.username || ""}
      />

      {/* Backend Status Checker */}
      <BackendStatus />

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 hidden sm:block">
                  VoiceConnect
                </h1>
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="ml-2"
                >
                  {isConnected ? (
                    <span className="hidden sm:inline">Connected</span>
                  ) : (
                    <span className="hidden sm:inline">Disconnected</span>
                  )}
                  <span
                    className={`sm:hidden w-2 h-2 rounded-full ${isConnected ? "bg-white" : "bg-gray-400"}`}
                  ></span>
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={currentUser?.avatar} />
                  <AvatarFallback>
                    {currentUser?.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-gray-900">
                  {currentUser?.username}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <nav className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate("/dashboard")}
                    >
                      <Users className="w-4 h-4 mr-3" />
                      Contacts
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start relative"
                      onClick={() => navigate("/messages")}
                    >
                      <MessageCircle className="w-4 h-4 mr-3" />
                      Messages
                      {unreadCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate("/history")}
                    >
                      <History className="w-4 h-4 mr-3" />
                      Call History
                    </Button>
                    <Separator className="my-4" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </Button>
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Contacts
                    </h2>
                    <p className="text-gray-600">
                      Select a contact to start a voice call
                    </p>
                  </div>

                  {/* Search */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search contacts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12"
                    />
                  </div>

                  {/* Contacts List */}
                  <div className="space-y-3">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No contacts found
                        </h3>
                        <p className="text-gray-500">
                          Try adjusting your search or check back later
                        </p>
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-col sm:flex-row items-center sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-4 sm:gap-0"
                        >
                          <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <div className="relative">
                              <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback>
                                  {user.username[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white ${user.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">
                                {user.username}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center">
                                {user.isOnline ? (
                                  <>
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                                    Online
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-1.5"></span>
                                    Offline
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 w-full sm:w-auto justify-stretch sm:justify-end">
                            <Button
                              onClick={() =>
                                navigate("/chat", { state: { chatUser: user } })
                              }
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                            >
                              <MessageCircle className="w-4 h-4 sm:mr-2" />
                              <span className="inline sm:hidden lg:inline">
                                Chat
                              </span>
                            </Button>
                            <Button
                              onClick={() => handleCall(user)}
                              disabled={!user.isOnline}
                              size="sm"
                              className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                            >
                              <PhoneCall className="w-4 h-4 sm:mr-2" />
                              <span className="inline sm:hidden lg:inline">
                                Voice
                              </span>
                            </Button>
                            <Button
                              onClick={() => handleVideoCall(user)}
                              disabled={!user.isOnline}
                              size="sm"
                              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                            >
                              <Video className="w-4 h-4 sm:mr-2" />
                              <span className="inline sm:hidden lg:inline">
                                Video
                              </span>
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
