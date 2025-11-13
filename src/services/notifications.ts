// Enhanced notification service for VoiceConnect with chat notifications

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = "default";
  private activeNotifications: Map<string, Notification> = new Map();

  private constructor() {
    this.checkPermission();
    this.setupVisibilityListener();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private checkPermission() {
    if ("Notification" in window) {
      this.permission = Notification.permission;
    }
  }

  private setupVisibilityListener() {
    // Listen for page visibility changes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // Clear chat notifications when user returns to the app
        this.clearChatNotifications();
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (this.permission === "granted") {
      return true;
    }

    if (this.permission === "default") {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === "granted";
    }

    return false;
  }

  // Chat message notifications
  showChatMessageNotification(
    senderName: string,
    message: string,
    senderAvatar?: string,
    chatId?: string,
  ) {
    // Only show notification if page is not visible or user is not in the specific chat
    if (
      this.permission === "granted" &&
      (document.visibilityState === "hidden" ||
        this.shouldShowChatNotification(chatId))
    ) {
      const notificationId = `chat-${senderName}-${Date.now()}`;

      const notification = new Notification(`💬 ${senderName}`, {
        body: this.truncateMessage(message),
        icon: senderAvatar || "/placeholder.svg",
        tag: `chat-${senderName}`, // Replaces previous notifications from same sender
        requireInteraction: false,
        badge: senderAvatar || "/placeholder.svg",
        data: {
          type: "chat",
          senderId: chatId,
          senderName,
          timestamp: Date.now(),
        },
        actions: [
          { action: "reply", title: "Reply" },
          { action: "mark_read", title: "Mark as Read" },
        ],
      });

      // Store notification reference
      this.activeNotifications.set(notificationId, notification);

      // Auto-close after 5 seconds for chat messages
      setTimeout(() => {
        notification.close();
        this.activeNotifications.delete(notificationId);
      }, 5000);

      // Handle notification clicks
      notification.onclick = () => {
        window.focus();
        // Navigate to chat if possible
        if (chatId) {
          this.navigateToChat(chatId, senderName);
        }
        notification.close();
        this.activeNotifications.delete(notificationId);
      };

      return notification;
    }
    return null;
  }

  // Check if we should show chat notification based on current route
  private shouldShowChatNotification(chatId?: string): boolean {
    const currentPath = window.location.pathname;

    // Don't show notification if user is already in chat with the sender
    if (currentPath === "/chat" && chatId) {
      // Check if currently chatting with the sender (this would need to be passed from chat component)
      const urlParams = new URLSearchParams(window.location.search);
      const currentChatUser = urlParams.get("user");
      return currentChatUser !== chatId;
    }

    // Show notification if user is not on chat page
    return currentPath !== "/chat";
  }

  private navigateToChat(userId: string, userName: string) {
    // This would need to be implemented based on your routing logic
    // For now, we'll dispatch a custom event that components can listen to
    window.dispatchEvent(
      new CustomEvent("navigateToChat", {
        detail: { userId, userName },
      }),
    );
  }

  private truncateMessage(message: string, maxLength: number = 50): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  }

  // Incoming call notifications (existing)
  showIncomingCallNotification(callerName: string, callerAvatar?: string) {
    if (this.permission === "granted") {
      const notification = new Notification(
        `📞 Incoming call from ${callerName}`,
        {
          body: "Click to answer the call",
          icon: callerAvatar || "/placeholder.svg",
          tag: "voiceconnect-incoming-call",
          requireInteraction: true,
          actions: [
            { action: "answer", title: "Answer" },
            { action: "decline", title: "Decline" },
          ],
          data: {
            type: "call",
            callerName,
            timestamp: Date.now(),
          },
        },
      );

      // Auto-close after 30 seconds
      setTimeout(() => {
        notification.close();
      }, 30000);

      return notification;
    }
    return null;
  }

  // Missed message summary (when user has been away)
  showMissedMessagesNotification(count: number, senders: string[]) {
    if (this.permission === "granted" && count > 0) {
      const senderText =
        senders.length === 1
          ? senders[0]
          : senders.length === 2
            ? `${senders[0]} and ${senders[1]}`
            : `${senders[0]} and ${senders.length - 1} others`;

      new Notification(`💬 ${count} new message${count > 1 ? "s" : ""}`, {
        body: `From ${senderText}`,
        icon: "/placeholder.svg",
        tag: "voiceconnect-missed-messages",
        requireInteraction: false,
        data: {
          type: "missed_messages",
          count,
          senders,
          timestamp: Date.now(),
        },
      });
    }
  }

  // Call notifications (existing)
  showCallEndedNotification(callerName: string, duration: number) {
    if (this.permission === "granted") {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const durationText =
        minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      new Notification(`📞 Call ended`, {
        body: `Call with ${callerName} lasted ${durationText}`,
        icon: "/placeholder.svg",
        tag: "voiceconnect-call-ended",
        data: {
          type: "call_ended",
          callerName,
          duration,
          timestamp: Date.now(),
        },
      });
    }
  }

  showMissedCallNotification(callerName: string) {
    if (this.permission === "granted") {
      new Notification(`📞 Missed call from ${callerName}`, {
        body: "You missed a call",
        icon: "/placeholder.svg",
        tag: "voiceconnect-missed-call",
        requireInteraction: true,
        data: {
          type: "missed_call",
          callerName,
          timestamp: Date.now(),
        },
      });
    }
  }

  // Clear specific notification types
  clearCallNotifications() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration
          .getNotifications({ tag: "voiceconnect-incoming-call" })
          .then((notifications) => {
            notifications.forEach((notification) => notification.close());
          });
      });
    }
  }

  clearChatNotifications() {
    // Clear all active chat notifications
    this.activeNotifications.forEach((notification, id) => {
      if (id.startsWith("chat-")) {
        notification.close();
        this.activeNotifications.delete(id);
      }
    });

    // Clear service worker notifications for chat
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => {
            if (notification.data?.type === "chat") {
              notification.close();
            }
          });
        });
      });
    }
  }

  clearAllNotifications() {
    // Clear all active notifications
    this.activeNotifications.forEach((notification) => {
      notification.close();
    });
    this.activeNotifications.clear();

    // Clear service worker notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => notification.close());
        });
      });
    }
  }

  // Get notification history/stats
  getNotificationStats() {
    return {
      permission: this.permission,
      activeCount: this.activeNotifications.size,
      isSupported: "Notification" in window,
    };
  }
}

export const notificationService = NotificationService.getInstance();
