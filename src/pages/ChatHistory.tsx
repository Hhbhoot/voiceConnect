import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, MessageCircle, Clock, Users } from "lucide-react";
import { authService, type User } from "@/services/auth";
import { useToast } from "@/components/ui/use-toast";
import { useSocket } from "@/contexts/SocketContext";

interface Conversation {
  _id: string;
  user: User;
  lastMessage: {
    _id: string;
    content: string;
    createdAt: string;
    sender: string;
    type: string;
  };
  unreadCount: number;
}

const ChatHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);
    loadConversations(user.id);
  }, [navigate]);

  const loadConversations = async (userId: string) => {
    try {
      setIsLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/conversations/${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = await response.json();
      setConversations(data);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleMessage = (message: any) => {
      console.log("Message received in ChatHistory:", message);
      setConversations((prevConversations) =>
        prevConversations.map((conversation) => {
          // Identify conversation by matching the user's ID (partner ID)
          // The senderId of the incoming message matches the partner ID if it's an incoming message
          // The recipientId of the incoming message matches the partner ID if it's an outgoing message

          if (
            conversation._id === message.senderId ||
            conversation._id === message.recipientId
          ) {
            const isIncoming = message.senderId !== currentUser.id;
            return {
              ...conversation,
              lastMessage: {
                _id: message.id,
                content:
                  message.type === "image"
                    ? "📷 Photo"
                    : message.type === "voice"
                      ? "🎤 Voice Message"
                      : message.content,
                createdAt: message.timestamp,
                sender: message.senderId,
                type: message.type,
              },
              unreadCount: isIncoming
                ? (conversation.unreadCount || 0) + 1
                : conversation.unreadCount,
            };
          }
          return conversation;
        }),
      );
    };

    const handleMessagesRead = (data: {
      conversationId: string;
      userId: string;
    }) => {
      console.log("Messages read event:", data);
      // Only clear unread count if WE (currentUser) read the messages
      if (data.userId === currentUser.id) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c._id === data.conversationId) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          }),
        );
      }
    };

    socket.on("message", handleMessage);
    socket.on("messages-read", handleMessagesRead);

    return () => {
      socket.off("message", handleMessage);
      socket.off("messages-read", handleMessagesRead);
    };
  }, [socket, currentUser]);

  const handleStartChat = (user: User) => {
    // Navigate to chat with proper user data
    navigate("/chat", {
      state: {
        chatUser: {
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          online: user.isOnline || false,
        },
      },
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // Within a week
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  };

  const filteredConversations = conversations.filter((conversation) =>
    conversation.user.username
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Chat History
                  </h1>
                  <p className="text-sm text-gray-500">
                    {conversations.length} conversations
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Avatar className="w-8 h-8">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback>
                  {currentUser?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Conversations</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <Users className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading conversations...</p>
                </div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery
                    ? "No conversations found"
                    : "No chat history yet"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Start chatting with your contacts to see conversations here"}
                </p>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Browse Contacts
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.user._id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleStartChat(conversation.user)}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={conversation.user.avatar} />
                            <AvatarFallback>
                              {conversation.user.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              conversation.user.isOnline
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.user.username}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-red-500 text-white text-xs px-2 py-1">
                                  {conversation.unreadCount > 99
                                    ? "99+"
                                    : conversation.unreadCount}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {formatTime(conversation.lastMessage.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate flex-1">
                              {conversation.lastMessage.sender ===
                                currentUser?.id && (
                                <span className="font-medium">You: </span>
                              )}
                              {conversation.lastMessage.type === "image"
                                ? "📸 Photo"
                                : truncateMessage(
                                    conversation.lastMessage.content,
                                  )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatHistory;
