"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import clsx from "clsx";

// The exact brand name, split into individual characters
const BRAND_NAME = "ADITHYATECH.IN".split("");

// Animation phases
type Phase =
  | "idle"        // before mount
  | "box"         // 3D box is visible, closed
  | "opening"     // box lid is rotating open
  | "letters"     // letters flying out and assembling
  | "pulse"       // energy pulse across assembled name
  | "reveal"      // logo + tagline fade in
  | "ready"       // ENTER WAREHOUSE button visible
  | "loading"     // user clicked – loading dots active
  | "exit";       // full screen fading out

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [progressKey, setProgressKey] = useState(0); // remount to restart animation

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }
    setIsMounted(true);
    // Start the animation sequence
    const t1 = setTimeout(() => setPhase("box"),      100);
    const t2 = setTimeout(() => setPhase("opening"),  900);
    const t3 = setTimeout(() => setPhase("letters"),  1700);
    const t4 = setTimeout(() => setPhase("pulse"),    3600);
    const t5 = setTimeout(() => setPhase("reveal"),   4200);
    const t6 = setTimeout(() => setPhase("ready"),    5200);
    return () => [t1,t2,t3,t4,t5,t6].forEach(clearTimeout);
  }, []);

  const handleEnter = () => {
    if (isLoading) return;
    setIsLoading(true);
    setProgressKey(k => k + 1);
    setTimeout(() => {
      setPhase("exit");
      setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 1000);
    }, 3000);
  };

  if (!showSplash && !isMounted) return <>{children}</>;
  if (!showSplash) return <div style={{ animation: "splashFadeIn 1s ease forwards" }}>{children}</div>;

  const lettersVisible  = phase === "letters" || phase === "pulse" || phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const pulseActive     = phase === "pulse" || phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const logoVisible     = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const taglineVisible  = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const buttonVisible   = phase === "ready" && !isLoading;
  const loadingVisible  = isLoading;
  const boxVisible      = phase === "box" || phase === "opening" || phase === "letters";

  return (
    <>
      {/* Hidden pre-render of children for smooth transition */}
      <div className={clsx("transition-opacity duration-1000", phase === "exit" ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
        {children}
      </div>

      {/* Full-screen splash overlay */}
      <div
        className="fixed inset-0 z-[100] w-[100vw] h-[100dvh] overflow-hidden flex flex-col items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, #0b1a33 0%, #050d1a 55%, #000000 100%)",
          opacity: phase === "exit" ? 0 : 1,
          transition: "opacity 1s ease",
          pointerEvents: phase === "exit" ? "none" : "auto",
        }}
      >
        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.12,
          backgroundImage: "linear-gradient(rgba(77,144,254,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(77,144,254,0.4) 1px, transparent 1px)",
          backgroundSize: "clamp(30px, 5vw, 60px) clamp(30px, 5vw, 60px)",
          pointerEvents: "none",
        }} />

        {/* Ambient corner glows */}
        <div style={{ position:"absolute", top:"-10%", left:"-5%", width:"clamp(200px,30vw,500px)", height:"clamp(200px,30vw,500px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,140,0,0.12) 0%, transparent 70%)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"-10%", right:"-5%", width:"clamp(200px,30vw,500px)", height:"clamp(200px,30vw,500px)", borderRadius:"50%", background:"radial-gradient(circle, rgba(77,144,254,0.15) 0%, transparent 70%)", pointerEvents:"none" }} />

        {/* === MAIN CONTENT STACK === */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"clamp(12px, 2vh, 32px)", position:"relative", zIndex:10, width:"100%", padding:"0 clamp(16px,4vw,60px)" }}>

          {/* LOGO - fades in after letters assemble */}
          <div style={{
            transition: "opacity 0.8s ease, transform 0.8s ease",
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.9)",
            display: "flex", flexDirection: "column", alignItems: "center"
          }}>
            <Image
              src="/adithyatech-emblem.png"
              alt="AdithyaTech Logo"
              width={160}
              height={160}
              priority
              quality={100}
              style={{
                width: "clamp(60px, 10vw, 130px)",
                height: "auto",
                filter: "drop-shadow(0 0 20px rgba(77,144,254,0.6)) drop-shadow(0 0 40px rgba(255,140,0,0.3))",
              }}
            />
          </div>

          {/* 3D BOX */}
          {boxVisible && (
            <div style={{
              perspective: "600px",
              perspectiveOrigin: "50% 50%",
              transition: "opacity 0.6s ease",
              opacity: phase === "letters" ? 0 : 1,
              pointerEvents: "none",
            }}>
              <div style={{
                width: "clamp(80px,12vw,160px)",
                height: "clamp(80px,12vw,160px)",
                position: "relative",
                transformStyle: "preserve-3d",
                animation: phase === "opening" ? "boxFloat 2s ease infinite alternate" : undefined,
              }}>
                {/* Box faces */}
                {[
                  { face: "front",  transform: `translateZ(clamp(40px,6vw,80px))` },
                  { face: "back",   transform: `rotateY(180deg) translateZ(clamp(40px,6vw,80px))` },
                  { face: "left",   transform: `rotateY(-90deg) translateZ(clamp(40px,6vw,80px))` },
                  { face: "right",  transform: `rotateY(90deg) translateZ(clamp(40px,6vw,80px))` },
                  { face: "bottom", transform: `rotateX(-90deg) translateZ(clamp(40px,6vw,80px))` },
                ].map(({ face, transform }) => (
                  <div key={face} style={{
                    position: "absolute",
                    width: "100%", height: "100%",
                    transform,
                    background: "linear-gradient(135deg, rgba(10,25,51,0.9) 0%, rgba(5,15,35,0.95) 100%)",
                    border: "1px solid rgba(77,144,254,0.4)",
                    boxShadow: "inset 0 0 20px rgba(77,144,254,0.08), 0 0 15px rgba(77,144,254,0.2)",
                    backfaceVisibility: "hidden",
                  }}>
                    {/* Circuit lines on face */}
                    <div style={{ position:"absolute", inset:4, border:"1px solid rgba(77,144,254,0.15)", borderRadius:2, background:"linear-gradient(135deg, rgba(77,144,254,0.03) 0%, rgba(255,140,0,0.02) 100%)" }} />
                  </div>
                ))}

                {/* Lid (top face) – rotates open */}
                <div style={{
                  position: "absolute",
                  width: "100%", height: "100%",
                  transform: phase === "opening"
                    ? `rotateX(90deg) translateZ(clamp(40px,6vw,80px)) rotateX(-140deg)`
                    : `rotateX(90deg) translateZ(clamp(40px,6vw,80px))`,
                  background: "linear-gradient(135deg, rgba(15,35,70,0.95) 0%, rgba(10,25,55,0.98) 100%)",
                  border: "1px solid rgba(77,144,254,0.6)",
                  boxShadow: "0 0 30px rgba(77,144,254,0.4), inset 0 0 20px rgba(77,144,254,0.1), 0 -5px 25px rgba(255,140,0,0.15)",
                  backfaceVisibility: "hidden",
                  transformOrigin: "bottom center",
                  transition: "transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}>
                  <div style={{ position:"absolute", inset:4, border:"1px solid rgba(77,144,254,0.25)", borderRadius:2 }} />
                  {/* AdithyaTech emblem on lid */}
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(18px,3vw,36px)", color:"rgba(77,144,254,0.7)", fontWeight:900, letterSpacing:2, textShadow:"0 0 10px rgba(77,144,254,0.8)" }}>AT</div>
                </div>

                {/* Neon edge glow lines */}
                {["top","right","bottom","left"].map(edge => (
                  <div key={edge} style={{
                    position:"absolute",
                    background: edge === "top" || edge === "bottom"
                      ? "linear-gradient(90deg, transparent, rgba(255,140,0,0.8), transparent)"
                      : "linear-gradient(180deg, transparent, rgba(77,144,254,0.8), transparent)",
                    ...(edge === "top"    ? { top:0,    left:0, right:0, height:"1px" } : {}),
                    ...(edge === "bottom" ? { bottom:0, left:0, right:0, height:"1px" } : {}),
                    ...(edge === "left"   ? { left:0,  top:0, bottom:0, width:"1px" }  : {}),
                    ...(edge === "right"  ? { right:0, top:0, bottom:0, width:"1px" }  : {}),
                    boxShadow: edge === "top" || edge === "bottom"
                      ? "0 0 8px rgba(255,140,0,0.6)"
                      : "0 0 8px rgba(77,144,254,0.6)",
                    animation: "neonPulse 2s ease-in-out infinite alternate",
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* BRAND NAME – letters assemble */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "nowrap",
            gap: "clamp(0px, 0.3vw, 4px)",
            height: "clamp(40px,8vw,100px)",
            position: "relative",
          }}>
            {BRAND_NAME.map((char, i) => (
              <span
                key={i}
                aria-hidden={i > 0}
                style={{
                  display: "inline-block",
                  fontSize: "clamp(20px, 4.5vw, 68px)",
                  fontWeight: 900,
                  letterSpacing: "clamp(1px, 0.4vw, 6px)",
                  fontFamily: "'Inter', 'SF Pro Display', sans-serif",
                  color: char === "." ? "rgba(255,200,80,0.95)" : "white",
                  textShadow: pulseActive
                    ? `0 0 20px rgba(77,144,254,0.9), 0 0 40px rgba(77,144,254,0.5), 0 0 60px rgba(255,140,0,0.3)`
                    : "0 0 10px rgba(77,144,254,0.4)",
                  transition: `opacity 0.5s ease ${i * 0.05}s, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s, text-shadow 0.6s ease ${i * 0.04}s`,
                  opacity: lettersVisible ? 1 : 0,
                  transform: lettersVisible
                    ? "translateY(0) scale(1) rotateX(0deg)"
                    : `translateY(clamp(-80px,-15vh,-40px)) scale(0.3) rotateX(90deg)`,
                  willChange: "transform, opacity",
                  lineHeight: 1,
                  filter: pulseActive ? undefined : "blur(0px)",
                  WebkitFontSmoothing: "antialiased",
                }}
              >
                {char}
              </span>
            ))}
          </div>

          {/* TAGLINE */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "clamp(8px, 1.5vw, 20px)",
            transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? "translateY(0)" : "translateY(12px)",
          }}>
            {["SMART", "SECURE", "SCALABLE"].map((word, i) => (
              <span key={word} style={{ display:"flex", alignItems:"center", gap:"clamp(8px, 1.5vw, 20px)" }}>
                <span style={{
                  fontSize: "clamp(9px, 1.2vw, 15px)",
                  fontWeight: 700,
                  letterSpacing: "clamp(2px, 0.5vw, 6px)",
                  color: i === 0 ? "#ff8c00" : i === 1 ? "#4d90fe" : "#e040fb",
                  textShadow: i === 0 ? "0 0 12px rgba(255,140,0,0.6)" : i === 1 ? "0 0 12px rgba(77,144,254,0.6)" : "0 0 12px rgba(224,64,251,0.6)",
                }}>
                  {word}
                </span>
                {i < 2 && <span style={{ color:"rgba(255,255,255,0.25)", fontSize:"clamp(10px,1.5vw,18px)" }}>•</span>}
              </span>
            ))}
          </div>

          {/* ENTER WAREHOUSE BUTTON */}
          <div style={{
            marginTop: "clamp(8px,1.5vh,20px)",
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
            pointerEvents: buttonVisible ? "auto" : "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(12px, 2vh, 24px)",
          }}>
            <button
              onClick={handleEnter}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "clamp(8px, 1vw, 16px)",
                padding: "clamp(12px,1.5vh,18px) clamp(24px,3vw,48px)",
                background: "linear-gradient(135deg, rgba(10,25,51,0.9) 0%, rgba(5,15,35,0.95) 100%)",
                border: "1px solid rgba(77,144,254,0.6)",
                borderRadius: "clamp(30px,5vw,60px)",
                color: "white",
                fontSize: "clamp(11px,1.2vw,15px)",
                fontWeight: 900,
                letterSpacing: "clamp(2px,0.4vw,5px)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 0 30px -5px rgba(77,144,254,0.5), 0 0 60px -10px rgba(77,144,254,0.3)",
                backdropFilter: "blur(10px)",
                overflow: "hidden",
                transition: "transform 0.2s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 50px -5px rgba(77,144,254,0.8), 0 0 80px -10px rgba(77,144,254,0.4)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px -5px rgba(77,144,254,0.5), 0 0 60px -10px rgba(77,144,254,0.3)";
              }}
              onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"}
              onMouseUp={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)"}
              aria-label="Enter Warehouse"
            >
              {/* Shimmer sweep on hover */}
              <div style={{
                position:"absolute", inset:0,
                background:"linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
                transform:"translateX(-100%)",
                animation:"shimmer 2.5s ease infinite",
              }} />
              <span style={{ position:"relative", zIndex:1, textShadow:"0 0 10px rgba(255,255,255,0.5)" }}>ENTER WAREHOUSE</span>
              <span style={{ position:"relative", zIndex:1, fontSize:"clamp(14px,1.5vw,18px)", textShadow:"0 0 10px rgba(77,144,254,0.8)" }}>→</span>
            </button>
          </div>

          {/* LOADING STATE */}
          <div style={{
            marginTop: "clamp(8px,1.5vh,20px)",
            transition: "opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s",
            opacity: loadingVisible ? 1 : 0,
            transform: loadingVisible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.9)",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(10px, 1.5vh, 20px)",
            width: "clamp(160px, 25vw, 280px)",
          }}>
            <div style={{
              color: "#4d90fe",
              fontWeight: 700,
              letterSpacing: "clamp(2px,0.5vw,6px)",
              textTransform: "uppercase",
              fontSize: "clamp(10px,1vw,13px)",
              animation: "pulseOpacity 1.5s ease-in-out infinite",
              textShadow: "0 0 10px rgba(77,144,254,0.8)",
            }}>
              Loading
            </div>
            <div style={{ display:"flex", gap:"clamp(6px,0.8vw,10px)" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  width: "clamp(6px,0.8vw,10px)",
                  height: "clamp(6px,0.8vw,10px)",
                  borderRadius: "50%",
                  background: "#4d90fe",
                  boxShadow: "0 0 12px rgba(77,144,254,1)",
                  animation: "dotBounce 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
            <div style={{ width:"100%", height:"2px", background:"rgba(77,144,254,0.15)", borderRadius:"2px", overflow:"hidden", position:"relative" }}>
              <div key={progressKey} style={{
                position:"absolute", top:0, left:0, height:"100%",
                background:"linear-gradient(90deg, #4d90fe, #60a5fa)",
                boxShadow:"0 0 12px rgba(77,144,254,1)",
                borderRadius:"2px",
                animation:"progressBar 3s ease-in-out forwards",
              }} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          position:"absolute", bottom:"clamp(12px,2vh,24px)",
          color:"rgba(255,255,255,0.2)",
          fontSize:"clamp(8px,0.7vw,11px)",
          letterSpacing:"clamp(2px,0.5vw,6px)",
          fontWeight:700,
          textTransform:"uppercase",
          transition:"opacity 1s ease",
          opacity: logoVisible ? 1 : 0,
        }}>
          © 2026 ADITHYATECH • Global Warehouse Network
        </div>
      </div>

      {/* All required keyframe animations */}
      <style>{`
        @keyframes boxFloat {
          from { transform: rotateY(-5deg) rotateX(3deg) translateY(0px); }
          to   { transform: rotateY(5deg) rotateX(-3deg) translateY(-8px); }
        }
        @keyframes neonPulse {
          from { opacity: 0.5; }
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
