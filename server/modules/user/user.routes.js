import express from "express";
import * as userController from "./user.controller.js";

const router = express.Router();

router.get("/", userController.getUsers);
router.get("/stats/:userId", userController.getUserStats);

export default router;
