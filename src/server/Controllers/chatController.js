// 3 API endpoints: create chat, get chats, find a certain chat
import chatModel from "../Models/chatModel.js";

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
          //201 is when a new thing has been created
          res.status(201).json(populatedChat);
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//get users chats
const getUserChats = async(req, res) => {
    //find chats of logged in user
    const userId = req.params.userId;

    try {
        //find userId and bring any chats that have that id
        const chats = await chatModel.find({
            members: {$in: [userId]}
        }).populate("members", "name email");

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
        const chat = await chatModel.findById(chatId);

        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: "Group chat not found" });
        }

        chat.members = chat.members.filter(
            id => id.toString() !== memberId
        );

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
        }

        await chat.save();

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
        const chat = await chatModel.findById(chatId);

        if (!chat || !chat.isGroupChat) {
            return res.status(404).json({ message: "Group chat not found" });
        }

        //remove leaving user
        chat.members = chat.members.filter(id => id.toString() !== userId);

        // If leaving user is admin and others remain, force new admin
        if (chat.groupAdmin.toString() === userId && chat.members.length > 0) {
            chat.groupAdmin = chat.members[0]; 
        }

        if (chat.members.length <= 1) {
            await chat.deleteOne();
            return res.status(200).json({ message: "Group deleted" });
        }

        await chat.save();
        const updatedChat = await chatModel.findById(chatId).populate("members", "name email");
        res.status(200).json(updatedChat);

    } catch (error) {
        es.status(500).json({ message: error.message });
    }


}

export {createChat, findChat, getUserChats, removeGroupMember, leaveGroup};