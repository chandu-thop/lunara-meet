import { Navigate }
from "react-router-dom";

export default function ProtectedRoute({
   children
}){

   const token =
   localStorage.getItem(
      "token"
   );

   const username =
   sessionStorage.getItem(
      "username"
   );

   if(!token || !username){

      localStorage.removeItem(
         "token"
      );

      return (
         <Navigate
            to="/login"
         />
      );

   }

   return children;

}
