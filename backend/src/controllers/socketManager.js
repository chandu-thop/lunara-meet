const { Server } = require("socket.io");

function connectToServer(server){
   const allowedOrigins =
      (
         process.env.CLIENT_URLS ||
         process.env.CLIENT_URL ||
          "https://lunara-meet.vercel.app"
      )
      .split(",")
      .map((origin)=>origin.trim())
      .filter(Boolean);

   const io = new Server(server,{
      cors:{
         origin:allowedOrigins,
         methods:["GET","POST"]
      }
   });

   return io;

}

module.exports = { connectToServer };
