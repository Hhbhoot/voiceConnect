import { uploadImage, uploadAudio } from "../../service/cloudinary.service.js";
export const uploadImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const result = await uploadImage(req.file);

    res.json({
      success: true,
      imageUrl: result.secure_url,
      filename: result.original_filename,
      originalName: result.original_filename,
      size: result.bytes,
      publicId: result.public_id,
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

    const result = await uploadAudio(req.file);

    res.json({
      success: true,
      audioUrl: result.secure_url,
      filename: result.original_filename,
      originalName: result.original_filename,
      size: result.bytes,
      duration: result.duration || 0, // Cloudinary often provides duration for video/audio
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({ error: "Failed to upload audio" });
  }
};
