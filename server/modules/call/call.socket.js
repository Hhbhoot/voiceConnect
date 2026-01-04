import Call from "./call.model.js";
import User from "../user/user.model.js";
import { activeUsers } from "../shared/state.js";

export default (io, socket) => {
    // Voice call functionality
    socket.on("call-user", async (data) => {
        try {
            const { targetUserId, offer, isVideoCall = false } = data;

            // Create call record
            const call = new Call({
                caller: socket.userId,
                recipient: targetUserId,
                status: "initiated",
                type: isVideoCall ? "video" : "voice",
                startedAt: new Date(),
            });
            await call.save();

            const targetSocketId = activeUsers.get(targetUserId); // Use shared map
            const caller = await User.findById(socket.userId);

            if (targetSocketId && caller) {
                console.log(
                    `📞 Call initiated: ${caller.username} → ${(await User.findById(targetUserId)).username}`,
                );

                io.to(targetSocketId).emit("incoming-call", {
                    from: caller.toPublicJSON(),
                    offer,
                    callId: call._id,
                    isVideoCall,
                });

                // Update call status
                call.status = "ringing";
                await call.save();
            }
        } catch (error) {
            console.error("Call user error:", error);
        }
    });

    socket.on("answer-call", async (data) => {
        try {
            const { targetUserId, answer, isVideoCall = false } = data;
            const targetSocketId = activeUsers.get(targetUserId);

            if (targetSocketId) {
                console.log(`✅ Call answered`);
                io.to(targetSocketId).emit("call-answered", { answer });

                // Find and update call record
                const call = await Call.findOne({
                    $or: [
                        { caller: socket.userId, recipient: targetUserId },
                        { caller: targetUserId, recipient: socket.userId },
                    ],
                    status: "ringing",
                }).sort({ createdAt: -1 });

                if (call) {
                    await call.markAsAnswered();
                }
            }
        } catch (error) {
            console.error("Answer call error:", error);
        }
    });

    socket.on("end-call", async (data) => {
        try {
            const { targetUserId, duration } = data;
            const targetSocketId = activeUsers.get(targetUserId);

            if (targetSocketId) {
                io.to(targetSocketId).emit("call-ended");
            }

            console.log(`📴 Call ended: ${duration}s`);

            // Update call record
            const call = await Call.findOne({
                $or: [
                    { caller: socket.userId, recipient: targetUserId },
                    { caller: targetUserId, recipient: socket.userId },
                ],
                status: { $in: ["ringing", "answered"] },
            }).sort({ createdAt: -1 });

            if (call) {
                await call.markAsEnded(duration);

                // Update user call count
                const [caller, recipient] = await Promise.all([
                    User.findById(call.caller),
                    User.findById(call.recipient),
                ]);

                if (caller) await caller.updateActivity("call");
                if (recipient) await recipient.updateActivity("call");
            }
        } catch (error) {
            console.error("End call error:", error);
        }
    });

    socket.on("reject-call", async (data) => {
        try {
            const { targetUserId } = data;
            const targetSocketId = activeUsers.get(targetUserId);

            if (targetSocketId) {
                console.log(`❌ Call rejected`);
                io.to(targetSocketId).emit("call-rejected");
            }

            // Update call record
            const call = await Call.findOne({
                caller: targetUserId,
                recipient: socket.userId,
                status: "ringing",
            }).sort({ createdAt: -1 });

            if (call) {
                await call.markAsRejected();
            }
        } catch (error) {
            console.error("Reject call error:", error);
        }
    });

    // ICE candidate exchange
    socket.on("ice-candidate", (data) => {
        const { targetUserId, candidate } = data;
        const targetSocketId = activeUsers.get(targetUserId);

        if (targetSocketId) {
            io.to(targetSocketId).emit("ice-candidate", { candidate });
        }
    });
};
