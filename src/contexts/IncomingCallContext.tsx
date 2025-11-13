import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./SocketContext";
import { type User } from "@/services/auth";
import { useToast } from "@/components/ui/use-toast";
import { notificationService } from "@/services/notifications";
import IncomingCallModal from "@/components/IncomingCallModal";

interface IncomingCallData {
  caller: User;
  offer: RTCSessionDescriptionInit;
  callId: string;
  isVideoCall?: boolean;
}

interface IncomingCallContextType {
  incomingCall: IncomingCallData | null;
  acceptCall: () => void;
  declineCall: () => void;
}

const IncomingCallContext = createContext<IncomingCallContextType | undefined>(
  undefined,
);

export const useIncomingCall = () => {
  const context = useContext(IncomingCallContext);
  if (context === undefined) {
    throw new Error(
      "useIncomingCall must be used within an IncomingCallProvider",
    );
  }
  return context;
};

interface IncomingCallProviderProps {
  children: React.ReactNode;
}

export const IncomingCallProvider: React.FC<IncomingCallProviderProps> = ({
  children,
}) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const { socket } = useSocket();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Set up incoming call listeners
  useEffect(() => {
    if (socket) {
      const handleIncomingCall = (data: {
        from: User;
        offer: RTCSessionDescriptionInit;
        callId: string;
        isVideoCall?: boolean;
      }) => {
        console.log(
          `📞 Incoming ${data.isVideoCall ? "video" : "voice"} call from:`,
          data.from.username,
        );

        // Set incoming call state
        setIncomingCall({
          caller: data.from,
          offer: data.offer,
          callId: data.callId,
          isVideoCall: data.isVideoCall,
        });

        // Show browser notification
        notificationService.showIncomingCallNotification(
          data.from.username,
          data.from.avatar,
        );

        // Show toast notification as backup
        toast({
          title: "📞 Incoming Call",
          description: `${data.from.username} is calling you`,
          duration: 10000,
        });
      };

      const handleCallRejected = () => {
        toast({
          title: "📞 Call Declined",
          description: "The user declined your call",
          variant: "destructive",
        });
      };

      const handleCallEnded = () => {
        // Clear any incoming call state
        setIncomingCall(null);
        notificationService.clearCallNotifications();
      };

      // Add event listeners
      socket.on("incoming-call", handleIncomingCall);
      socket.on("call-rejected", handleCallRejected);
      socket.on("call-ended", handleCallEnded);

      // Cleanup on unmount or socket change
      return () => {
        socket.off("incoming-call", handleIncomingCall);
        socket.off("call-rejected", handleCallRejected);
        socket.off("call-ended", handleCallEnded);
      };
    }
  }, [socket, toast]);

  const acceptCall = () => {
    if (incomingCall) {
      console.log("✅ Accepting call from:", incomingCall.caller.username);
      notificationService.clearCallNotifications();
      navigate("/call", {
        state: {
          targetUser: incomingCall.caller,
          offer: incomingCall.offer,
          isIncoming: true,
          isVideoCall: incomingCall.isVideoCall || false,
        },
      });
      setIncomingCall(null);
    }
  };

  const declineCall = () => {
    if (incomingCall && socket) {
      console.log("❌ Declining call from:", incomingCall.caller.username);
      notificationService.clearCallNotifications();
      socket.emit("reject-call", { targetUserId: incomingCall.caller.id });
      setIncomingCall(null);
      toast({
        title: "📞 Call Declined",
        description: `Declined call from ${incomingCall.caller.username}`,
      });
    }
  };

  const value: IncomingCallContextType = {
    incomingCall,
    acceptCall,
    declineCall,
  };

  return (
    <IncomingCallContext.Provider value={value}>
      {children}

      {/* Global Incoming Call Modal - Available on ALL pages */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        caller={incomingCall?.caller || null}
        isVideoCall={incomingCall?.isVideoCall || false}
        onAccept={acceptCall}
        onDecline={declineCall}
      />
    </IncomingCallContext.Provider>
  );
};
