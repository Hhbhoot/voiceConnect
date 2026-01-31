import express from "express";
import * as uploadController from "./upload.controller.js";
import { uploadImage, uploadAudio } from "./upload.middleware.js";
import { verifyToken } from "../../middleware/auth.js";

const router = express.Router();

router.post(
  "/image",
  verifyToken,
  uploadImage.single("image"),
  uploadController.uploadImageHandler,
);
router.post(
  "/audio",
  verifyToken,
  uploadAudio.single("audio"),
  uploadController.uploadAudioHandler,
);

export default router;
