import express from "express";
import {registerUser, loginUser, findUser, getUser, searchUsers, setupE2EE} from "../Controllers/userController.js";


const router = express.Router();

//instead of creating a function we use the functiond from userController
router.get("/search", searchUsers);
router.get("/find/:userId", findUser);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/", getUser);
router.patch("/setup-e2ee", setupE2EE);

export default router;