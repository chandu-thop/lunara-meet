const { Server } = require("socket.io");

function connectToServer(server){
   const allowedOrigins =
      (
         process.env.CLIENT_URLS ||
         process.env.CLIENT_URL ||
          "https://lunara-meet.vercel.app,http://localhost:5173"
      )
      .split(",")
      .map((origin)=>origin.trim())
      .filter(Boolean);

   const io = new Server(server,{
      cors:{
         origin:allowedOrigins,
         methods:["GET","POST"],
         credentials:true
      }
   });

   return io;

}

module.exports = { connectToServer };
