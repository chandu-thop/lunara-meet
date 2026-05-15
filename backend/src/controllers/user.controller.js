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
    if(!name||!username||!password){
        return res.status(400).json({message:`all feilds required`});
    }
    const p=await bcrypt.hash(password,10);
    let user=await User.findOne({username});
    if(user){
        return res.status(StatusCodes.CONFLICT).json({message:"User Already Exits"});
    }
   
   await User.create({
        name:name,
        username:username,
        password:p,
        

    });
    return res.status(StatusCodes.CREATED).json({message:`Created Succesfully`});

    }catch(err){
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({message:err.message});
    }
    


}

const login = async (req, res) => {
    try {
        let { username, password } = req.body;

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