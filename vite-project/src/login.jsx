import axios from "axios";
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { API_URL } from "./config";

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const [user, setUser] = useState({
    username: "",
    password: "",
  });

  function handleChange(e) {
    setUser({
      ...user,
      [e.target.name]: e.target.value,
    });
  }

 async function handleSubmit(e) {
  e.preventDefault();

  try {

    let result = await axios.post(
      `${API_URL}/api/v1/users/login`,
      user
    );

    localStorage.setItem(
      "token",
      result.data.token
    );

     // SAVE USERNAME + USER ID (must be 24-char hex string, not "[object Object]")
   sessionStorage.setItem(
      "username",
      result.data.user.username
   );
   const rawId = result.data.user._id;
   const userId =
      typeof rawId === "string"
        ? rawId
        : rawId && typeof rawId === "object" && rawId.$oid
          ? String(rawId.$oid)
          : String(rawId ?? "");
   sessionStorage.setItem("userId", userId);

    navigate("/");

  } catch (err) {

    if (err.response?.status === 401) {
      setError("Invalid username or password");
    } else {
      setError("Something went wrong");
    }
  }
}

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6 relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-[-150px] left-[-120px] w-[500px] h-[500px] bg-white/5 blur-3xl rounded-full" />

      <div className="absolute bottom-[-200px] right-[-120px] w-[600px] h-[600px] bg-[#334155]/20 blur-3xl rounded-full" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_120px_rgba(0,0,0,0.6)]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">

          <div className="w-2 h-8 rounded-full bg-white" />

          <h1 className="text-3xl tracking-[0.25em] font-light text-white/90">
            LUNARA
          </h1>
        </div>

        {/* Heading */}
        <div className="text-center mb-10">

          <h2
            className="text-5xl font-thin leading-tight"
            style={{
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.06em",
            }}
          >
            Welcome
            <br />
            Back.
          </h2>

          <p className="text-white/40 mt-4 text-sm font-light">
            Continue your premium experience.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={user.username}
            onChange={handleChange}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={user.password}
            onChange={handleChange}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition"
          />
          {
  error && (
    <p className="text-red-400 text-sm">
      {error}
    </p>
  )
}

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-white/10 border border-white/10 text-white font-light text-lg hover:bg-white/15 transition duration-300 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            Login
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/35 text-sm mt-8 font-light">
          Donâ€™t have an account?{" "}

          <NavLink
            to="/register"
            className="text-white/70 hover:text-white transition"
          >
            Sign Up
          </NavLink>
        </p>
      </div>
    </div>
  );
}
