import React from "react";
import {createBrowserRouter,RouterProvider} from "react-router-dom";
import { NavLink } from "react-router-dom";
import Register from "./register";
import Login from "./login";
import Home from "./home";
import VideoCallLandingPage from "./landingpage";
import Code from "./code";
import Room from "./Room";
import ProtectedRoute from "./protectedRoute";




const router = createBrowserRouter([

   {
      path:"/",

      element:
      <>
         <VideoCallLandingPage/>
      </>
   },

   {
      path:"/register",

      element:<Register/>
   },

   {
      path:"/login",

      element:<Login/>
   },

   {
      path:"/code",

      element:<Code/>
   },

   {
      path:"/room/:id",

      element:
      (
         <ProtectedRoute>

            <Room />

         </ProtectedRoute>
      )
   }

]);


export default function App(){
  return(<>
    <RouterProvider router={router}/>
    
    
    </>);

}



