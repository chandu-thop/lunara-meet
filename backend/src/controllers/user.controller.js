const {User}=require("../models/user.model.js");
const mongoose=require("mongoose");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const { StatusCodes } = require("http-status-codes");


function authMiddleware(req, res, next) {

    const authHeader = req.headers.authorization;

    // token missing
    if (!authHeader) {
        return res.status(401).json({
            message: "Token not found"
        });
    }

    try {

        // Bearer token
        const token = authHeader.split(" ")[1];

        // verify token
        const decoded = jwt.verify(token,process.env.JWT_SECRET);

        // attach user data
        req.userId = decoded.id;
        req.username = decoded.username;

        // move to next middleware
        next();

    } catch (err) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

const register=async (req,res)=>{
    try{
        let {name,username,password}=req.body;
        name = typeof name === "string" ? name.trim() : "";
        username = typeof username === "string" ? username.trim().toLowerCase() : "";
        password = typeof password === "string" ? password : "";

        if(!name || !username || !password.trim()){
            return res.status(StatusCodes.BAD_REQUEST).json({message:"Name, username, and password are required"});
        }

        if (password.length < 8) {
            return res.status(StatusCodes.BAD_REQUEST).json({message:"Password must be at least 8 characters"});
        }

        const p=await bcrypt.hash(password,10);
        await User.create({name, username, password:p});
        return res.status(StatusCodes.CREATED).json({message:"Account created successfully"});

    }catch(err){
        // MongoDB's unique index is the final authority when simultaneous
        // requests try to create the same username.
        if (err.code === 11000) {
            return res.status(StatusCodes.CONFLICT).json({message:"Username is already taken"});
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:err.message});
    }
    


}

const login = async (req, res) => {
    try {
        let { username, password } = req.body;
        username = typeof username === "string" ? username.trim().toLowerCase() : "";

        if (!username || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        let user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: "User does not exist!"
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(StatusCodes.UNAUTHORIZED).json({
                message: "Wrong password!"
            });
        }

        const token = jwt.sign(
            {
                id: String(user._id),
                username: user.username,
            },
            process.env.JWT_SECRET,
            { expiresIn: "4d" }
        );

        // user.token = token; // optional (not required for JWT)
return res.status(200).json({
    message: "Login Successful",
    token,
    user: {
        _id: user._id,
        username: user.username,
        name: user.name,
    }
});

    } catch (err) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: err.message
        });
    }
};

module.exports={register,login,authMiddleware};
