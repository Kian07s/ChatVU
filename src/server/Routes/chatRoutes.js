import express from 'express';
import { createChat, findChat, getUserChats, removeGroupMember, leaveGroup, changeGroupName, addMembers, archiveChat, pinChat} from '../Controllers/chatController.js';


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
//change group name
router.put("/:chatId/changeName", changeGroupName)
//add members to group
router.put("/:chatId/add", addMembers)
//archiving chats (patch is used to apply partial changes to an existing resource)
router.patch("/:chatId/archive", archiveChat)
//pin chats
router.patch("/:chatId/pin", pinChat)


export default router;