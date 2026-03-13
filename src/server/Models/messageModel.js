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
        required: true
    },
    seenBy: {
        type: [String], //array of users Ids who have seen message
        default: []
    }
}, {
    timestamps: true
});

const messageModel = mongoose.model("Messages", messageSchema);

export default messageModel;