import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Code() {

  const [user, setUser] = useState("");
  const [room, setRoom] = useState("");

  const navigate = useNavigate();
  function handleLogout(){
    localStorage.removeItem("token");
    navigate("/");
  }

  function handleSubmit(e) {
    e.preventDefault();

    navigate(`/room/${room}`, {
      state: { user },
    });
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6 relative overflow-hidden">

      {/* Ambient Glow */}
      <div className="absolute top-[-180px] left-[-120px] w-[500px] h-[500px] bg-white/5 blur-3xl rounded-full" />

      <div className="absolute bottom-[-220px] right-[-120px] w-[650px] h-[650px] bg-[#334155]/20 blur-3xl rounded-full" />

      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
      <button
      onClick={handleLogout}
      className="absolute top-6 right-6 z-20 px-6 py-3 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl text-white/70 hover:bg-white/10 hover:text-white transition duration-300"
      >
        Logout
     </button>

      {/* Join Card */}
      <div className="relative z-10 w-full max-w-md bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_120px_rgba(0,0,0,0.65)]">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">

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
            Join
            <br />
            Meeting.
          </h2>

          <p className="text-white/40 mt-4 text-sm font-light">
            Enter your identity and room code.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          <input
            type="text"
            name="username"
            placeholder="Your Name"
            value={user}
            required
            onChange={(e) => setUser(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition"
          />

          <input
            type="text"
            name="meeting-code"
            placeholder="Meeting Code"
            value={room}
            required
            onChange={(e) => setRoom(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 outline-none focus:border-white/20 transition"
          />

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-white/10 border border-white/10 text-white font-light text-lg hover:bg-white/15 transition duration-300 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          >
            Join Meeting
          </button>
        </form>

        {/* Bottom Text */}
        <p className="text-center text-white/30 text-sm mt-8 font-light">
          Secure communication for modern teams.
        </p>
      </div>
    </div>
  );
}