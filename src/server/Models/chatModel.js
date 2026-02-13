import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
    {
        members: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }],
        isGroupChat: {
            type: Boolean,
            default: false
        },
        groupName: {
            type: String,
            default: ""
        },
        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true,
    }
);

const chatModel = mongoose.model("Chat", chatSchema);

export default chatModel;