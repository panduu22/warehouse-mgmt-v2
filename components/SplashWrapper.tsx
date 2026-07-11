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
    }, 2500); // Simulate loading transition
  };

  if (!showSplash && !isMounted) return <>{children}</>;
  if (!showSplash) return <div style={{ animation: "splashFadeIn 1s ease forwards" }}>{children}</div>;

  return (
    <>
      {/* Hidden pre-render of children */}
      <div style={{ opacity: phase === "exit" ? 1 : 0, height: phase === "exit" ? "auto" : 0, overflow:"hidden", transition:"opacity 1s ease" }}>
        {children}
      </div>

      <div style={{
        position:"fixed", inset:0, zIndex:100,
        width:"100vw", height:"100dvh", overflow:"hidden",
        backgroundColor: "#020509",
        opacity: phase === "exit" ? 0 : 1,
        transition:"opacity 1s ease",
        pointerEvents: phase === "exit" ? "none" : "auto",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        {/* Full screen background image exactly replacing the old visuals */}
        <Image 
          src="/AI.png"
          alt="AdithyaTech Landing"
          fill
          priority
          quality={100}
          style={{ objectFit: "cover", objectPosition: "center" }}
        />

        {/* 
          Transparent Clickable Hotspot for ENTER WAREHOUSE 
          Image aspect is 1:1 (1024x1024), it scales to max(vw, vh). 
          The button is centered horizontally, and roughly 72.5% down from top. 
          Center is 50%. Distance from center is ~22.5% of the image size (which is vmax).
        */}
        <div 
          onClick={handleEnter}
          style={{
            position: "absolute",
            top: "calc(50dvh + 22.5vmax)", // 22.5% below center
            left: "50vw",
            transform: "translate(-50%, -50%)",
            width: "35vmax",
            height: "8vmax",
            cursor: "pointer",
            zIndex: 10,
            // backgroundColor: "rgba(255, 0, 0, 0.0)", // Set to 0 so it's transparent, change to 0.3 to debug
            borderRadius: "4vmax",
          }}
          aria-label="Enter Warehouse"
          title="Enter Warehouse"
        />

        {/* LOADING STATE */}
        {isLoading && (
          <div style={{
            position: "absolute",
            top: "calc(50dvh + 32vmax)",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#079FEA", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", 
            fontSize: "clamp(10px, 1.2vmax, 16px)", fontFamily: "'Orbitron','Inter',sans-serif",
            animation: "pulseOpacity 1.5s ease-in-out infinite"
          }}>
            Authenticating...
          </div>
        )}
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
