import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sender is required"],
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient is required"],
        },
        content: {
            type: String,
            required: [true, "Message content is required"],
            trim: true,
            maxlength: [1000, "Message cannot exceed 1000 characters"],
        },
        type: {
            type: String,
            enum: ["text", "image", "file", "voice", "system"],
            default: "text",
        },
        // For file attachments
        attachment: {
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            url: String,
        },
        // Message status
        status: {
            type: String,
            enum: ["sent", "delivered", "read"],
            default: "sent",
        },
        readAt: {
            type: Date,
        },
        deliveredAt: {
            type: Date,
            default: Date.now,
        },
        // For system messages (user joined, left, etc.)
        systemData: {
            type: Object,
        },
        // Message metadata
        editedAt: {
            type: Date,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

// Indexes for efficient queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ status: 1 });

// Virtual for conversation participants
messageSchema.virtual("participants").get(function () {
    return [this.sender, this.recipient].sort();
});

// Instance methods
messageSchema.methods.toJSON = function () {
    const message = this;
    const messageObject = message.toObject();

    // Convert _id to id for frontend compatibility
    messageObject.id = messageObject._id;
    delete messageObject._id;

    // Convert populated user _ids to id as well
    if (messageObject.sender && messageObject.sender._id) {
        messageObject.sender.id = messageObject.sender._id;
        delete messageObject.sender._id;
    }
    if (messageObject.recipient && messageObject.recipient._id) {
        messageObject.recipient.id = messageObject.recipient._id;
        delete messageObject.recipient._id;
    }

    delete messageObject.__v;
    return messageObject;
};

messageSchema.methods.markAsRead = async function () {
    if (this.status !== "read") {
        this.status = "read";
        this.readAt = new Date();
        await this.save();
    }
};

messageSchema.methods.markAsDelivered = async function () {
    if (this.status === "sent") {
        this.status = "delivered";
        this.deliveredAt = new Date();
        await this.save();
    }
};

messageSchema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    await this.save();
};

// Static methods
messageSchema.statics.getConversation = function (
    userId1,
    userId2,
    options = {},
) {
    const { limit = 50, page = 1, before = null } = options;
    const skip = (page - 1) * limit;

    let query = {
        $or: [
            { sender: userId1, recipient: userId2 },
            { sender: userId2, recipient: userId1 },
        ],
        isDeleted: false,
    };

    if (before) {
        query.createdAt = { $lt: before };
    }

    return this.find(query)
        .populate("sender", "username avatar isOnline")
        .populate("recipient", "username avatar isOnline")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

messageSchema.statics.getRecentConversations = async function (
    userId,
    limit = 20,
) {
    const conversations = await this.aggregate([
        {
            $match: {
                $or: [
                    { sender: new mongoose.Types.ObjectId(userId) },
                    { recipient: new mongoose.Types.ObjectId(userId) },
                ],
                isDeleted: false,
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
                        "$recipient",
                        "$sender",
                    ],
                },
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$recipient", new mongoose.Types.ObjectId(userId)] },
                                    { $ne: ["$status", "read"] },
                                ],
                            },
                            1,
                            0,
                        ],
                    },
                },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        {
            $unwind: "$user",
        },
        {
            $sort: { "lastMessage.createdAt": -1 },
        },
        {
            $limit: limit,
        },
    ]);

    return conversations;
};

messageSchema.statics.markConversationAsRead = async function (
    userId,
    partnerId,
) {
    await this.updateMany(
        {
            sender: partnerId,
            recipient: userId,
            status: { $ne: "read" },
        },
        {
            $set: {
                status: "read",
                readAt: new Date(),
            },
        },
    );
};

messageSchema.statics.getUnreadCount = async function (userId) {
    return this.countDocuments({
        recipient: userId,
        status: { $ne: "read" },
        isDeleted: false,
    });
};

const Message = mongoose.model("Message", messageSchema);

export default Message;
