import messageModel from "../Models/messageModel.js";

//create message 
const createMessage = async(req, res) => {
    //get message info
    const { chatId, senderId, text } = req.body;

    //create a new message
    const message = new messageModel({
        chatId, senderId, text
    })

    try {
        const response = await message.save();

        res.status(200).json(response);

    } catch (error) {
        res.status(500).json(error);
    }
};
//get existing messages
const getMessages = async(req, res) => {
    const { chatId } = req.body; 

    try {
        //get all messages that are for the chatId
        const messages = await messageModel.find({chatId});

        res.status(200).json(messages);

    } catch (error) {
        res.status(500).json(error);
    }
};
export { createMessage, getMessages };