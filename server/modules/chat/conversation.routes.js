import express from "express";
import * as chatController from "./chat.controller.js";

const router = express.Router();

router.get("/:userId", chatController.getConversations);

export default router;
