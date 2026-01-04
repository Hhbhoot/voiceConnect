import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
    {
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Caller is required"],
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Recipient is required"],
        },
        status: {
            type: String,
            enum: [
                "initiated",
                "ringing",
                "answered",
                "ended",
                "missed",
                "rejected",
                "failed",
            ],
            default: "initiated",
        },
        type: {
            type: String,
            enum: ["voice", "video"],
            default: "voice",
        },
        // Call timing
        startedAt: {
            type: Date,
        },
        answeredAt: {
            type: Date,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number, // Duration in seconds
            default: 0,
        },
        // Call quality metrics
        quality: {
            rating: {
                type: Number,
                min: 1,
                max: 5,
            },
            issues: [String], // connection, audio, etc.
        },
        // WebRTC connection details
        connectionData: {
            iceGatheringTime: Number,
            connectionTime: Number,
            reconnectionAttempts: Number,
        },
        // Call metadata
        notes: {
            type: String,
            maxlength: 500,
        },
        tags: [String],
        isImportant: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// Indexes for efficient queries
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ createdAt: -1 });

// Virtual for call participants
callSchema.virtual("participants").get(function () {
    return [this.caller, this.recipient];
});

// Virtual for formatted duration
callSchema.virtual("formattedDuration").get(function () {
    if (!this.duration) return "0:00";

    const minutes = Math.floor(this.duration / 60);
    const seconds = this.duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Instance methods
callSchema.methods.toJSON = function () {
    const call = this;
    const callObject = call.toObject();

    // Convert _id to id for frontend compatibility
    callObject.id = callObject._id;
    delete callObject._id;

    // Convert populated user _ids to id as well
    if (callObject.caller && callObject.caller._id) {
        callObject.caller.id = callObject.caller._id;
        delete callObject.caller._id;
    }
    if (callObject.recipient && callObject.recipient._id) {
        callObject.recipient.id = callObject.recipient._id;
        delete callObject.recipient._id;
    }

    delete callObject.__v;
    return callObject;
};

callSchema.methods.markAsAnswered = async function () {
    this.status = "answered";
    this.answeredAt = new Date();
    await this.save();
};

callSchema.methods.markAsEnded = async function (duration = 0) {
    this.status = "ended";
    this.endedAt = new Date();
    this.duration = duration;

    // Calculate duration if not provided
    if (!duration && this.answeredAt) {
        this.duration = Math.floor((this.endedAt - this.answeredAt) / 1000);
    }

    await this.save();
};

callSchema.methods.markAsMissed = async function () {
    this.status = "missed";
    this.endedAt = new Date();
    await this.save();
};

callSchema.methods.markAsRejected = async function () {
    this.status = "rejected";
    this.endedAt = new Date();
    await this.save();
};

callSchema.methods.addQualityRating = async function (rating, issues = []) {
    this.quality = {
        rating,
        issues,
    };
    await this.save();
};

// Static methods
callSchema.statics.getUserCallHistory = function (userId, options = {}) {
    const { limit = 50, page = 1, status = null } = options;
    const skip = (page - 1) * limit;

    let query = {
        $or: [{ caller: userId }, { recipient: userId }],
    };

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .populate("caller", "username avatar")
        .populate("recipient", "username avatar")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

callSchema.statics.getCallStats = async function (userId, timeframe = "all") {
    let matchCondition = {
        $or: [{ caller: userId }, { recipient: userId }],
    };

    // Add time filtering
    if (timeframe !== "all") {
        const now = new Date();
        let startDate;

        switch (timeframe) {
            case "today":
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case "week":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "month":
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(0);
        }

        matchCondition.createdAt = { $gte: startDate };
    }

    const stats = await this.aggregate([
        { $match: matchCondition },
        {
            $group: {
                _id: null,
                totalCalls: { $sum: 1 },
                answeredCalls: {
                    $sum: { $cond: [{ $eq: ["$status", "answered"] }, 1, 0] },
                },
                missedCalls: {
                    $sum: { $cond: [{ $eq: ["$status", "missed"] }, 1, 0] },
                },
                rejectedCalls: {
                    $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
                },
                totalDuration: { $sum: "$duration" },
                averageDuration: { $avg: "$duration" },
            },
        },
    ]);

    return (
        stats[0] || {
            totalCalls: 0,
            answeredCalls: 0,
            missedCalls: 0,
            rejectedCalls: 0,
            totalDuration: 0,
            averageDuration: 0,
        }
    );
};

callSchema.statics.getRecentCalls = function (userId, limit = 10) {
    return this.find({
        $or: [{ caller: userId }, { recipient: userId }],
    })
        .populate("caller", "username avatar")
        .populate("recipient", "username avatar")
        .sort({ createdAt: -1 })
        .limit(limit);
};

const Call = mongoose.model("Call", callSchema);

export default Call;
