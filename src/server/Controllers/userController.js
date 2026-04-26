import userModel from "../Models/userModel.js";
import bcrypt from "bcrypt";
import validator from "validator";
import jwt from "jsonwebtoken";

//determine allowed emial domains
const allowedDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com', 'zohomail.com', 'live.com', 'msn.com'];

//assigns a token in order to identify user once signed in (valid for 2 days)
const createToken = (_id) => {
    const jwtkey = process.env.JWT_KEY;

    return jwt.sign({_id}, jwtkey, { expiresIn: "2d"});
};

//for user Searching
export const searchUsers = async (req, res) => {
    //saving search
    const query = req.query.query?.trim();

    //if the query brings no result show empty
    if (!query) return res.status(200).json([]);

    try {
        //MongoDB search logic
        const users = await userModel.find({
            //match based on name or email
            $or: [
                { name: { $regex: query, $options: "i" } },
                { email: { $regex: query, $options: "i" } }
            ]
        }).select("_id name email");

        res.status(200).json(users);

    } catch (error) {
        res.status(500).json({ message: error.message});
    }
};
//registration and validation
const registerUser = async(req, res) => {
    try {
        const {name, email, password} = req.body;

        //email is unique so check for it
        let user = await userModel.findOne({ email });

        //if the user already exists, tell the user
        if (user) {
            //400 means there has been an issue
            return res.status(400).json({message: "This email is already registered"});
        }
        if (!name || !email || !password) {
            return res.status(400).json({message: "All fields are required"});
        } 
        //if the email isn't valid
        if (!validator.isEmail(email)) {
            return res.status(400).json({message: "Invalid email entered"});
        }  
        //check for valid domain
        const emailDomain = email.split("@")[1].toLowerCase();

        if (!allowedDomains.includes(emailDomain)) {
            return res.status(400).json({
                message: "Email provider not supported"
            });
        }

        //if the password isn't strong
        if (!validator.isStrongPassword(password)) {
            return res.status(400).json({message: "Password is weak."});
        }

        //define what a user has
        user = new userModel({name, email, password});

        //A salt is a random string that gets added to the password before hashing
        //increases security
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);

        //save user to database
        await user.save();

        const token = createToken(user._id);

        //once the user is successfully registered, send them their info
        //200 is success message
        res.status(200).json({_id: user._id, name, email, token, publicKey: user.publicKey, encryptedPrivateKey: user.encryptedPrivateKey});
    } catch (error) {
        //500 is server error
        res.status(500).json({ message: error.message || "Server error" });
    }
};

//system for logging in the users
const loginUser = async(req, res) => {
    const {email, password} = req.body;

    try {
        let user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password"});
        }
        
        //check if password is correct
        //comparing the entered password with the saved password for the user
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(400).json({message: "Invalid email or password"})
        }

        const token = createToken(user._id);
        res.status(200).json({_id: user._id, name: user.name, email, token, publicKey: user.publicKey, encryptedPrivateKey: user.encryptedPrivateKey});
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};

const findUser = async(req, res) => {
    const userId = req.params.userId;
    try {
        const user = await userModel.findById(userId);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};

const getUser = async(req, res) => {
    try {
        const users = await userModel.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message || "Server error" });
    }
};

// encryption
const setupE2EE = async (req, res) => {
    const { userId, publicKey, encryptedPrivateKey } = req.body;

    try {
        const user = await userModel.findByIdAndUpdate(
            userId,
            { publicKey, encryptedPrivateKey },
            { new: true }
        );
        res.status(200).json({ success: true, message: "E2EE Initialized" });
    } catch (error) {
        res.status(500).json(error);
    }
};

export { registerUser, loginUser, findUser, getUser, setupE2EE };