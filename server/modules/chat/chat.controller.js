import Message from "./message.model.js";

// Get chat messages
export const getMessages = async (req, res) => {
    try {
        const { userId, partnerId } = req.params;
        const { page = 1, limit = 50, before } = req.query;

        const messages = await Message.getConversation(userId, partnerId, {
            page: parseInt(page),
            limit: parseInt(limit),
            before: before ? new Date(before) : null,
        });

        // Reverse to get chronological order
        res.json(messages.reverse());
    } catch (error) {
        console.error("Get chat messages error:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
};

// Get recent conversations
export const getConversations = async (req, res) => {
    try {
        const { userId } = req.params;
        const conversations = await Message.getRecentConversations(userId);
        res.json(conversations);
    } catch (error) {
        console.error("Get conversations error:", error);
        res.status(500).json({ error: "Failed to fetch conversations" });
    }
};
