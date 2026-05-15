import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { createUserSocket } from "./socket";
import { Phone, PhoneOff } from "lucide-react";
import { API_URL } from "./config";

const rtcConfig = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

/** Stable string id for comparing JWT user, Mongo userId, etc. */
function normalizeUserId(v) {
  if (v == null || v === "") return "";
  if (typeof v === "object") {
    if (v._id != null) return String(v._id);
    if (v.$oid != null) return String(v.$oid);
    return String(v);
  }
  return String(v).trim();
}

/** Who wrote this row (server sends userId + senderId; same value as DB author). */
function messageAuthorId(msg) {
  if (!msg || msg.system) return "";
  const raw = msg.senderId ?? msg.userId;
  return normalizeUserId(raw);
}

/** Same `id` the server puts on the socket (JWT payload) — survives bad sessionStorage. */
function currentUserIdFromJwt() {
  try {
    const token = localStorage.getItem("token");
    if (!token || typeof token !== "string") return "";
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const payload = JSON.parse(atob(parts[1]));
    return normalizeUserId(payload.id ?? payload.sub ?? payload.userId);
  } catch {
    return "";
  }
}

function getCurrentUserIdForChat() {
  const fromJwt = currentUserIdFromJwt();
  const fromSession = normalizeUserId(sessionStorage.getItem("userId"));
  const sessionLooksLikeObjectId =
    fromSession.length === 24 && /^[a-f0-9]+$/i.test(fromSession);
  if (sessionLooksLikeObjectId) return fromSession.toLowerCase();
  if (fromJwt) return fromJwt.toLowerCase();
  return fromSession.toLowerCase();
}

/**
 * YOU (sender) → RIGHT (`justify-end`). Others → LEFT (`justify-start`).
 * Match by author id and/or username (server sets username from the authenticated user).
 */
