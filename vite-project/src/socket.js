import { io } from "socket.io-client";
import { API_URL } from "./config";

export function createUserSocket(){

   return io(
      API_URL,
      {
         autoConnect:false,

         auth:{
            token:
            localStorage.getItem(
               "token"
            )
         }
      }
   );

}
