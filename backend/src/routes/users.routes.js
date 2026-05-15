const {Router}=require("express");
const {register,login}=require("../controllers/user.controller.js");
const upload = require("../../config/multer.js");


const router=Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: "Image upload failed"
        });
    }

    res.json({
        url: req.file.path || req.file.secure_url || req.file.url
    });
});

module.exports=router;
