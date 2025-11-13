import React, { createContext, useContext, useEffect, useState } from "react";
import { socketService } from "@/services/socket";
import { authService, type User } from "@/services/auth";
import { useToast } from "@/components/ui/use-toast";
import { notificationService } from "@/services/notifications";
import { Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectSocket: (user: User) => void;
  disconnectSocket: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connectSocket = (user: User) => {
    // Prevent multiple connections for the same user
    if (isConnecting || (socket && socket.connected)) {
      console.log("🔄 Socket already connected/connecting, skipping...");
      return;
    }

    setIsConnecting(true);
    console.log(
      "🔌 Establishing new socket connection for user:",
      user.username,
    );

    const newSocket = socketService.connect(user);

    // Handle connection events
    newSocket.on("connect", () => {
      setIsConnected(true);
      setIsConnecting(false);
      console.log("🟢 Socket connected successfully with ID:", newSocket.id);

      toast({
        title: "🔗 Connected",
        description: "Connected to VoiceConnect server",
      });

      // Request notification permission when connected
      notificationService.requestPermission().then((granted) => {
        if (granted) {
          console.log("🔔 Notifications enabled for incoming calls");
        }
      });
    });

    newSocket.on("disconnect", (reason) => {
      setIsConnected(false);
      setIsConnecting(false);
      console.log("🔴 Socket disconnected:", reason);

      // Only show error if it's an unexpected disconnect
      if (reason !== "io client disconnect") {
        toast({
          title: "⚠️ Disconnected",
          description: "Connection to server lost",
          variant: "destructive",
        });
      }
    });

    newSocket.on("connect_error", (error) => {
      setIsConnected(false);
      setIsConnecting(false);
      console.error("🔴 Socket connection error:", error);
      toast({
        title: "Connection Error",
        description:
          "Cannot connect to server. Please check if the backend is running.",
        variant: "destructive",
      });
    });

    newSocket.on("reconnect", (attemptNumber) => {
      setIsConnected(true);
      setIsConnecting(false);
      console.log("🔄 Socket reconnected after", attemptNumber, "attempts");
      toast({
        title: "🔗 Reconnected",
        description: "Connection restored",
      });
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      console.log("🔌 Manually disconnecting socket");
      socket.disconnect();
      socketService.disconnect();
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  // Auto-connect if user is logged in when the app starts
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user && !socket && !isConnecting) {
      console.log("🔍 Auto-connecting for logged in user:", user.username);
      connectSocket(user);
    }
  }, []); // Empty dependency array to run only once on mount

  // Clean up socket on unmount of the entire app
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
        socketService.disconnect();
      }
    };
  }, [socket]);

  // Listen for login events to auto-connect
  useEffect(() => {
    const handleUserLogin = () => {
      const user = authService.getCurrentUser();
      if (user && !socket && !isConnecting) {
        console.log("🔍 User logged in, connecting socket:", user.username);
        connectSocket(user);
      }
    };

    // Listen for storage changes (when user logs in from another tab or after login)
    window.addEventListener("storage", handleUserLogin);

    return () => {
      window.removeEventListener("storage", handleUserLogin);
    };
  }, [socket, isConnecting]);

  const value: SocketContextType = {
    socket,
    isConnected,
    connectSocket,
    disconnectSocket,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
