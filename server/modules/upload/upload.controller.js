export const uploadImageHandler = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

        res.json({
            success: true,
            imageUrl: fullUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
        });
    } catch (error) {
        console.error("Image upload error:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
};

export const uploadAudioHandler = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No audio file provided" });
        }

        const audioUrl = `/uploads/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get("host")}${audioUrl}`;

        res.json({
            success: true,
            audioUrl: fullUrl,
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            duration: 0, // Duration would need to be calculated separately
        });
    } catch (error) {
        console.error("Audio upload error:", error);
        res.status(500).json({ error: "Failed to upload audio" });
    }
};
