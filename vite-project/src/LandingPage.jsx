import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useNavigate } from "react-router-dom";
export default function VideoCallLandingPage() {
  const[showerror,setShowError]=useState(false);
  const navigate=useNavigate();
  function handleC(){
    const token=localStorage.getItem("token");
    const username=sessionStorage.getItem("username");

    if(!token || !username){
      localStorage.removeItem("token");
      sessionStorage.removeItem("username");
      sessionStorage.removeItem("userId");
      setShowError(true);
       setTimeout(()=>{
        setShowError(false)
       },2500);

    }
    else{
      navigate("/code");
      
    }
  }
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden relative font-sans">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[#050505]" />

      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-white/5 blur-3xl rounded-full" />

      <div className="absolute bottom-[-300px] left-[-200px] w-[700px] h-[700px] bg-[#1e293b]/30 blur-3xl rounded-full" />

      <div className="absolute top-[20%] right-[-150px] w-[500px] h-[500px] bg-[#334155]/20 blur-3xl rounded-full" />

      {/* Noise Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:22px_22px]" />
      {
  showerror && (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl bg-white/[0.05] border border-red-400/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(239,68,68,0.08)] animate-[fadeIn_0.3s_ease]">

      <p className="text-red-300 font-light tracking-wide">
        Please login before starting a meeting
      </p>

    </div>
  )
}

      {/* Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-8 md:px-14 lg:px-20 py-6 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-white" />

          <h1 className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white/90">
            LUNARA
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-12 text-white/60 text-[17px] font-light">
          <a
            href="#"
            className="hover:text-white transition duration-300"
          >
            Product
          </a>

          <a
            href="#"
            className="hover:text-white transition duration-300"
          >
            Solutions
          </a>

          <div className="flex items-center gap-4">
            <NavLink to="/register">
              <button className="px-6 py-3 rounded-full text-white/70 hover:text-white transition duration-300 font-light">
              Sign Up
            </button>
            </NavLink>
            
             <NavLink to="/login">
              <button className="px-7 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl text-white/80 hover:bg-white/10 transition duration-300 shadow-[0_0_40px_rgba(255,255,255,0.04)]">
              Login
            </button>
             </NavLink>
            
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col xl:flex-row items-center justify-between min-h-[calc(100vh-110px)] xl:h-[calc(100vh-110px)] py-10 xl:py-0 px-6 sm:px-8 md:px-14 lg:px-20 gap-10 xl:gap-4 pb-10 xl:pb-0 overflow-hidden xl:overflow-visible">

        {/* Left Content */}
        <div className="w-full xl:w-[48%] pt-6 xl:pt-0 relative z-20 text-center xl:text-left">

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-xl text-sm text-white/50 tracking-wide mb-10">
            Premium Video Communication
          </div>

          <h1
            className="text-[42px] sm:text-[54px] md:text-[72px] lg:text-[82px] leading-[0.88] text-white font-thin"
            style={{
              fontFamily: "Inter, sans-serif",
              letterSpacing: "-0.065em",
              fontWeight: 300,
            }}
          >
            Where
            <br />
            Distance
            <br />
            <span className="text-white/90">
              Disappears.
            </span>
          </h1>

          <p className="mt-8 text-base sm:text-lg md:text-xl text-white/45 leading-relaxed max-w-xl font-light mx-auto lg:mx-0">
            A refined communication experience for modern teams.
            Minimal, immersive and built to feel effortless.
          </p>

          <div className="flex items-center justify-center xl:justify-start gap-5 mt-12 mb-6 flex-wrap">
            
               <button onClick={handleC} className="px-8 py-4 rounded-full bg-white/10 border border-white/10 backdrop-blur-2xl text-white text-lg font-light hover:bg-white/15 transition duration-300 shadow-[0_0_60px_rgba(255,255,255,0.06)]">
              Start Meeting
            </button>
          
           

            <button className="text-white/40 hover:text-white/70 transition text-lg font-light">
              Watch Preview
            </button>
          </div>
        </div>

        {/* Right Visual */}
        <div className="relative flex items-center justify-center h-[420px] sm:h-[520px] md:h-[580px] xl:h-[640px] w-full xl:w-[52%] mt-0 overflow-visible">

          {/* Back Glow */}
          <div className="absolute w-[520px] h-[520px] rounded-full bg-white/[0.03] blur-3xl" />

          {/* Female Card */}
          <div className="absolute left-[10%] md:left-[14%] xl:left-6 top-6 sm:top-10 xl:top-16 w-[160px] sm:w-[210px] md:w-[220px] xl:w-[250px] h-[340px] sm:h-[430px] md:h-[460px] xl:h-[520px] rounded-[42px] overflow-hidden rotate-[-11deg] bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-[0_20px_120px_rgba(0,0,0,0.7)]">

            <img
              src="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=1400&auto=format&fit=crop"
              alt="woman"
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-6">

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-2xl font-light">
                    Emma Carter
                  </h2>

                  <p className="text-white/50 text-sm mt-1">
                    Strategy Lead
                  </p>
                </div>

                <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
              </div>

              <div className="flex items-center justify-center gap-4">

                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-lg">
                  🎤
                </button>

                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-lg">
                  📹
                </button>

                <button className="w-16 h-16 rounded-full bg-red-500/90 backdrop-blur-xl text-xl shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Male Card */}
          <div className="absolute right-[10%] md:right-[14%] xl:right-6 bottom-0 w-[160px] sm:w-[210px] md:w-[220px] xl:w-[250px] h-[340px] sm:h-[430px] md:h-[460px] xl:h-[520px] rounded-[42px] overflow-hidden rotate-[9deg] bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-[0_20px_120px_rgba(0,0,0,0.7)]">

            <img
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1400&auto=format&fit=crop"
              alt="man"
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

            <div className="absolute bottom-0 left-0 w-full p-6">

              <div className="flex items-center justify-between mb-6">

                <div>
                  <h2 className="text-2xl font-light">
                    Ethan Vale
                  </h2>

                  <p className="text-white/50 text-sm mt-1">
                    Executive Consultant
                  </p>
                </div>

                <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]" />
              </div>

              <div className="flex items-center justify-center gap-4">

                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-lg">
                  🎤
                </button>

                <button className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 text-lg">
                  📹
                </button>

                <button className="w-16 h-16 rounded-full bg-red-500/90 backdrop-blur-xl text-xl shadow-[0_0_40px_rgba(239,68,68,0.4)]">
                  ✕
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
