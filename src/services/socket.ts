import { io, Socket } from "socket.io-client";
import { API_CONFIG } from "@/config/env";

class SocketService {
  private socket: Socket | null = null;
  private readonly url: string = API_CONFIG.SOCKET_URL;
  private isConnecting: boolean = false;

  connect(userData: { id: string; username: string; avatar: string }) {
    // Don't create new connection if already connecting/connected
    if (
      this.isConnecting ||
      (this.socket && (this.socket.connected || this.socket.connecting))
    ) {
      console.log("🔄 Socket already exists and is connected/connecting");
      return this.socket!;
    }

    this.isConnecting = true;

    // Disconnect existing connection if any
    if (this.socket) {
      console.log("🔌 Disconnecting existing socket before creating new one");
      this.socket.disconnect();
    }

    console.log("🔌 Connecting to Socket.io server:", this.url);

    this.socket = io(this.url, {
      transports: ["websocket", "polling"], // Allow both transports
      timeout: 20000, // 20 second timeout
      forceNew: true, // Force new connection
    });

    this.socket.on("connect", () => {
      this.isConnecting = false;
      console.log("✅ Connected to server with ID:", this.socket?.id);
      this.socket?.emit("join", userData);
    });

    this.socket.on("connect_error", (error) => {
      this.isConnecting = false;
      console.error("❌ Socket connection error:", error);
    });

    this.socket.on("disconnect", (reason) => {
      this.isConnecting = false;
      console.log("🔌 Disconnected from server:", reason);
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts");
    });

    this.socket.on("reconnect_error", (error) => {
      console.error("❌ Reconnection error:", error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  getSocket() {
    return this.socket;
  }

  // Call methods
  callUser(targetUserId: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit("call-user", { targetUserId, offer });
  }

  answerCall(targetUserId: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit("answer-call", { targetUserId, answer });
  }

  sendIceCandidate(targetUserId: string, candidate: RTCIceCandidate) {
    this.socket?.emit("ice-candidate", { targetUserId, candidate });
  }

  endCall(targetUserId: string, duration: number) {
    this.socket?.emit("end-call", { targetUserId, duration });
  }

  rejectCall(targetUserId: string) {
    this.socket?.emit("reject-call", { targetUserId });
  }
}

export const socketService = new SocketService();
