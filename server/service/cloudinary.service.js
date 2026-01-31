import fs from "fs/promises";
import cloudinary from "../config/cloudinary.js";

const uploadFile = async (file, resourceType) => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "voiceconnect",
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    throw error;
  } finally {
    // storage cleanup
    try {
      await fs.unlink(file.path);
    } catch (unlinkError) {
      console.error("Error deleting file:", unlinkError);
    }
  }
};

export const uploadImage = async (file) => {
  return uploadFile(file, "image");
};

export const uploadAudio = async (file) => {
  return uploadFile(file, "video"); // Cloudinary treats audio as video
};
