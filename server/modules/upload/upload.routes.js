import express from "express";
import * as uploadController from "./upload.controller.js";
import { uploadImage, uploadAudio } from "./upload.middleware.js";

const router = express.Router();

router.post("/image", uploadImage.single("image"), uploadController.uploadImageHandler);
router.post("/audio", uploadAudio.single("audio"), uploadController.uploadAudioHandler);

export default router;
