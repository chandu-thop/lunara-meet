require("dotenv").config({
   path: require("path").join(__dirname, ".env")
});
const express=require("express");
const mongoose=require("mongoose");
const cors=require("cors");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");
const {createServer}=require("http");
const {Server}=require("socket.io");
const {connectToServer}=require("./src/controllers/socketManager.js");
const {Meeting}=require("./src/models/meeting.model.js");

const app=express();
const server=createServer(app);
const io=connectToServer(server);
const userRoutes=require("./src/routes/users.routes.js");
const upload=require("./config/multer.js");
const { Socket } = require("dgram");
const PORT=process.env.PORT || 8081;
const allowedOrigins =
   (
      process.env.CLIENT_URLS ||
      process.env.CLIENT_URL ||
      https//lunara-meet.vercel.app
   )
   .split(",")
   .map((origin)=>origin.trim())
   .filter(Boolean);


app.use(cors({

   origin:
   allowedOrigins,

   credentials:true

}));
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}));
app.use("/api/v1/users",userRoutes);
app.post("/api/v1/users/upload", upload.single("file"), (req, res) => {
   if (!req.file) {
      return res.status(400).json({
         message: "Image upload failed"
      });
   }

   res.json({
      url: req.file.path || req.file.secure_url || req.file.url
   });
});
const onlineUsers={};

function serializeMeetingMessage(doc) {
   const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
   let u = o.userId;
   if (u != null && typeof u === "object") {
      if (u.$oid) u = u.$oid;
      else if (u._id) u = u._id;
      else if (typeof u.toString === "function") u = u.toString();
   }
   const authorId = u != null && u !== "" ? String(u) : "";
   return {
      _id: o._id,
      roomId: o.roomId,
      username: o.username,
      message: o.message ?? "",
      imageUrl: o.imageUrl,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      userId: authorId,
      senderId: authorId,
   };
}

function verifySocketToken(token) {
   try {
      return jwt.verify(token, process.env.JWT_SECRET);
   } catch (err) {
      return jwt.verify(token, "mycode");
   }
}

io.use((socket, next) => {

  try {

    const token = socket.handshake.auth.token;

    if (!token) {
      return next(
        new Error("Authentication Error")
      );
    }

    const decoded = verifySocketToken(token);

    socket.user = decoded;

    next();

  } catch (err) {

    next(
      new Error("Authentication Error")
    );

  }

});
io.on("connection",(socket)=>{

   // GET OLD MESSAGES
   socket.on(
      "get-old-messages",
      async (roomId)=>{

         const messages =
            await Meeting.find({
               roomId: roomId
            });

         socket.emit(
            "old-messages",
            messages.map(serializeMeetingMessage)
         );

      }
   );


   // JOIN ROOM
   socket.on("join-room",(msg)=>{

      socket.room = msg.room;

      socket.username = msg.username;

      if(socket.joinedRoom) return;

      socket.joinedRoom = true;

      socket.join(msg.room);

      // ONLINE USERS
      if(!onlineUsers[msg.room]){

         onlineUsers[msg.room] = [];

      }

      if(
         !onlineUsers[msg.room]
         .includes(msg.username)
      ){

         onlineUsers[msg.room]
         .push(msg.username);

      }

      io.to(msg.room).emit(
         "online-users",
         {
            onlineusers:
               onlineUsers[msg.room],
         }
      );

      // USER JOINED
      socket.broadcast
      .to(msg.room)
      .emit("user-joined",{
         username:msg.username,
      });

   });


 socket.on(
  "send-message",
  async (data) => {

    console.log("MESSAGE RECEIVED:", data);

    try {

      if (!data.message?.trim() && !data.imageUrl) {
        return;
      }

      const savedMessage =
        await Meeting.create({

          roomId: data.room,

          username: socket.username || data.username || socket.user.username,

          message: data.message,

          imageUrl: data.imageUrl,

          userId: socket.user.id,

        });

      const payload = serializeMeetingMessage(savedMessage);

      io.to(data.room).emit(
  "receive-message",
  payload
);

    } catch (err) {

      console.log(err);

    }

  }
);
   // DELETE MESSAGE
   socket.on(
      "delete-message",
      async (messageId)=>{

         const deletedMessage =
            await Meeting.findByIdAndDelete(
               messageId
            );

         if(!deletedMessage) return;

         io.to(
            deletedMessage.roomId
         ).emit(
            "message-deleted",
            messageId
         );

      }
   );


   // TYPING
   socket.on("typing",(msg)=>{

      socket.broadcast
      .to(msg.room)
      .emit(
         "show-typing",
         {
            username:msg.username
         }
      );

   });
   // WEBRTC OFFER
socket.on(
   "offer",
   (offer)=>{

      socket.broadcast
      .to(socket.room)
      .emit(
         "offer",
         offer
      );

   }
);

// WEBRTC ANSWER
socket.on(
   "answer",
   (answer)=>{

      socket.broadcast
      .to(socket.room)
      .emit(
         "answer",
         answer
      );

   }
);

// ICE CANDIDATES
socket.on(
   "ice-candidate",
   (candidate)=>{

      socket.broadcast
      .to(socket.room)
      .emit(
         "ice-candidate",
         candidate
      );

   }
);

   socket.on("call-reject", () => {

      if (!socket.room) return;

      socket.broadcast
      .to(socket.room)
      .emit("call-rejected");

   });

   socket.on("call-end", () => {

      if (!socket.room) return;

      socket.broadcast
      .to(socket.room)
      .emit("call-ended");

   });


   // DISCONNECT
   socket.on("disconnect",()=>{

      // REMOVE ONLINE USER
      if(
         socket.room &&
         onlineUsers[socket.room]
      ){

         onlineUsers[socket.room] =
            onlineUsers[socket.room]
            .filter(
               (user)=>
                  user !== socket.username
            );

         io.to(socket.room).emit(
            "online-users",
            {
               onlineusers:
                  onlineUsers[socket.room]
            }
         );

      }

      // USER LEFT
      socket.broadcast
      .to(socket.room)
      .emit(
         "user-left",
         {
            username:socket.username,
         }
      );

   });

});

mongoose.connect( process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.log(err);
});








app.get("/",(req,res)=>{
  res.send("this is home");
});

server.listen(PORT,()=>{
    console.log(`server is listening on the port ${PORT}`);

});
