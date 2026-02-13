import express from "express" //allows use of express
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import userRoute from "./Routes/userRoute.js";
import chatRoute from "./Routes/chatRoutes.js";
import messageRoute from  "./Routes/messageRoute.js";

// Tell dotenv where .env is
dotenv.config({ path: path.resolve('../../.env') });

const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

//req: receiving data, res: sending data
app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
})

mongoose.connect(uri)
.then(() => {
    console.log("MongoDB connection established");

})
.catch((error)  => console.log("MongoDB connection failed: ", error.message))