function messageIsMine(msg){

   if(
      !msg ||
      msg.system
   ){
      return false;
   }

   const currentUsername =
   (
      sessionStorage.getItem(
         "username"
      ) || ""
   )
   .trim()
   .toLowerCase();

   const senderUsername =
   (
      msg.username || ""
   )
   .trim()
   .toLowerCase();

   return (
      currentUsername ===
      senderUsername
   );

}
export default function Room() {
  const { id, roomId: roomIdParam } = useParams();
  const roomId = roomIdParam || id;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const remoteVideoRef = useRef(null);
  /** Remote stream can arrive before the remote <video> mounts (e.g. caller in "outgoing"). */
  const remoteMediaStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const iceCandidateBufferRef = useRef([]);
  const awaitingAnswerRef = useRef(false);
  const ringtoneRef = useRef({
    audioContext: null,
    intervalId: null,
    timeoutIds: [],
  });

  const joined = useRef(false);

  const socketRef = useRef(createUserSocket());

const socket = socketRef.current;

  const username = sessionStorage.getItem("username");

  const [message, setMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState("");
  const [users, setUsers] = useState([]);
  const [socketError, setSocketError] = useState("");
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  /** none | outgoing | incoming | connected */
  const [callPhase, setCallPhase] = useState("none");
  const [callOverlayOpen, setCallOverlayOpen] = useState(false);

  const stopRingtone = useCallback(() => {
    const ringtone = ringtoneRef.current;

    if (ringtone.intervalId) {
      clearInterval(ringtone.intervalId);
      ringtone.intervalId = null;
    }

    ringtone.timeoutIds.forEach((id) => clearTimeout(id));
    ringtone.timeoutIds = [];

    if (ringtone.audioContext) {
      ringtone.audioContext.close().catch(() => {});
      ringtone.audioContext = null;
    }
  }, []);

  const playRingTone = useCallback(() => {
    if (ringtoneRef.current.intervalId) return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    ringtoneRef.current.audioContext = audioContext;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const playBeep = () => {
      if (!ringtoneRef.current.audioContext) return;

      const ctx = ringtoneRef.current.audioContext;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.35);
    };

    const ring = () => {
      playBeep();

      const timeoutId = setTimeout(() => {
        playBeep();
      }, 450);

      ringtoneRef.current.timeoutIds.push(timeoutId);
    };

    ring();
    ringtoneRef.current.intervalId = setInterval(ring, 1600);
  }, []);

  const flushIceBuffer = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc || !pc.remoteDescription) return;
    const buf = iceCandidateBufferRef.current;
    iceCandidateBufferRef.current = [];
    for (const c of buf) {
      try {
        await pc.addIceCandidate(c);
      } catch (e) {
        console.warn("addIceCandidate", e);
      }
    }
  }, []);

  const attachPeerHandlers = useCallback(
    (peer) => {
      peer.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;
        remoteMediaStreamRef.current = stream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      };
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", event.candidate);
        }
      };
    },
    [socket]
  );

  const createPeerWithStream = useCallback(
    (stream) => {
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      const peer = new RTCPeerConnection(rtcConfig);
      peerRef.current = peer;
      attachPeerHandlers(peer);
      stream.getTracks().forEach((track) => {
        peer.addTrack(track, stream);
      });
      return peer;
    },
    [attachPeerHandlers]
  );

  const createOffer = useCallback(async () => {
    if (!peerRef.current) return;
    const offer = await peerRef.current.createOffer();
    await peerRef.current.setLocalDescription(offer);
    socket.emit("offer", offer);
  }, [socket]);

  const cleanupCall = useCallback(() => {
    awaitingAnswerRef.current = false;
    pendingOfferRef.current = null;
    iceCandidateBufferRef.current = [];
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    remoteMediaStreamRef.current = null;
    setCallPhase("none");
    setCallOverlayOpen(false);
  }, []);

  const hangUp = useCallback(() => {
    if (socket.connected && callPhase !== "none") {
      socket.emit("call-end", { room: roomId });
    }

    cleanupCall();
  }, [callPhase, cleanupCall, roomId, socket]);

  const handleRemoteIce = useCallback(
    async (candidate) => {
      const pc = peerRef.current;
      if (!pc) {
        iceCandidateBufferRef.current.push(candidate);
        return;
      }
      if (!pc.remoteDescription) {
        iceCandidateBufferRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (e) {
        console.warn("addIceCandidate", e);
      }
    },
    []
  );

  useEffect(() => {
    const onOffer = async (offer) => {
      pendingOfferRef.current = offer;
      setCallPhase("incoming");
      setCallOverlayOpen(true);
    };
    socket.on("offer", onOffer);
    return () => socket.off("offer", onOffer);
  }, []);

  useEffect(() => {
    const onAnswer = async (answer) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(answer);
      awaitingAnswerRef.current = false;
      setCallPhase("connected");
      await flushIceBuffer();
    };
    socket.on("answer", onAnswer);
    return () => socket.off("answer", onAnswer);
  }, [flushIceBuffer]);

  useEffect(() => {
    const onIce = async (candidate) => {
      await handleRemoteIce(candidate);
    };
    socket.on("ice-candidate", onIce);
    return () => socket.off("ice-candidate", onIce);
  }, [handleRemoteIce]);

  useEffect(() => {
    if (callPhase !== "connected" || !callOverlayOpen) return;
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
    if (remoteVideoRef.current && remoteMediaStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteMediaStreamRef.current;
    }
  }, [callPhase, callOverlayOpen]);

  useEffect(() => {
    if (
      callOverlayOpen &&
      (callPhase === "incoming" || callPhase === "outgoing")
    ) {
      playRingTone();
      return;
    }

    stopRingtone();
  }, [callOverlayOpen, callPhase, playRingTone, stopRingtone]);

  useEffect(() => {
    const onRejected = () => {
      cleanupCall();
      setMessages((prev) => [
        ...prev,
        { system: true, text: "Video call was declined" },
      ]);
    };
    socket.on("call-rejected", onRejected);
    return () => socket.off("call-rejected", onRejected);
  }, [cleanupCall]);

  useEffect(() => {
    const onCallEnded = () => {
      cleanupCall();
      setMessages((prev) => [
        ...prev,
        { system: true, text: "Video call ended" },
      ]);
    };

    socket.on("call-ended", onCallEnded);

    return () => {
      socket.off("call-ended", onCallEnded);
    };
  }, [cleanupCall, socket]);

  useEffect(() => {
    joined.current = false;
  }, [roomId]);

  // Join Room
