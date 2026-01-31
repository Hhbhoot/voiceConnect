import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  MessageCircle,
  ArrowLeft,
  Phone,
  MoreVertical,
  Plus,
} from "lucide-react";
import { authService, type User } from "@/services/auth";
import { useSocket } from "@/contexts/SocketContext"; // Check if this import is correct based on prev files
import { chatService } from "@/services/chat";
import { useLocation } from "react-router-dom";

interface ChatPreview {
  user: User;
  lastMessage?: {
    content: string;
    timestamp: string;
    senderId: string;
  };
  unreadCount: number;
  isOnline: boolean;
}

const ChatList = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const location = useLocation(); // Added this
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);
    loadConversations();
  }, [navigate]);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const handleNewMessage = (message: any) => {
      console.log("ChatList: Received new message event", message);
      setConversations((prevModels) => {
        const senderId = message.senderId;
        const recipientId = message.recipientId;

        // Try to find conversation by the partner's ID
        // In our backend aggregation, the root `_id` of the conversation object IS the partner's ID
        const conversationIndex = prevModels.findIndex((c) => {
          const partnerId = c._id;
          return partnerId === senderId || partnerId === recipientId;
        });

        if (conversationIndex === -1) {
          console.log(
            "ChatList: Conversation not found for (sender/recipient)",
            senderId,
            recipientId,
            "reloading silently...",
          );
          // New conversation starter!
          loadConversations(true);
          return prevModels;
        }

        console.log(
          "ChatList: Updating conversation at index",
          conversationIndex,
        );
        const updatedConversation = { ...prevModels[conversationIndex] };

        updatedConversation.lastMessage = {
          content:
            message.type === "image"
              ? "📷 Image"
              : message.type === "voice"
                ? "🎤 Voice Message"
                : message.content,
          createdAt: message.timestamp,
        };

        // Update unread count if it's incoming (sender is not us)
        if (senderId !== currentUser.id) {
          updatedConversation.unreadCount =
            (updatedConversation.unreadCount || 0) + 1;
        }

        const newConversations = [...prevModels];
        newConversations.splice(conversationIndex, 1);
        newConversations.unshift(updatedConversation);
        return newConversations;
      });
    };

    socket.on("message", handleNewMessage);

    return () => {
      socket.off("message", handleNewMessage);
    };
  }, [socket, currentUser]);

  // Refresh list when navigating back (in case we read messages)
  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [location.pathname, currentUser]);

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const startChat = (conversation: any) => {
    // Map conversation user to User type
    const userToChat = {
      id: conversation.user.id || conversation.user._id,
      username: conversation.user.username,
      avatar: conversation.user.avatar,
      isOnline: conversation.user.isOnline,
      email: conversation.user.email || "", // fallback
    };
    navigate("/chat", { state: { chatUser: userToChat } });
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredChats = conversations.filter((chat) =>
    chat.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>Conversations</span>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Chat List */}
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-12 text-gray-400">
                    Loading...
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No conversations yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start a conversation with someone from your contacts
                    </p>
                    <Button onClick={() => navigate("/dashboard")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start Chatting
                    </Button>
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <div
                      key={chat._id || chat.user.id}
                      onClick={() => startChat(chat)}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="relative">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={chat.user.avatar} />
                            <AvatarFallback>
                              {chat.user.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                              chat.user.isOnline
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900 truncate">
                              {chat.user.username}
                            </h3>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-500">
                                {formatTime(
                                  chat.lastMessage.createdAt ||
                                    chat.lastMessage.timestamp,
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-sm text-gray-500 truncate">
                              {chat.lastMessage
                                ? chat.lastMessage.content
                                : "Start a conversation"}
                            </p>
                            {chat.unreadCount > 0 && (
                              <Badge className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/call", {
                              state: {
                                targetUser: chat.user,
                                isIncoming: false,
                              },
                            });
                          }}
                          disabled={!chat.user.isOnline}
                        >
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChatList;
