import mongoose from "mongoose";

//specify message information
const messageSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: false,
        default: ""
    },
    fileUrl: {
        type: String,
    },
    seenBy: {
        type: [String], //array of users Ids who have seen message
        default: []
    },
    type: {
        type: String,
        default: "user" //user or system for change in group chats announcments
    }
}, {
    timestamps: true
});

const messageModel = mongoose.model("Messages", messageSchema);

export default messageModel;