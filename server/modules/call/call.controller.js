import Call from "./call.model.js";

// Get call history
export const getCallHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const calls = await Call.getUserCallHistory(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });

    res.json(calls);
  } catch (error) {
    console.error("Get call history error:", error);
    res.status(500).json({ error: "Failed to fetch call history" });
  }
};
