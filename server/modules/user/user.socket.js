import User from "./user.model.js";
import { activeUsers } from "../shared/state.js";

export default (io, socket) => {
    // User joins
    socket.on("join", async (userData) => {
        try {
            socket.userId = userData.id;
            socket.username = userData.username;

            // Update user in database
            const user = await User.findById(userData.id);
            if (user) {
                await user.setOnline(socket.id);
                activeUsers.set(userData.id, socket.id);

                console.log(`📝 User joined: ${userData.username}`);

                // Notify all clients about user status
                socket.broadcast.emit("user-online", user.toPublicJSON());
            }
        } catch (error) {
            console.error("Join error:", error);
        }
    });

    // User disconnect
    socket.on("disconnect", async () => {
        try {
            if (socket.userId) {
                const user = await User.findById(socket.userId);
                if (user) {
                    await user.setOffline();
                    activeUsers.delete(socket.userId);

                    socket.broadcast.emit("user-offline", { id: socket.userId });
                    console.log(`👋 User disconnected: ${user.username}`);
                }
            }
        } catch (error) {
            console.error("Disconnect error:", error);
        }
    });
};
