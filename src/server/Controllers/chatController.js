// 3 API endpoints: create chat, get chats, find a certain chat
import { Admin } from "mongodb";
import chatModel from "../Models/chatModel.js";
import messageModel from "../Models/messageModel.js";
import userModel from "../Models/userModel.js";

//create a chat 
const createChat = async(req, res) => {
    const {members, isGroupChat, groupName} = req.body;

    //check for valid chat
    if (!members || members.length < 2) {
        return res.status(400).json({ message: "At least two people are required" });
    }

    if (isGroupChat && !groupName) {
        return res.status(400).json({
          message: "Group name is required"
        });
    }

    try {
        //if 2 members, it's a one on one chat
        if (!isGroupChat && members.length === 2) {
            const existingChat = await chatModel.findOne({
              isGroupChat: false,
              members: { $all: members, $size: 2 }
            });
            //prevent duplication of existing one on one chats
            if (existingChat) {
              return res.status(200).json(existingChat);
            }
        }

        //create the new chat
        const newChat = await chatModel.create({
            members,
            isGroupChat: isGroupChat || false,
            groupName: isGroupChat ? groupName : "",
            groupAdmin: isGroupChat ? members[0] : null,
          });

          // Populate members before sending
        const populatedChat = await chatModel.findById(newChat._id).populate("members", "name email");

        // Announcement for Group Creation
        if (isGroupChat) {
            const adminUser = populatedChat.members.find(m => m._id.toString() === members[0]);
            await createSystemMessage(newChat._id, `${adminUser?.name || "Someone"} created the group "${groupName}"`);
        }

        //201 is when a new thing has been created
        res.status(201).json(populatedChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//notify people of group changes
const createSystemMessage = async (chatId, text) => {
    try {
        await messageModel.create({
            chatId,
            text,
            type: "system",
            senderId: "system"
        });
    } catch (error) {
        console.log("System Message Error:", error);
    }
}

//get users chats
const getUserChats = async(req, res) => {
    //find chats of logged in user
    const userId = req.params.userId;

    try {
        //find userId and bring any chats that have that id
        const chats = await chatModel.find({
            members: {$in: [userId]}
        }).populate("members", "name email").sort({ updatedAt: -1 });

        res.status(200).json(chats);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//find a certain chat
const findChat = async(req, res) => {
    //find chats of logged in user given the search query
    const {userId} = req.params;
    const query = req.query.query?.trim();
    

    try {
        const chats = await chatModel.find({
            members: userId,
            ...(query && {
                $or: [
                    { groupName: { $regex: query, $options: "i" } }
                ]
            })
        }).populate("members", "name email");

        //searching
        const filteredChats = chats.filter(chat => {
            if (chat.isGroupChat) {
                return chat.groupName?.toLowerCase().includes(query.toLowerCase());
            }
            //DMs
            const otherUser = chat.members.find(
                member => member._id.toString() !== userId
            );
            return otherUser?.name?.toLowerCase().includes(query.toLowerCase());
        });


        res.status(200).json(filteredChats);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
//admin removes group member
const removeGroupMember = async (req, res) => {
    const { chatId } = req.params;
    const { memberId, requesterId } = req.body;

    try {
        const chat = await chatModel.findById(chatId).populate("members", "name");

        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: "Group chat not found" });
        }

        const memberToRemove = chat.members.find(m => m._id.toString() === memberId);
        const adminUser = chat.members.find(m => m._id.toString() === requesterId);

        chat.members = chat.members.filter(m => m._id.toString() !== memberId);

        //if after removing only 2 members are left in the group, make it a dm
        if (chat.members.length === 2) {
            const [userA, userB] = chat.members;

            const existingChat = await chatModel.findOne({
                isGroupChat: false,
                members: { $all: [userA.toString(), userB.toString()], $size: 2 }
            });

            await chat.deleteOne();

            //prevent duplication, if dm exists, delete group
            if (existingChat) {
                const existingChatPopulated = await chatModel.findById(existingChat._id).populate("members", "name email");
                return res.status(200).json({
                    replacedBy: "dm",
                    chat: existingChatPopulated
                });
            }
                
            //if dm doesn't exist delete group chat and create one
            const dm = await chatModel.create({
                members: [userA, userB],
                isGroupChat: false
            });

            const dmPopulated = await chatModel.findById(dm._id).populate("members", "name email");

            return res.status(201).json({
                replacedBy: "dm",
                chat: dmPopulated
            });
        }

        if (chat.members.length <= 1) {
            await chat.deleteOne();
            return res.status(200).json({ message: "Group deleted" });
        }

        await chat.save();

        // Create announcement
        await createSystemMessage(chatId, `${memberToRemove?.name || "A user"} was removed by ${adminUser?.name || "Admin"}`);

        const updatedChat = await chatModel.findById(chatId).populate("members", "name email");
        res.status(200).json(updatedChat);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//leaviing group
const leaveGroup = async(req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;

    try {
        const chat = await chatModel.findById(chatId).populate("members", "name");

        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: "Group chat not found" });
        }

        const leavingUser = chat.members.find(m => m._id.toString() === userId);

        //remove leaving user
        chat.members = chat.members.filter(member => member._id.toString() !== userId);
        
        // If leaving user is admin and others remain, force new admin
        if (chat.groupAdmin.toString() === userId && chat.members.length > 0) {
            chat.groupAdmin = chat.members[0]; 
        }

        if (chat.members.length <= 1) {
            await chat.deleteOne();
            return res.status(200).json({ message: "Group deleted" });
        }

        await chat.save();

        await createSystemMessage(chatId, `${leavingUser?.name || "A user"} left the group`);

        const updatedChat = await chatModel.findById(chatId).populate("members", "name email");
        res.status(200).json(updatedChat);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

//changing group name
const changeGroupName = async(req, res) => {
    const { chatId } = req.params;
    const { newGroupName, requesterId } = req.body;
    
    try {
        const adminUser = await userModel.findById(requesterId);
        const updatedChat = await chatModel.findByIdAndUpdate(
            chatId,
            { groupName: newGroupName },
            { new: true }
        ).populate("members", "name email");

        if (!updatedChat) {
            return res.status(404).json("Chat not found");
        }

        await createSystemMessage(chatId, `${adminUser?.name || "Admin"} renamed the group to "${newGroupName}"`);

        res.status(200).json(updatedChat);
        
    } catch (error) {
        res.status(500).json(error);
    }
}

//adding members to existing groyp
const addMembers = async(req, res) => {
    const { chatId } = req.params;
    const { memberIds, requesterId } = req.body;

    try {
        const chat = await chatModel.findById(chatId);
        const adminUser = await userModel.findById(requesterId);
        const addedUsers = await userModel.find({ _id: { $in: memberIds } });

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        if (chat.groupAdmin.toString() !== requesterId) {
            return res.status(403).json({ message: "Only admin can add members" });
        }

        const existingIds = chat.members.map(id => id.toString());
        const newMembers = memberIds.filter(id => !existingIds.includes(id));
    
        chat.members.push(...newMembers);
        await chat.save();

        const names = addedUsers.map(u => u.name).join(", ");
        await createSystemMessage(chatId, `${adminUser?.name} added ${names} to the group`);
    
        const updatedChat = await chatModel.findById(chatId).populate("members", "name email");
    
        res.status(200).json(updatedChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

//archive chat
const archiveChat = async(req, res) => {
    const { chatId } = req.params;
    const {requesterId} = req.body;

    if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
    }

    try {
        const chat = await chatModel.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        let currentArchived = Array.isArray(chat.archivedBy) 
            ? chat.archivedBy.filter(id => id && id.toString) 
            : [];

        const alreadyArchived = currentArchived.some(id => id?.toString() === requesterId?.toString());
        
        if (alreadyArchived) {
            chat.archivedBy = currentArchived.filter(id => id.toString() !== requesterId?.toString());
        } else {
            chat.archivedBy.push(requesterId);
        }

        await chat.save({ timestamps: false });

        const populatedChat = await chatModel.findById(chatId).populate("members", "name email");
        res.status(200).json(populatedChat);
    } catch (error) {
        console.error("Archive Crash:", error);
        // ensures that even if it crashes, it sends JSON, not HTML
        res.status(500).json({ error: true, message: error.message });
    }  
};

//pin chat (same as archive)
const pinChat = async(req, res) => {
    const { chatId } = req.params;
    const {requesterId} = req.body;

    if (!requesterId) {
        return res.status(400).json({ message: "Requester ID is required" });
    }

    try {
        const chat = await chatModel.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        let currentPinned = Array.isArray(chat.pinnedBy) 
            ? chat.pinnedBy.filter(id => id && id.toString) 
            : [];

        const alreadyPinned = currentPinned.some(id => id?.toString() === requesterId?.toString());
        
        if (alreadyPinned) {
            chat.pinnedBy = currentPinned.filter(id => id.toString() !== requesterId?.toString());
        } else {
            chat.pinnedBy = [...currentPinned, requesterId];
        }

        await chat.save({ timestamps: false });

        const populatedChat = await chatModel.findById(chatId).populate("members", "name email");
        res.status(200).json(populatedChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }  
};



export {createChat, findChat, getUserChats, removeGroupMember, leaveGroup, changeGroupName, addMembers, archiveChat, pinChat};