useEffect(() => {

   if(!username) return;

   socketRef.current.auth = {
      token: localStorage.getItem("token"),
   };

   socketRef.current.connect();

   socketRef.current.emit(

      "join-room",

      {
         room: roomId,

         username,
      }

   );

   return ()=>{

      socketRef.current.disconnect();

   };

}, [roomId, username]);

  useEffect(() => {
    const onConnect = () => {
      setSocketError("");
      socket.emit("get-old-messages", roomId);
    };

    const onConnectError = (err) => {
      setSocketError(err.message || "Socket connection failed");
    };

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
    };
  }, [roomId, socket]);

  /** Fix bad sessionStorage userId (e.g. "[object Object]") so left/right chat works. */
  useEffect(() => {
    const jwtId = currentUserIdFromJwt();
    if (!jwtId) return;
    const s = normalizeUserId(sessionStorage.getItem("userId"));
    const bad =
      !s ||
      s.includes("Object") ||
      !(s.length === 24 && /^[a-f0-9]+$/i.test(s));
    if (bad) {
      sessionStorage.setItem("userId", jwtId);
    }
  }, []);

  useEffect(() => {
    socket.on("show-typing", (msg) => {
      setTyping(`${msg.username} is typing`);
      setTimeout(() => {
        setTyping("");
      }, 2000);
    });
    return () => {
      socket.off("show-typing");
    };
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    socket.on("online-users", (msg) => {
      setUsers(msg.onlineusers);
    });
    return () => {
      socket.off("online-users");
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const onUserJoined = async (data) => {
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${data.username} joined the room`,
        },
      ]);

      if (
   awaitingAnswerRef.current &&
   streamRef.current
){

   createPeerWithStream(
      streamRef.current
   );

   await createOffer();

}
    };
    socket.on("user-joined", onUserJoined);
    return () => {
      socket.off("user-joined", onUserJoined);
    };
  }, [createOffer, createPeerWithStream]);

  useEffect(() => {
    socket.on("user-left", (msg) => {
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${msg.username} left the room`,
        },
      ]);
    });
    return () => {
      socket.off("user-left");
    };
  }, []);

 useEffect(() => {

   const handleReceiveMessage =
   (msg)=>{

      console.log(
         "MESSAGE RECEIVED:",
         msg
      );

      setMessages((prev)=>[
         ...prev,
         msg
      ]);

   };

   socketRef.current.on(
      "receive-message",
      handleReceiveMessage
   );

   return ()=>{

      socketRef.current.off(
         "receive-message",
         handleReceiveMessage
      );

   };

},[]);

  useEffect(() => {
    socket.on("old-messages", (data) => {
      setMessages(Array.isArray(data) ? data : []);
    });
    return () => {
      socket.off("old-messages");
    };
  }, []);

  useEffect(() => {
    socket.emit("get-old-messages", roomId);
  }, [roomId]);

  useEffect(() => {
    socket.on("message-deleted", (messageId) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });
    return () => {
      socket.off("message-deleted");
    };
  }, []);

  useEffect(() => {
    return () => {
      stopRingtone();
      if (peerRef.current) peerRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stopRingtone]);

  // useEffect(() => {
  //   return () => {
  //     const s = socketRef.current;
  //     if (!s) return;
  //     s.removeAllListeners();
  //     if (s.connected) s.disconnect();
  //     socketRef.current = null;
  //   };
  // }, []);

  const startvideo = async () => {
    setCallOverlayOpen(true);
    setCallPhase("outgoing");
    awaitingAnswerRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      createPeerWithStream(stream);
      await createOffer();
    } catch (err) {
      console.error(err);
      cleanupCall();
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: "Could not access camera or microphone for the call.",
        },
      ]);
    }
  };

  const acceptIncomingCall = async () => {
    const offer = pendingOfferRef.current;
    if (!offer) return;

    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }

      createPeerWithStream(stream);
      await peerRef.current.setRemoteDescription(offer);
      pendingOfferRef.current = null;
      await flushIceBuffer();

      const answer = await peerRef.current.createAnswer();
    

   await peerRef.current
   .setLocalDescription(
      answer
   );


      socket.emit("answer", answer);
      setCallPhase("connected");
    } catch (err) {
      console.error(err);
      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      pendingOfferRef.current = null;
      setCallPhase("none");
      setCallOverlayOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: "Could not accept the call. Check camera and microphone permissions.",
        },
      ]);
    }
  };

  const declineIncomingCall = () => {
    pendingOfferRef.current = null;
    setCallPhase("none");
    setCallOverlayOpen(false);
    socket.emit("call-reject", { room: roomId });
  };

