import mongoose from "mongoose";

//user conformation info. Not needed in actual site
const userSchema = new mongoose.Schema({
    name: {type: String, required: true, minlength: 3, maxlength: 30},
    email: {type: String, required: true, minlength: 3, maxlength: 50, unique: true},
    password: {type: String, required: true, minlength: 8, maxlength: 1024},

}, 
{
    timestamps: true,
});

//first parameter is like a table, a collection of users
//this will allow the userModel to interact with the database
const userModel = mongoose.model("User", userSchema);

//export to be able to use in other files
export default userModel;