import express from 'express';
import { createChat, findChat, getUserChats, removeGroupMember, leaveGroup } from '../Controllers/chatController.js';


const router = express.Router();

//create new chat
router.post("/", createChat);
//retrieve all chats
router.get("/user/:userId", getUserChats);
//retrieve certain chat
router.get("/find/:userId", findChat); 
//remove group member
router.put("/:chatId/remove", removeGroupMember);
//leaveGroup
router.put("/:chatId/leave", leaveGroup);


export default router;