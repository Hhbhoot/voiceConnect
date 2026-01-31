import { API_CONFIG } from "@/config/env";
import { authService } from "./auth";

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    avatar: string;
  };
  recipient: {
    id: string;
    username: string;
    avatar: string;
  };
  createdAt: string;
  type: string;
  status: string;
}

export interface Conversation {
  _id: string; // The partner's ID
  user: {
    id: string; // The partner's ID (mapped from _id lookup)
    username: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: Message;
  unreadCount: number;
}

class ChatService {
  private getHeaders() {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async getConversations(): Promise<Conversation[]> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("No user logged in");

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/conversations/${user.id}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch conversations");
    }

    return response.json();
  }

  async markAsRead(partnerId: string) {
    const user = authService.getCurrentUser();
    if (!user) return;

    await fetch(`${API_CONFIG.BASE_URL}/chat/${user.id}/${partnerId}/read`, {
      method: "POST",
      headers: this.getHeaders(),
    });
  }
}

export const chatService = new ChatService();
