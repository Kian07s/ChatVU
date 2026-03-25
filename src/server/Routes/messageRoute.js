import express from "express";
import upload from "../Middleware/upload.js";
import { createMessage, getMessages, messagesSeen, getUnreadMessages } from "../Controllers/messageController.js";

const router = express.Router();

const messageRoutes = (io) => {
    // Middleware to inject io into the request object
    const injectIo = (io) => (req, res, next) => {
        req.io = io;
        next();
    };
    router.post("/", upload.single("file"), createMessage);
    router.get("/unread/:userId", getUnreadMessages);
    router.get("/:chatId", getMessages);
    router.patch("/:chatId/seen", injectIo(io), messagesSeen);

    return router;
};


export default messageRoutes;