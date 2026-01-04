import express from "express";
import * as callController from "./call.controller.js";

const router = express.Router();

router.get("/:userId", callController.getCallHistory);

export default router;
