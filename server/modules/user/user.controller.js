import User from "./user.model.js";
import Call from "../call/call.model.js";

// Get users
export const getUsers = async (req, res) => {
    try {
        const users = await User.find(
            {},
            "username avatar isOnline lastSeen totalCalls totalMessages joinedAt",
        ).sort({ isOnline: -1, lastSeen: -1 });

        // Convert to public JSON format with id instead of _id
        const usersWithId = users.map((user) => user.toPublicJSON());
        res.json(usersWithId);
    } catch (error) {
        console.error("Get users error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
};

// Get user stats
export const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const { timeframe = "all" } = req.query;

        const [userStats, callStats] = await Promise.all([
            User.getUserStats(userId),
            Call.getCallStats(userId, timeframe),
        ]);

        res.json({
            user: userStats,
            calls: callStats,
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// Update user activity (helper)
export const updateUserActivity = async (userId, type) => {
    try {
        const user = await User.findById(userId);
        if (user) {
            await user.updateActivity(type);
        }
    } catch (error) {
        console.error("Error updating user activity:", error);
    }
};
