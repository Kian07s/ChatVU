import express from "express";
import { createMessage, getMessages, messagesSeen, getUnreadMessages } from "../Controllers/messageController.js";

const router = express.Router();

router.post("/", createMessage);
router.get("/unread/:userId", getUnreadMessages);
router.get("/:chatId", getMessages);
router.patch("/:chatId/seen", messagesSeen);


export default router;