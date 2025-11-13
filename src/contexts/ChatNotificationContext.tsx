import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";
import { authService, type User } from "@/services/auth";
import { notificationService } from "@/services/notifications";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "react-router-dom";

interface ChatNotificationContextType {
  unreadCount: number;
  unreadMessages: Map<string, number>;
  markAsRead: (userId: string) => void;
  clearAllUnread: () => void;
}

const ChatNotificationContext = createContext<
  ChatNotificationContextType | undefined
>(undefined);

export const useChatNotifications = () => {
  const context = useContext(ChatNotificationContext);
  if (context === undefined) {
    throw new Error(
      "useChatNotifications must be used within a ChatNotificationProvider",
    );
  }
  return context;
};

interface ChatNotificationProviderProps {
  children: React.ReactNode;
}

export const ChatNotificationProvider: React.FC<
  ChatNotificationProviderProps
> = ({ children }) => {
  const { socket } = useSocket();
  const { toast } = useToast();
  const location = useLocation();

  const [unreadMessages, setUnreadMessages] = useState<Map<string, number>>(
    new Map(),
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentChatUser, setCurrentChatUser] = useState<string | null>(null);

  // Track current chat user based on location
  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    // Extract current chat user from location state
    if (location.pathname === "/chat" && location.state) {
      const { chatUser } = location.state as { chatUser?: User };
      setCurrentChatUser(chatUser?.id || null);
    } else {
      setCurrentChatUser(null);
    }
  }, [location]);

  useEffect(() => {
    if (socket && currentUser) {
      console.log(
        "🔔 Setting up chat notification listeners for",
        currentUser.username,
      );

      const handleNewMessage = (messageData: {
        id: string;
        senderId: string;
        senderName: string;
        content: string;
        timestamp: string;
        type: string;
      }) => {
        console.log(
          "🔔 Message received in notification context:",
          messageData,
        );

        // Don't count messages from current user
        if (messageData.senderId === currentUser.id) {
          console.log("🔔 Ignoring own message");
          return;
        }

        const isCurrentChat = currentChatUser === messageData.senderId;
        const isAppVisible = document.visibilityState === "visible";
        const isOnChatPage = location.pathname === "/chat";

        console.log("🔔 Notification context:", {
          isCurrentChat,
          isAppVisible,
          isOnChatPage,
          currentChatUser,
          senderId: messageData.senderId,
        });

        // Always update unread count first
        setUnreadMessages((prev) => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(messageData.senderId) || 0;
          newMap.set(messageData.senderId, currentCount + 1);
          console.log(
            "🔔 Updated unread count for",
            messageData.senderName,
            ":",
            currentCount + 1,
          );
          return newMap;
        });

        // Show notification if user is not actively chatting with sender
        if (!isCurrentChat || !isAppVisible || !isOnChatPage) {
          console.log("🔔 Showing notification for", messageData.senderName);

          // Show browser notification
          notificationService.showChatMessageNotification(
            messageData.senderName,
            messageData.content,
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${messageData.senderName}`,
            messageData.senderId,
          );

          // Show toast notification if app is visible but not in the specific chat
          if (isAppVisible && (!isOnChatPage || !isCurrentChat)) {
            toast({
              title: `💬 ${messageData.senderName}`,
              description:
                messageData.type === "image"
                  ? "📸 Sent an image"
                  : messageData.type === "voice"
                    ? "🎵 Sent a voice message"
                    : messageData.content.length > 50
                      ? messageData.content.substring(0, 50) + "..."
                      : messageData.content,
              duration: 3000,
            });
          }
        } else {
          console.log("🔔 Not showing notification - user is in current chat");
        }
      };

      // Listen for new messages
      socket.on("message", handleNewMessage);

      // Listen for typing indicators (optional: could show subtle notifications)
      socket.on("typing", (data: { userId: string; userName: string }) => {
        // Only show typing notification if not in current chat
        if (data.userId !== currentChatUser && location.pathname !== "/chat") {
          toast({
            title: `💭 ${data.userName} is typing...`,
            description: "New message incoming",
            duration: 2000,
          });
        }
      });

      return () => {
        console.log("🔔 Cleaning up chat notification listeners");
        socket.off("message", handleNewMessage);
        socket.off("typing");
      };
    }
  }, [socket, currentUser, currentChatUser, location, toast]);

  // Listen for navigation to chat to clear notifications
  useEffect(() => {
    const handleNavigateToChat = (event: CustomEvent) => {
      const { userId } = event.detail;
      markAsRead(userId);
    };

    window.addEventListener(
      "navigateToChat",
      handleNavigateToChat as EventListener,
    );

    return () => {
      window.removeEventListener(
        "navigateToChat",
        handleNavigateToChat as EventListener,
      );
    };
  }, []);

  // Clear notifications when entering a chat
  useEffect(() => {
    if (currentChatUser) {
      markAsRead(currentChatUser);
      notificationService.clearChatNotifications();
    }
  }, [currentChatUser]);

  // Also clear unread count when user is actively viewing chat page
  useEffect(() => {
    if (location.pathname === "/chat" && currentChatUser) {
      // Mark messages as read on the server
      if (socket) {
        socket.emit("mark-messages-read", {
          senderId: currentChatUser,
          recipientId: currentUser?.id,
        });
      }
      markAsRead(currentChatUser);
    }
  }, [location.pathname, currentChatUser, socket, currentUser]);

  const markAsRead = (userId: string) => {
    setUnreadMessages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  const clearAllUnread = () => {
    setUnreadMessages(new Map());
    notificationService.clearChatNotifications();
  };

  const unreadCount = Array.from(unreadMessages.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const value: ChatNotificationContextType = {
    unreadCount,
    unreadMessages,
    markAsRead,
    clearAllUnread,
  };

  return (
    <ChatNotificationContext.Provider value={value}>
      {children}
    </ChatNotificationContext.Provider>
  );
};
