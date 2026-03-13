import express from "express";
import { createMessage, getMessages, messagesSeen } from "../Controllers/messageController.js";

const router = express.Router();

router.post("/", createMessage);
router.get("/:chatId", getMessages);
router.patch("/:chatId/seen", messagesSeen);

export default router;