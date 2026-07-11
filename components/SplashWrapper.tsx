"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import clsx from "clsx";

// Every character is its own DOM element, driven by state
const CHARS = ['A','D','I','T','H','Y','A','T','E','C','H','.','I','N'] as const;
const CHAR_DELAY_MS = 220;   // ms between each character being thrown
const BOX_SHOW_AT_MS  = 100; // box appears, lid closed, logo visible
const LOGO_PULSE_AT_MS = 950; // logo energy pulse on box face
const BOX_OPEN_AT_MS  = 1350; // lid rotates open
const FIRST_CHAR_AT_MS = 2150; // A is thrown

type Phase =
  | "idle"        // before mount
  | "box"         // box closed, logo visible on front face
  | "logoPulse"   // logo on box pulses with blue-gold energy before opening
  | "opening"     // lid rotates open
  | "throwing"    // characters being released one by one
  | "pulse"       // name complete, energy sweep
  | "reveal"      // logo + tagline
  | "ready"       // ENTER WAREHOUSE button visible
  | "loading"     // user clicked
  | "exit";       // fading out

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash]   = useState(true);
  const [isMounted, setIsMounted]     = useState(false);
  const [phase, setPhase]             = useState<Phase>("idle");
  // How many characters have been revealed so far (0 = none visible)
  const [revealedCount, setRevealedCount] = useState(0);
  const [isLoading, setIsLoading]     = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }
    setIsMounted(true);

    addTimer(() => setPhase("box"),       BOX_SHOW_AT_MS);
    addTimer(() => setPhase("logoPulse"), LOGO_PULSE_AT_MS);
    addTimer(() => setPhase("opening"),   BOX_OPEN_AT_MS);

    // Start releasing characters one by one
    addTimer(() => {
      setPhase("throwing");
      let count = 0;
      intervalRef.current = setInterval(() => {
        count++;
        setRevealedCount(count);
        if (count >= CHARS.length) {
          clearInterval(intervalRef.current!);
        }
      }, CHAR_DELAY_MS);
    }, FIRST_CHAR_AT_MS);

    // After last letter settles (~300ms for its own animation) → pulse
    const allLettersAt = FIRST_CHAR_AT_MS + CHARS.length * CHAR_DELAY_MS + 300;
    addTimer(() => setPhase("pulse"),   allLettersAt);
    addTimer(() => setPhase("reveal"),  allLettersAt + 700);
    addTimer(() => setPhase("ready"),   allLettersAt + 1700);

    return () => {
      timersRef.current.forEach(clearTimeout);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleEnter = () => {
    if (isLoading) return;
    setIsLoading(true);
    setProgressKey(k => k + 1);
    addTimer(() => {
      setPhase("exit");
      addTimer(() => {
        setShowSplash(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 1000);
    }, 3000);
  };

  if (!showSplash && !isMounted) return <>{children}</>;
  if (!showSplash) return <div style={{ animation: "splashFadeIn 1s ease forwards" }}>{children}</div>;

  const boxVisible      = phase === "box" || phase === "logoPulse" || phase === "opening" || phase === "throwing";
  const isBoxPulsing    = phase === "logoPulse";
  const pulseActive     = phase === "pulse" || phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const logoVisible     = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const taglineVisible  = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const buttonVisible   = phase === "ready" && !isLoading;
  const loadingVisible  = isLoading;

  return (
    <>
      {/* Hidden pre-render of children */}
      <div style={{ opacity: phase === "exit" ? 1 : 0, height: phase === "exit" ? "auto" : 0, overflow:"hidden", transition:"opacity 1s ease" }}>
        {children}
      </div>

      <div
        style={{
          position:"fixed", inset:0, zIndex:100,
          width:"100vw", height:"100dvh", overflow:"hidden",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          background:"radial-gradient(ellipse at 50% 40%, #0b1a33 0%, #050d1a 55%, #000000 100%)",
          opacity: phase === "exit" ? 0 : 1,
          transition:"opacity 1s ease",
          pointerEvents: phase === "exit" ? "none" : "auto",
        }}
      >
        {/* Grid background */}
        <div style={{
          position:"absolute", inset:0, opacity:0.1, pointerEvents:"none",
          backgroundImage:"linear-gradient(rgba(77,144,254,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(77,144,254,0.5) 1px, transparent 1px)",
          backgroundSize:"clamp(28px,4.5vw,55px) clamp(28px,4.5vw,55px)",
        }} />
        {/* Ambient glows */}
        <div style={{ position:"absolute", top:"-8%", left:"-4%", width:"clamp(180px,28vw,450px)", height:"clamp(180px,28vw,450px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,140,0,0.13) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-8%", right:"-4%", width:"clamp(180px,28vw,450px)", height:"clamp(180px,28vw,450px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(77,144,254,0.16) 0%, transparent 70%)", pointerEvents:"none" }} />

        {/* ====== MAIN STACK ====== */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"clamp(10px,1.8vh,28px)", position:"relative", zIndex:10, width:"100%", padding:"0 clamp(12px,3vw,48px)" }}>

          {/* LOGO */}
          <div style={{
            transition:"opacity 0.8s ease, transform 0.8s ease",
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.88)",
          }}>
            <Image
              src="/adithyatech-emblem.png"
              alt="AdithyaTech Logo"
              width={160} height={160}
              priority quality={100}
              style={{
                width:"clamp(56px,9vw,120px)", height:"auto",
                filter:"drop-shadow(0 0 18px rgba(77,144,254,0.65)) drop-shadow(0 0 36px rgba(255,140,0,0.3))",
              }}
            />
          </div>

          {/* 3D BOX – fades out once throwing starts */}
          <div style={{
            perspective:"600px", perspectiveOrigin:"50% 50%",
            transition:"opacity 0.5s ease",
            opacity: boxVisible ? 1 : 0,
            pointerEvents:"none",
            height: boxVisible ? "auto" : 0,
            overflow: boxVisible ? "visible" : "hidden",
          }}>
            <div style={{
              width:"clamp(70px,11vw,140px)", height:"clamp(70px,11vw,140px)",
              position:"relative", transformStyle:"preserve-3d",
              animation: phase === "opening" || phase === "throwing" ? "boxFloat 2s ease infinite alternate" : undefined,
            }}>
              {/* FRONT FACE – bears the official AdithyaTech logo */}
              <div style={{
                position:"absolute", width:"100%", height:"100%",
                transform:`translateZ(clamp(35px,5.5vw,70px))`,
                background:"linear-gradient(135deg, rgba(10,25,51,0.92) 0%, rgba(5,15,35,0.96) 100%)",
                border:"1px solid rgba(77,144,254,0.4)",
                boxShadow:"inset 0 0 18px rgba(77,144,254,0.07), 0 0 14px rgba(77,144,254,0.18)",
                backfaceVisibility:"hidden",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
                <div style={{ position:"absolute", inset:4, border:"1px solid rgba(77,144,254,0.12)", borderRadius:2 }} />
                {/* Official logo – physically embedded on the front face surface */}
                <div style={{
                  position:"relative", zIndex:2, display:"flex", alignItems:"center", justifyContent:"center",
                  width:"72%", height:"72%",
                  animation: isBoxPulsing ? "logoPulse 0.45s ease-in-out 2 alternate" : undefined,
                }}>
                  <Image
                    src="/adithyatech-emblem.png"
                    alt="AdithyaTech"
                    fill
                    priority
                    quality={100}
                    style={{
                      objectFit:"contain",
                      filter: isBoxPulsing
                        ? "drop-shadow(0 0 14px rgba(77,144,254,1)) drop-shadow(0 0 28px rgba(255,180,0,0.9)) brightness(1.3)"
                        : "drop-shadow(0 0 8px rgba(77,144,254,0.7)) drop-shadow(0 0 16px rgba(255,140,0,0.4))",
                      transition:"filter 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* The other 4 faces (back, left, right, bottom) */}
              {[
                { key:"back",   xf:`rotateY(180deg) translateZ(clamp(35px,5.5vw,70px))` },
                { key:"left",   xf:`rotateY(-90deg) translateZ(clamp(35px,5.5vw,70px))` },
                { key:"right",  xf:`rotateY(90deg) translateZ(clamp(35px,5.5vw,70px))` },
                { key:"bottom", xf:`rotateX(-90deg) translateZ(clamp(35px,5.5vw,70px))` },
              ].map(({ key, xf }) => (
                <div key={key} style={{
                  position:"absolute", width:"100%", height:"100%", transform:xf,
                  background:"linear-gradient(135deg, rgba(10,25,51,0.92) 0%, rgba(5,15,35,0.96) 100%)",
                  border:"1px solid rgba(77,144,254,0.4)",
                  boxShadow:"inset 0 0 18px rgba(77,144,254,0.07), 0 0 14px rgba(77,144,254,0.18)",
                  backfaceVisibility:"hidden",
                }}>
                  <div style={{ position:"absolute", inset:4, border:"1px solid rgba(77,144,254,0.12)", borderRadius:2 }} />
                </div>
              ))}

              {/* Lid – rotates open when phase is opening/throwing */}
              <div style={{
                position:"absolute", width:"100%", height:"100%",
                transform: (phase === "opening" || phase === "throwing")
                  ? `rotateX(90deg) translateZ(clamp(35px,5.5vw,70px)) rotateX(-150deg)`
                  : `rotateX(90deg) translateZ(clamp(35px,5.5vw,70px))`,
                background:"linear-gradient(135deg, rgba(15,35,70,0.96) 0%, rgba(10,25,55,0.99) 100%)",
                border:"1px solid rgba(77,144,254,0.65)",
                boxShadow:"0 0 28px rgba(77,144,254,0.4), inset 0 0 18px rgba(77,144,254,0.1), 0 -5px 22px rgba(255,140,0,0.15)",
                backfaceVisibility:"hidden",
                transformOrigin:"bottom center",
                transition:"transform 0.75s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <div style={{ position:"absolute", inset:4, border:"1px solid rgba(77,144,254,0.22)", borderRadius:2 }} />
              </div>

              {/* Neon edge lights */}
              {["top","right","bottom","left"].map(edge => (
                <div key={edge} style={{
                  position:"absolute",
                  background: (edge==="top"||edge==="bottom")
                    ? "linear-gradient(90deg,transparent,rgba(255,140,0,0.85),transparent)"
                    : "linear-gradient(180deg,transparent,rgba(77,144,254,0.85),transparent)",
                  ...(edge==="top"    ? { top:0,    left:0, right:0, height:"1px" } : {}),
                  ...(edge==="bottom" ? { bottom:0, left:0, right:0, height:"1px" } : {}),
                  ...(edge==="left"   ? { left:0,  top:0, bottom:0, width:"1px" }  : {}),
                  ...(edge==="right"  ? { right:0, top:0, bottom:0, width:"1px" }  : {}),
                  boxShadow:(edge==="top"||edge==="bottom") ? "0 0 8px rgba(255,140,0,0.6)" : "0 0 8px rgba(77,144,254,0.6)",
                  animation:"neonPulse 2s ease-in-out infinite alternate",
                }} />
              ))}
            </div>
          </div>

          {/* ====== CHARACTER-BY-CHARACTER NAME ASSEMBLY ====== */}
          {/*
            Each character is conditionally rendered only when revealedCount > i.
            When it first appears it plays the "letterFlyIn" keyframe animation,
            which originates from above (simulating exiting the box) and settles
            into its final position in the flex row.
          */}
          <div style={{
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            flexWrap:"nowrap",
            minHeight:"clamp(36px,7vw,88px)",
            position:"relative",
          }}>
            {CHARS.map((char, i) => {
              const isVisible = revealedCount > i;
              // Each character shows one slice of the full gradient.
              // backgroundSize is CHARS.length * 100% wide; backgroundPosition
              // moves the correct slice under each character.
              const N = CHARS.length; // 14
              const gradientPos = `${(i / (N - 1)) * 100}%`;
              return (
                <span
                  key={`${char}-${i}`}
                  aria-hidden={i > 0 && char === CHARS[i - 1]}
                  style={{
                    display:"inline-block",
                    fontSize:"clamp(18px,4.2vw,64px)",
                    fontWeight:900,
                    letterSpacing:"clamp(0.5px,0.25vw,3px)",
                    fontFamily:"'Inter','SF Pro Display',sans-serif",
                    // Premium gradient: #ED8306 → #F8CD1A → #0DE2F7 → #1494E3 → #044EE8
                    background:"linear-gradient(90deg, #ED8306 0%, #F8CD1A 25%, #0DE2F7 55%, #1494E3 78%, #044EE8 100%)",
                    backgroundSize:`${N * 100}% 100%`,
                    backgroundPosition:`${gradientPos} center`,
                    WebkitBackgroundClip:"text",
                    WebkitTextFillColor:"transparent",
                    backgroundClip:"text",
                    color:"transparent",
                    // Only show when it's this character's turn
                    opacity: isVisible ? 1 : 0,
                    // Fly-in animation runs only when a character is first revealed
                    animation: isVisible ? "letterFlyIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
                    textShadow: pulseActive
                      ? `0 0 18px rgba(77,144,254,0.95), 0 0 36px rgba(77,144,254,0.5), 0 0 54px rgba(255,140,0,0.3)`
                      : isVisible
                        ? "0 0 12px rgba(77,144,254,0.5)"
                        : "none",
                    transition: "text-shadow 0.6s ease",
                    willChange:"transform, opacity",
                    lineHeight:1,
                    WebkitFontSmoothing:"antialiased",
                    // Extra subtle glow during pulse sweep
                    ...(pulseActive ? { filter:`brightness(1.15)` } : {}),
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* TAGLINE */}
          <div style={{
            display:"flex", alignItems:"center", gap:"clamp(6px,1.2vw,18px)",
            transition:"opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? "translateY(0)" : "translateY(12px)",
          }}>
            {["SMART","SECURE","SCALABLE"].map((word, i) => (
              <span key={word} style={{ display:"flex", alignItems:"center", gap:"clamp(6px,1.2vw,18px)" }}>
                <span style={{
                  fontSize:"clamp(8px,1.1vw,14px)", fontWeight:700,
                  letterSpacing:"clamp(1.5px,0.4vw,5px)",
                  color: i===0 ? "#ff8c00" : i===1 ? "#4d90fe" : "#e040fb",
                  textShadow: i===0 ? "0 0 10px rgba(255,140,0,0.6)" : i===1 ? "0 0 10px rgba(77,144,254,0.6)" : "0 0 10px rgba(224,64,251,0.6)",
                }}>
                  {word}
                </span>
                {i < 2 && <span style={{ color:"rgba(255,255,255,0.22)", fontSize:"clamp(8px,1.2vw,16px)" }}>•</span>}
              </span>
            ))}
          </div>

          {/* ENTER WAREHOUSE BUTTON */}
          <div style={{
            marginTop:"clamp(6px,1.2vh,18px)",
            transition:"opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
            pointerEvents: buttonVisible ? "auto" : "none",
          }}>
            <button
              onClick={handleEnter}
              style={{
                position:"relative", display:"flex", alignItems:"center",
                gap:"clamp(8px,1vw,14px)",
                padding:"clamp(12px,1.4vh,17px) clamp(22px,2.8vw,44px)",
                background:"linear-gradient(135deg,rgba(10,25,51,0.92) 0%,rgba(5,15,35,0.96) 100%)",
                border:"1px solid rgba(77,144,254,0.65)",
                borderRadius:"clamp(28px,5vw,60px)",
                color:"white", fontSize:"clamp(10px,1.1vw,14px)", fontWeight:900,
                letterSpacing:"clamp(2px,0.4vw,5px)", cursor:"pointer", whiteSpace:"nowrap",
                boxShadow:"0 0 28px -5px rgba(77,144,254,0.5), 0 0 55px -10px rgba(77,144,254,0.28)",
                backdropFilter:"blur(10px)", overflow:"hidden",
                transition:"transform 0.2s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1.05)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 0 48px -5px rgba(77,144,254,0.8), 0 0 75px -10px rgba(77,144,254,0.4)";}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform="scale(1)";(e.currentTarget as HTMLButtonElement).style.boxShadow="0 0 28px -5px rgba(77,144,254,0.5), 0 0 55px -10px rgba(77,144,254,0.28)";}}
              onMouseDown={e=>(e.currentTarget as HTMLButtonElement).style.transform="scale(0.97)"}
              onMouseUp={e=>(e.currentTarget as HTMLButtonElement).style.transform="scale(1.04)"}
              aria-label="Enter Warehouse"
            >
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.07) 50%,transparent 100%)", transform:"translateX(-100%)", animation:"shimmer 2.5s ease infinite" }} />
              <span style={{ position:"relative", zIndex:1, textShadow:"0 0 8px rgba(255,255,255,0.45)" }}>ENTER WAREHOUSE</span>
              <span style={{ position:"relative", zIndex:1, fontSize:"clamp(13px,1.4vw,18px)", textShadow:"0 0 8px rgba(77,144,254,0.8)" }}>→</span>
            </button>
          </div>

          {/* LOADING STATE */}
          <div style={{
            marginTop:"clamp(6px,1.2vh,18px)",
            transition:"opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s",
            opacity: loadingVisible ? 1 : 0,
            transform: loadingVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
            pointerEvents:"none",
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:"clamp(8px,1.2vh,16px)", width:"clamp(140px,22vw,260px)",
          }}>
            <div style={{ color:"#4d90fe", fontWeight:700, letterSpacing:"clamp(2px,0.45vw,5px)", textTransform:"uppercase", fontSize:"clamp(9px,0.9vw,12px)", animation:"pulseOpacity 1.5s ease-in-out infinite", textShadow:"0 0 10px rgba(77,144,254,0.8)" }}>
              Loading
            </div>
            <div style={{ display:"flex", gap:"clamp(5px,0.7vw,9px)" }}>
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{ width:"clamp(5px,0.7vw,9px)", height:"clamp(5px,0.7vw,9px)", borderRadius:"50%", background:"#4d90fe", boxShadow:"0 0 10px rgba(77,144,254,1)", animation:"dotBounce 1.2s ease-in-out infinite", animationDelay:`${i*0.15}s` }} />
              ))}
            </div>
            <div style={{ width:"100%", height:"2px", background:"rgba(77,144,254,0.14)", borderRadius:"2px", overflow:"hidden", position:"relative" }}>
              <div key={progressKey} style={{ position:"absolute", top:0, left:0, height:"100%", background:"linear-gradient(90deg,#4d90fe,#60a5fa)", boxShadow:"0 0 10px rgba(77,144,254,1)", borderRadius:"2px", animation:"progressBar 3s ease-in-out forwards" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:"absolute", bottom:"clamp(10px,1.8vh,22px)", color:"rgba(255,255,255,0.18)", fontSize:"clamp(7px,0.65vw,10px)", letterSpacing:"clamp(2px,0.45vw,5px)", fontWeight:700, textTransform:"uppercase", transition:"opacity 1s ease", opacity: logoVisible ? 1 : 0 }}>
          © 2026 ADITHYATECH • Global Warehouse Network
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes letterFlyIn {
          0%   { opacity:0; transform: translateY(clamp(-120px,-18vh,-60px)) scale(0.25) rotateX(80deg) rotateZ(-8deg); filter: blur(4px); }
          60%  { opacity:1; filter: blur(0px); }
          80%  { transform: translateY(4px) scale(1.06) rotateX(0deg) rotateZ(0deg); }
          100% { opacity:1; transform: translateY(0) scale(1) rotateX(0deg) rotateZ(0deg); filter: blur(0px); }
        }
        @keyframes logoPulse {
          0%   { transform: scale(1);    filter: drop-shadow(0 0 8px rgba(77,144,254,0.7)) drop-shadow(0 0 16px rgba(255,140,0,0.4)); }
          50%  { transform: scale(1.12); filter: drop-shadow(0 0 20px rgba(77,144,254,1)) drop-shadow(0 0 40px rgba(255,180,0,1)) brightness(1.4); }
          100% { transform: scale(1);    filter: drop-shadow(0 0 8px rgba(77,144,254,0.7)) drop-shadow(0 0 16px rgba(255,140,0,0.4)); }
        }
        @keyframes boxFloat {
          from { transform: rotateY(-5deg) rotateX(3deg) translateY(0px); }
          to   { transform: rotateY(5deg) rotateX(-3deg) translateY(-8px); }
        }
        @keyframes neonPulse {
          from { opacity: 0.45; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulseOpacity {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-8px); }
        }
        @keyframes progressBar {
          0%   { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </>
  );
}
