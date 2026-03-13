import express from "express" //allows use of express
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http"; // Import HTTP server
import { Server } from "socket.io"; // Import Socket.io Server
import userRoute from "./Routes/userRoute.js";
import chatRoute from "./Routes/chatRoutes.js";
import messageRoute from  "./Routes/messageRoute.js";
import userModel from "./Models/userModel.js";

// Tell dotenv where .env is
dotenv.config({ path: path.resolve('../../.env') });

const app = express();

//Create the HTTP Server using the express app
const httpServer = createServer(app);

let onlineUsers = [];

//Attach Socket.io to the HTTP Server
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }));

  
//allows use of json data
app.use(express.json());
app.use("/api/users", userRoute);
app.use("/api/chats", chatRoute);
app.use("/api/messages", messageRoute);


app.get("/", (req, res) => {
    res.send("Welcome");
});

const port = process.env.PORT || 5050;
const uri = process.env.DB_URI;

// Socket logic
io.on('connection', (socket) => {
    console.log("A user connected: ", socket.id);
    
    //Listen for user checking in
    socket.on("addNewUser", (userId) => {
        console.log("User added:", userId);
        if (!userId) {
            return;
        }

        const existing = onlineUsers.find(u => u.userId === userId);
        if (existing) {
            // Update socketId in case the user reconnected
            existing.socketId = socket.id;
            existing.status = "online";
        } else {
            onlineUsers.push({ userId, socketId: socket.id, status: "online" });
        }

        console.log("Online Users:", onlineUsers);

        // Send the updated list to EVERYONE connected
        io.emit("getOnlineUsers", onlineUsers);
    });

    socket.on("statusUpdate", ({ userId, status }) => {
        const user = onlineUsers.find(u => u.userId === userId);
        if (user) {
            user.status = status; // Update the status (online/idle)
            io.emit("getOnlineUsers", onlineUsers); // Broadcast to everyone
        }
    });

    socket.on("sendMessage", (message) => {
        // Find the recipient in the online list
        const recipient = onlineUsers.find((u) => String(u.userId) === String(message.recipientId));

        // If they are online, send the message to their specific socketId
        if (recipient) {
            console.log("Delivering message to socket:", recipient.socketId);
            io.to(recipient.socketId).emit("getMessage", message);
        }
        else {
            console.log("Recipient is offline, skipping socket emit.");
        }
    });

    //typing.. indicator
    socket.on("typing", ({ chatId, senderName, senderId, members, isTyping }) => {
        console.log("Typing event:", senderName, isTyping);
        members.forEach((memberId) => {
            console.log("Member from chat:", memberId);
            console.log("Online users:", onlineUsers.map(u => u.userId));

            if (String(memberId) !== String(senderId)) {
                const recipient = onlineUsers.find((u) => String(u.userId) === String(memberId));

                console.log("Found recipient:", recipient);

                if (recipient) {
                    console.log("Sending typing to:", recipient.userId);
                    io.to(recipient.socketId).emit("displayTyping", {
                        chatId,
                        senderName,
                        isTyping
                    });
                }
            }
        })
    });

    // Handle when a user closes the tab/disconnects
    socket.on("disconnect", async() => {
        const user = onlineUsers.find(u => u.socketId === socket.id);
        if (user) {
            // Update DB with the time they left
            await userModel.findByIdAndUpdate(user.userId, { lastSeen: new Date() });

            onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
            console.log("User disconnected. Remaining:", onlineUsers);
        
            // Send the updated list to everyone again
            io.emit("getOnlineUsers", onlineUsers);
        }
    });
});

//Listen using the httpServer, not app.listen
httpServer.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})

mongoose.connect(uri)
.then(() => {
    console.log("MongoDB connection established");

})
.catch((error)  => console.log("MongoDB connection failed: ", error.message))