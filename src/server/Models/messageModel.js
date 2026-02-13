import mongoose from "mongoose";

//specify message information
const messageSchema = new mongoose.Schema({
    chatId: String,
    senderId: String,
    text: String
},
{
    timestamps: true
});

const messageModel = mongoose.model("Messages", messageSchema);

export default messageModel;