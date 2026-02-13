import express from "express";
import {registerUser, loginUser, findUser, getUser, searchUsers} from "../Controllers/userController.js";


const router = express.Router();

router.get("/search", searchUsers);
router.get("/find/:userId", findUser);
//registration route. 
//instead of creating a function we use the functiond from userController
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", getUser);

export default router;