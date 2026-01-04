import Message from "./message.model.js";
import User from "../user/user.model.js";

export default (io, socket) => {
    // Join chat
    socket.on("join-chat", async (data) => {
        try {
            const { userId, chatPartnerId } = data;
            const roomId = [userId, chatPartnerId].sort().join("-");
            socket.join(roomId);
            console.log(`💬 User ${socket.username} joined chat room: ${roomId}`);

            // Mark messages as delivered
            await Message.updateMany(
                {
                    sender: chatPartnerId,
                    recipient: userId,
                    status: "sent",
                },
                {
                    $set: {
                        status: "delivered",
                        deliveredAt: new Date(),
                    },
                },
            );

            // Send existing messages for this chat
            const existingMessages = await Message.getConversation(
                userId,
                chatPartnerId,
                { limit: 50 },
            );
            socket.emit("chat-history", existingMessages.reverse());
        } catch (error) {
            console.error("Join chat error:", error);
        }
    });

    // Send message
    socket.on("send-message", async (data) => {
        try {
            const { recipientId, message } = data;

            // Prepare message data
            const messageData = {
                sender: socket.userId,
                recipient: recipientId,
                content: message.content,
                type: message.type || "text",
            };

            // Handle image messages
            if (message.type === "image" && message.imageUrl) {
                messageData.attachment = {
                    url: message.imageUrl,
                    caption: message.caption,
                    filename: message.imageUrl.split("/").pop(),
                    mimeType: "image/jpeg", // Default, could be determined from URL
                    originalName: "shared_image.jpg",
                };
            }

            // Handle voice messages
            if (message.type === "voice" && message.audioUrl) {
                messageData.attachment = {
                    url: message.audioUrl,
                    duration: message.duration,
                    filename: message.audioUrl.split("/").pop(),
                    mimeType: "audio/webm", // Default, could be determined from URL
                    originalName: "voice_message.webm",
                };
            }

            // Save message to database
            const newMessage = new Message(messageData);
            await newMessage.save();

            // Populate sender info
            await newMessage.populate("sender", "username avatar isOnline");
            await newMessage.populate("recipient", "username avatar isOnline");

            // Update user message count
            const user = await User.findById(socket.userId);
            if (user) {
                await user.updateActivity("message");
            }

            const roomId = [socket.userId, recipientId].sort().join("-");

            console.log(
                `💬 ${message.type === "image" ? "Image" : "Message"} from ${socket.username} to ${newMessage.recipient.username}: ${message.content}`,
            );

            // Send to all users in the chat room
            const messageResponse = {
                id: newMessage.id || newMessage._id,
                senderId: newMessage.sender.id || newMessage.sender._id,
                senderName: newMessage.sender.username,
                content: newMessage.content,
                timestamp: newMessage.createdAt.toISOString(),
                type: newMessage.type,
                imageUrl: message.imageUrl,
                caption: message.caption,
                audioUrl: message.audioUrl,
                duration: message.duration,
            };

            io.to(roomId).emit("message", messageResponse);
        } catch (error) {
            console.error("Send message error:", error);
        }
    });

    // Typing indicators
    socket.on("typing", (data) => {
        const { recipientId, userId, userName } = data;
        const roomId = [userId, recipientId].sort().join("-");
        socket.to(roomId).emit("typing", { userId, userName });
    });

    socket.on("stop-typing", (data) => {
        const { recipientId, userId } = data;
        const roomId = [userId, recipientId].sort().join("-");
        socket.to(roomId).emit("stop-typing", { userId });
    });

    // Mark messages as read
    socket.on("mark-messages-read", async (data) => {
        try {
            const { senderId, recipientId } = data;

            console.log(`📖 Marking messages as read: ${senderId} -> ${recipientId}`);

            // Mark messages as read in database
            await Message.updateMany(
                {
                    sender: senderId,
                    recipient: recipientId,
                    status: { $ne: "read" },
                },
                {
                    $set: {
                        status: "read",
                        readAt: new Date(),
                    },
                },
            );

            console.log(
                `📖 Messages marked as read for conversation: ${senderId} <-> ${recipientId}`,
            );
        } catch (error) {
            console.error("Mark messages as read error:", error);
        }
    });
};
