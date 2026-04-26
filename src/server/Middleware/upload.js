import multer from "multer";
import path from "path";

// Define where to store files and what to name them
const storage = multer.diskStorage({
    //saves files to uploads folder. This is a temporary fix until I can gain access to a web service such as AWS to save them on
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage
});

export default upload;