function sendMessage(){

   if(
      !message.trim()
   ){
      return;
   }

   if(!socketRef.current.connected){
      setSocketError("Socket is not connected");
      socketRef.current.auth = {
         token: localStorage.getItem("token"),
      };
      socketRef.current.connect();
      return;
   }
 console.log(
   "SENDING:",
   {
      room: roomId,
      username,
      message
   }
);

   socketRef.current.emit(

      "send-message",

      {
         room:roomId,

         username:username,

         message:message,
      }

   );

   setMessage("");

}

  function handleMessageChange(e) {
    setMessage(e.target.value);
    if (typingTimeoutRef.current) return;
    socket.emit("typing", {
      room: roomId,
      username: username,
    });
    typingTimeoutRef.current = setTimeout(() => {
      typingTimeoutRef.current = null;
    }, 1200);
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }
    try {
      setUploadingImage(true);
      setUploadError("");
      const formData = new FormData();
      formData.append("file", file);
      const result = await axios.post(
        `${API_URL}/api/v1/users/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (!result.data.url) {
        throw new Error("Upload completed without an image URL");
      }
      socket.emit("send-message", {
        room: roomId,
        username: username,
        message: "",
        imageUrl: result.data.url,
      });
    } catch (err) {
      console.log(err);
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          "Image upload failed"
      );
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

function deleteMessage(id) {
  socket.emit("delete-message", id);
}


// useEffect(()=>{

//    return ()=>{

//       socket.removeAllListeners();

//    };

// },[]);
if (!username) return null;



  return (
    <div className="room-shell bg-[#050505] text-white relative min-h-screen">
      {callOverlayOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black">
          <div className="relative flex-1 min-h-0">
            {callPhase === "connected" && (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {callPhase === "outgoing" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {callPhase === "connected" && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-6 right-6 z-10 h-36 w-28 sm:h-44 sm:w-36 rounded-2xl object-cover border border-white/20 shadow-2xl"
              />
            )}
            {callPhase === "incoming" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.3em] text-white/40 mb-3">
                  Incoming call
                </p>
                <p className="text-2xl font-light text-white/90 mb-10">
                  Video call in this room
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={acceptIncomingCall}
                    className="rounded-full bg-emerald-500 px-10 py-4 text-sm font-medium tracking-wide text-black hover:bg-emerald-400 transition"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={declineIncomingCall}
                    className="rounded-full border border-white/20 bg-white/5 px-10 py-4 text-sm text-white/80 hover:bg-white/10 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
            {callPhase === "outgoing" && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center pb-16 pt-24 bg-gradient-to-t from-black/90 to-transparent">
                <p className="text-sm uppercase tracking-[0.3em] text-white/50 mb-2">
                  Calling
                </p>
                <p className="text-white/70 font-light">
                  Waiting for someone to accept…
                </p>
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center justify-center gap-6 border-t border-white/10 bg-black/80 py-6">
            <button
              type="button"
              onClick={hangUp}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/90 text-white hover:bg-red-500 transition"
              title="End call"
            >
              <PhoneOff size={26} />
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] bg-white/5 blur-3xl rounded-full" />
      <div className="absolute bottom-[-250px] right-[-120px] w-[650px] h-[650px] bg-[#334155]/20 blur-3xl rounded-full" />

      <div className="room-header z-20 flex items-center justify-between gap-4 px-8 border-b border-white/10 backdrop-blur-xl bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-white" />
          <h1 className="text-2xl tracking-[0.2em] font-light text-white/90">
            LUNARA
          </h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs tracking-[0.2em] text-white/30 uppercase mb-1">
              Room ID
            </p>
            <p className="text-white/80 font-light text-sm">{roomId}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={startvideo}
              disabled={callOverlayOpen}
              className="w-14 h-14 rounded-full bg-green-500/15 border border-green-400/20 backdrop-blur-xl flex items-center justify-center hover:bg-green-500/25 transition duration-300 shadow-[0_0_30px_rgba(34,197,94,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Start video call"
            >
              <Phone size={22} className="text-green-300" />
            </button>
          </div>

          <div className="w-px h-10 bg-white/10" />

          <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full backdrop-blur-xl">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-40" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/30">
                Online
              </span>
              <span className="text-sm text-white/80 font-light mt-1">
                {users?.length || 0} Users
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="
   grid
   grid-cols-1
   md:grid-cols-2
   gap-6
   p-6
   relative
   z-10
">
       <div className="
   overflow-hidden
   rounded-3xl
   border
   border-white/10
   bg-black
">

   {streamRef.current ? (

      <video
         ref={callOverlayOpen ? undefined : videoRef}
         autoPlay
         playsInline
         muted
         className="
            w-full
            h-[300px]
            object-cover
         "
      />

   ) : (

      <div className="
         w-full
         h-[300px]
         flex
         items-center
         justify-center
         text-white/20
         text-sm
      ">
         Your Camera
      </div>

   )}

</div>

<div className="
   overflow-hidden
   rounded-3xl
   border
   border-white/10
   bg-black
">

   {remoteMediaStreamRef.current ? (

      <video
         ref={callOverlayOpen ? undefined : remoteVideoRef}
         autoPlay
         playsInline
         className="
            w-full
            h-[300px]
            object-cover
         "
      />

   ) : (

      <div className="
         w-full
         h-[300px]
         flex
         items-center
         justify-center
         text-white/20
         text-sm
      ">
         Remote User
      </div>

   )}

</div>
      </div>

      <main className="room-scroll z-10">
        <div className="flex min-h-full flex-col justify-end px-6 py-8">
          {socketError && (
            <div className="flex justify-center mb-4">
              <p className="text-red-300 text-sm bg-red-500/10 border border-red-400/20 px-4 py-2 rounded-full">
                {socketError}. Please login again.
              </p>
            </div>
          )}
 {messages.map((m, index) => {
  if (m.system) {
    return (
      <div key={index} className="flex justify-center mb-4">
        <p className="text-white/35 text-sm bg-white/[0.03] border border-white/10 px-4 py-2 rounded-full backdrop-blur-xl">
          {m.text}
        </p>
      </div>
    );
  }

  const mine = messageIsMine(m);

  return (
    <div
      key={index}
      className={`flex mb-4 ${
        mine ? "justify-end" : "justify-start"
      }`}
    >
      <div className="relative group max-w-[70%]">

        {mine && (
          <button
            type="button"
            onClick={() => deleteMessage(m._id)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500/10 border border-red-400/20 backdrop-blur-xl text-red-300 text-sm opacity-0 group-hover:opacity-100 transition duration-300 hover:bg-red-500/20"
          >
            x
          </button>
        )}

        <div
          className={`px-5 py-4 rounded-[24px] backdrop-blur-xl border border-white/10 ${
            mine
              ? "bg-white/10 rounded-br-md"
              : "bg-white/[0.04] rounded-bl-md"
          }`}
        >
          <p className="text-xs text-white/40 mb-1">
            {mine ? "You" : m.username}
          </p>

          {m.message && (
            <p className="text-white/90 font-light break-words">
              {m.message}
            </p>
          )}

          {m.imageUrl && (
            <img
              src={m.imageUrl}
              alt="Shared"
              className="max-h-80 max-w-full rounded-2xl object-contain mt-2"
            />
          )}

          <p className="text-[11px] text-white/40 mt-2">
            {m.createdAt
              ? new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
})}
          <div ref={bottomRef} />
        </div>
      </main>

      {typing && (
        <div className="typing-strip z-10 px-8 pb-2">
          <div className="inline-flex items-center gap-3 bg-white/[0.03] border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce [animation-delay:0.3s]" />
            </div>
            <p className="text-sm text-white/45 font-light tracking-wide">
              {typing}
            </p>
          </div>
        </div>
      )}

      <div className="room-footer z-20 border-t border-white/10 bg-black/50 backdrop-blur-xl px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex w-full items-center gap-4"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="shrink-0 w-14 h-14 rounded-full bg-white/10 border border-white/10 text-2xl leading-none text-white/90 hover:bg-white/15 transition duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Share image"
          >
            {uploadingImage ? "..." : "+"}
          </button>
          {uploadError && (
            <span className="max-w-48 text-xs text-red-300">{uploadError}</span>
          )}
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            placeholder="Type your message..."
            className="min-w-0 flex-1 bg-white/[0.03] border border-white/10 rounded-[24px] px-6 py-4 text-white placeholder:text-white/25 outline-none focus:border-white/20 backdrop-blur-xl"
          />
          <button
            type="submit"
            className="shrink-0 px-10 py-4 rounded-[24px] bg-white/10 border border-white/10 text-white/90 hover:bg-white/15 transition duration-300"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
