import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Send,
  Phone,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  Video,
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";
import { authService, type User } from "@/services/auth";
import { useSocket } from "@/contexts/SocketContext";
import { useToast } from "@/components/ui/use-toast";
import ImageUpload from "@/components/ImageUpload";
import ChatImage from "@/components/ChatImage";
import EmojiPicker from "@/components/EmojiPicker";
import VoiceRecorder from "@/components/VoiceRecorder";
import VoiceMessage from "@/components/VoiceMessage";
import { chatService } from "@/services/chat";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: "text" | "image" | "voice" | "system";
  imageUrl?: string;
  caption?: string;
  audioUrl?: string;
  duration?: number;
}

const Chat = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();

  // Get chat partner from navigation state
  const { chatUser } = (location.state as { chatUser: User }) || {};

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const listenersSetupRef = useRef(false);
  const chatRoomJoinedRef = useRef(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (!user) {
      navigate("/");
      return;
    }
    setCurrentUser(user);

    if (!chatUser) {
      navigate("/dashboard");
      return;
    }

    // Load chat history when component mounts
    loadChatHistory(user.id, chatUser.id);
    console.log("📚 Loaded chat history", user, chatUser);

    // Reset refs when chat user changes
    return () => {
      listenersSetupRef.current = false;
      chatRoomJoinedRef.current = false;
    };
  }, [chatUser, navigate]);

  // Setup socket event listeners only once
  useEffect(() => {
    if (
      socket &&
      isConnected &&
      currentUser &&
      chatUser &&
      !listenersSetupRef.current
    ) {
      console.log("🔌 Setting up chat socket listeners for", chatUser.username);

      listenersSetupRef.current = true;

      // Join chat room only once
      if (!chatRoomJoinedRef.current) {
        socket.emit("join-chat", {
          userId: currentUser.id,
          chatPartnerId: chatUser.id,
        });

        // Mark messages as read when entering chat
        socket.emit("mark-messages-read", {
          senderId: chatUser.id,
          recipientId: currentUser.id,
        });

        // Also call the API for persistence
        chatService
          .markAsRead(chatUser.id)
          .catch((err) => console.error("Failed to mark as read:", err));

        chatRoomJoinedRef.current = true;
      }

      // Socket event listeners for chat
      socket.on("message", handleNewMessage);
      socket.on("chat-history", handleChatHistory);
      socket.on("typing", handleTyping);
      socket.on("stop-typing", handleStopTyping);
      socket.on("user-online", handleUserOnline);
      socket.on("user-offline", handleUserOffline);

      return () => {
        console.log("🧹 Cleaning up chat socket listeners");

        // Leave the chat room
        if (socket && currentUser && chatUser) {
          socket.emit("leave-chat", {
            userId: currentUser.id,
            chatPartnerId: chatUser.id,
          });
        }

        socket.off("message", handleNewMessage);
        socket.off("chat-history", handleChatHistory);
        socket.off("typing", handleTyping);
        socket.off("stop-typing", handleStopTyping);
        socket.off("user-online", handleUserOnline);
        socket.off("user-offline", handleUserOffline);
        listenersSetupRef.current = false;
        chatRoomJoinedRef.current = false;
      };
    }
  }, [socket, isConnected, currentUser, chatUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  console.log(chatUser, currentUser);

  const loadChatHistory = async (userId: string, partnerId: string) => {
    try {
      setIsLoadingHistory(true);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(
        `${API_URL}/api/chat/${userId}/${partnerId}`,
      );
      if (response.ok) {
        const history = await response.json();
        console.log("📚 Loaded chat history:", history.length, "messages");
        const formattedMessages = history.map((msg: any) => ({
          id: msg.id,
          senderId: msg.sender.id,
          senderName: msg.sender.username,
          content: msg.content,
          timestamp: msg.createdAt,
          type: msg.type,
          imageUrl: msg.type === "image" ? msg.attachment?.url : undefined,
          caption: msg.type === "image" ? msg.attachment?.caption : undefined,
          audioUrl: msg.type === "voice" ? msg.attachment?.url : undefined,
          duration: msg.type === "voice" ? msg.attachment?.duration : undefined,
        }));
        setMessages(formattedMessages);
        console.log("📚 Loaded chat history:", formattedMessages);
      } else {
        console.warn("Failed to load chat history:", response.status);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast({
        title: "Error loading history",
        description: "Failed to load chat history. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleChatHistory = (history: any[]) => {
    // Only log if there are actually messages to avoid spam
    if (history.length > 0) {
      console.log(
        "📚 Received chat history from socket:",
        history.length,
        "messages",
      );
    }
    const formattedMessages = history.map((msg: any) => ({
      id: msg.id,
      senderId: msg.sender.id,
      senderName: msg.sender.username,
      content: msg.content,
      timestamp: msg.createdAt,
      type: msg.type,
      imageUrl: msg.type === "image" ? msg.attachment?.url : undefined,
      caption: msg.type === "image" ? msg.attachment?.caption : undefined,
      audioUrl: msg.type === "voice" ? msg.attachment?.url : undefined,
      duration: msg.type === "voice" ? msg.attachment?.duration : undefined,
    }));
    setMessages(formattedMessages);
  };

  const handleNewMessage = (message: Message) => {
    setMessages((prev) => {
      // Check if message already exists to avoid duplicates
      const messageExists = prev.some((m) => m.id === message.id);
      if (messageExists) {
        return prev;
      }
      // Only log when actually adding a new message
      console.log("💬 New message received:", message.content);
      return [...prev, message];
    });
  };

  const handleTyping = (data: { userId: string; userName: string }) => {
    if (data.userId === chatUser?.id) {
      setPartnerTyping(true);
      // Clear typing indicator after 3 seconds
      setTimeout(() => setPartnerTyping(false), 3000);
    }
  };

  const handleStopTyping = (data: { userId: string }) => {
    if (data.userId === chatUser?.id) {
      setPartnerTyping(false);
    }
  };

  const handleUserOnline = (userData: User) => {
    if (userData.id === chatUser?.id) {
      setIsOnline(true);
    }
  };

  const handleUserOffline = (userData: { id: string }) => {
    if (userData.id === chatUser?.id) {
      setIsOnline(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newMessage.trim() ||
      !socket ||
      !currentUser ||
      !chatUser ||
      !isConnected
    ) {
      console.log("❌ Cannot send message - missing requirements");
      return;
    }

    const message = {
      content: newMessage.trim(),
      type: "text",
    };

    console.log("📤 Sending message:", message);

    // Send to server - don't add to local state immediately
    // The server will echo it back and we'll add it via handleNewMessage
    socket.emit("send-message", {
      recipientId: chatUser.id,
      message,
    });

    setNewMessage("");
    stopTyping();
  };

  const sendImage = (imageUrl: string, publicId: string, caption?: string) => {
    if (!socket || !currentUser || !chatUser || !isConnected) {
      console.log("❌ Cannot send image - missing requirements");
      return;
    }

    const message = {
      content: caption || "📸 Image",
      type: "image",
      imageUrl,
      publicId,
      caption,
    };

    console.log("📤 Sending image:", message);

    // Send to server
    socket.emit("send-message", {
      recipientId: chatUser.id,
      message,
    });

    setShowImageUpload(false);
  };

  const sendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!socket || !currentUser || !chatUser || !isConnected) {
      console.log("❌ Cannot send voice message - missing requirements");
      return;
    }

    try {
      // Convert blob to base64 for sending
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice-message.webm");

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${API_URL}/api/upload/audio`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      const message = {
        content: `🎵 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, "0")})`,
        type: "voice",
        audioUrl: result.audioUrl,
        duration,
      };

      console.log("📤 Sending voice message:", message);

      // Send to server
      socket.emit("send-message", {
        recipientId: chatUser.id,
        message,
      });

      setShowVoiceRecorder(false);
    } catch (error) {
      console.error("Error sending voice message:", error);
      toast({
        title: "Error",
        description: "Failed to send voice message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    // Handle typing indicator
    if (e.target.value && !isTyping && socket && currentUser && isConnected) {
      setIsTyping(true);
      socket.emit("typing", {
        recipientId: chatUser?.id,
        userId: currentUser.id,
        userName: currentUser.username,
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    if (socket && currentUser && isTyping && isConnected) {
      setIsTyping(false);
      socket.emit("stop-typing", {
        recipientId: chatUser?.id,
        userId: currentUser.id,
      });
    }
  };

  const startVoiceCall = () => {
    navigate("/call", {
      state: {
        targetUser: chatUser,
        isIncoming: false,
        isVideoCall: false,
      },
    });
  };

  const startVideoCall = () => {
    navigate("/call", {
      state: {
        targetUser: chatUser,
        isIncoming: false,
        isVideoCall: true,
      },
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups: { [key: string]: Message[] }, message) => {
      const date = new Date(message.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {},
  );

  if (!chatUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No chat selected</h2>
          <Button onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Chat Header */}
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
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={chatUser.avatar} />
                    <AvatarFallback>
                      {chatUser.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      isOnline ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {chatUser.username}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {!isConnected
                      ? "Connecting..."
                      : isOnline
                        ? "Online"
                        : "Offline"}
                    {partnerTyping && " • typing..."}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={startVideoCall}
                disabled={!isOnline || !isConnected}
                title="Start video call"
              >
                <Video className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Video</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startVoiceCall}
                disabled={!isOnline || !isConnected}
                title="Start voice call"
              >
                <Phone className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Call</span>
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6 h-[calc(100vh-80px)]">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm h-full flex flex-col">
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-2 sm:p-4">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading chat history...</p>
                  </div>
                </div>
              ) : Object.keys(groupedMessages).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start your conversation
                    </h3>
                    <p className="text-gray-500">
                      Send a message to begin chatting with {chatUser?.username}
                    </p>
                  </div>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, dayMessages]) => (
                  <div key={date} className="mb-6">
                    {/* Date Separator */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="bg-gray-100 rounded-full px-3 py-1">
                        <span className="text-xs text-gray-500 font-medium">
                          {formatDate(dayMessages[0].timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Messages for this date */}
                    {dayMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`mb-4 flex ${
                          message.senderId === currentUser?.id
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        {message.type === "image" ? (
                          // Image Message
                          <div
                            className={`${
                              message.senderId === currentUser?.id
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded-lg"
                                : ""
                            }`}
                          >
                            <ChatImage
                              imageUrl={message.imageUrl || message.content}
                              caption={message.caption}
                              timestamp={message.timestamp}
                              isOwn={message.senderId === currentUser?.id}
                            />
                          </div>
                        ) : message.type === "voice" ? (
                          // Voice Message
                          <VoiceMessage
                            audioUrl={message.audioUrl || message.content}
                            duration={message.duration || 0}
                            timestamp={message.timestamp}
                            isOwn={message.senderId === currentUser?.id}
                          />
                        ) : (
                          // Text Message
                          <div
                            className={`max-w-[85%] sm:max-w-md px-4 py-2 rounded-lg ${
                              message.senderId === currentUser?.id
                                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderId === currentUser?.id
                                  ? "text-indigo-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {partnerTyping && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>
          </CardContent>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <form
              onSubmit={sendMessage}
              className="flex items-center space-x-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => setShowImageUpload(true)}
                disabled={!isConnected}
                title="Send image"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <div className="flex-1 relative">
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={
                    isConnected ? "Type a message..." : "Connecting..."
                  }
                  className="pr-20"
                  disabled={!isConnected}
                />
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                  <EmojiPicker onEmojiSelect={addEmoji} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 h-6 w-6 p-0"
                    onClick={() => setShowVoiceRecorder(true)}
                    disabled={!isConnected}
                    title="Record voice message"
                  >
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>

          {/* Image Upload Modal */}
          <ImageUpload
            isOpen={showImageUpload}
            onClose={() => setShowImageUpload(false)}
            onImageSend={sendImage}
          />

          {/* Voice Recorder Modal */}
          <VoiceRecorder
            isOpen={showVoiceRecorder}
            onClose={() => setShowVoiceRecorder(false)}
            onVoiceSend={sendVoiceMessage}
          />
        </Card>
      </div>
    </div>
  );
};

export default Chat;
