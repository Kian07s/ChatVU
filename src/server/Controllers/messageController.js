import messageModel from "../Models/messageModel.js";
import chatModel from "../Models/chatModel.js";

//create message 
const createMessage = async(req, res) => {
    //get message info
    const { chatId, senderId, text } = req.body;

    //create a new message
    const message = new messageModel({chatId, senderId, text});

    try {
        const response = await message.save();

        //Update the Chat's "updatedAt" to bring it to the top
        await chatModel.findByIdAndUpdate(chatId, { lastMessage: response }, { new: true });

        res.status(200).json(response);

    } catch (error) {
        res.status(500).json(error);
    }
};
//get existing messages
const getMessages = async(req, res) => {
    const { chatId } = req.params; 

    try {
        //get all messages that are for the chatId
        const messages = await messageModel.find({chatId});

        res.status(200).json(messages);

    } catch (error) {
        res.status(500).json(error);
    }
};

const messagesSeen = async(req, res) => {
    console.log("messagesSeen route hit");
    const { userId } = req.body;
    const { chatId } = req.params;

    try {
        const updatedMessages = await messageModel.updateMany(
            { chatId, senderId: { $ne: userId }, seenBy: { $ne: userId }, },
            { $push: { seenBy: userId } }
        );

        await chatModel.findByIdAndUpdate(chatId, {
            "lastMessage.seenBy": userId
        });

        res.json({ success: true, updatedCount: updatedMessages.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export { createMessage, getMessages, messagesSeen };