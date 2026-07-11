"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type Phase = "idle" | "ready" | "loading" | "exit";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash]       = useState(true);
  const [isMounted, setIsMounted]         = useState(false);
  const [phase, setPhase]                 = useState<Phase>("idle");
  const [isLoading, setIsLoading]         = useState(false);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) { setShowSplash(false); return; }
    setIsMounted(true);
    setPhase("ready");
    
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleEnter = () => {
    if (isLoading) return;
    setIsLoading(true);
    setPhase("loading");
    addTimer(() => {
      setPhase("exit");
      addTimer(() => {
        setShowSplash(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 1000);
    }, 2500);
  };

  if (!showSplash && !isMounted) return <>{children}</>;
  if (!showSplash) return <div style={{ animation: "splashFadeIn 1s ease forwards" }}>{children}</div>;

  return (
    <>
      <div style={{ opacity: phase === "exit" ? 1 : 0, height: phase === "exit" ? "auto" : 0, overflow:"hidden", transition:"opacity 1s ease" }}>
        {children}
      </div>

      <div style={{
        position:"fixed", inset:0, zIndex:100,
        width:"100vw", height:"100dvh", overflow:"hidden",
        backgroundColor: "#000000",
        opacity: phase === "exit" ? 0 : 1,
        transition:"opacity 1s ease",
        pointerEvents: phase === "exit" ? "none" : "auto",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        
        {/* Aspect Ratio Constraint Container - perfectly tracks 16:9 image size */}
        <div style={{
          position: "relative",
          width: "100%",
          height: "100%",
          maxWidth: "calc(100dvh * (1024 / 576))",
          maxHeight: "calc(100vw * (576 / 1024))",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          
          {/* Unoptimized prevents blurriness from Next.js compression */}
          <Image 
            src="/AI-wide.jpg"
            alt="AdithyaTech Landing"
            fill
            priority
            unoptimized
            style={{ objectFit: "contain", objectPosition: "center center" }}
          />

          {/* Transparent Clickable Hotspot */}
          <div 
            onClick={handleEnter}
            style={{
              position: "absolute",
              left: "50%",
              top: "80%", // Centered vertically over the button
              width: "40%", // Wide enough to catch clicks easily
              height: "15%", // Tall enough to catch clicks easily
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              zIndex: 10,
              // backgroundColor: "rgba(255,0,0,0)", // Set to rgba(255,0,0,0.3) for debugging
            }}
            aria-label="Enter Warehouse"
            title="Enter Warehouse"
          />

          {/* LOADING STATE */}
          {isLoading && (
            <div style={{
              position: "absolute",
              left: "50%",
              top: "90%",
              transform: "translate(-50%, -50%)",
              color: "#079FEA", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", 
              fontSize: "clamp(10px, 1.2vmax, 16px)", fontFamily: "'Orbitron','Inter',sans-serif",
              animation: "pulseOpacity 1.5s ease-in-out infinite"
            }}>
              Authenticating...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes splashFadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes pulseOpacity {
          0%,100% { opacity:0.4; }
          50%     { opacity:1; }
        }
      `}</style>
    </>
  );
}
