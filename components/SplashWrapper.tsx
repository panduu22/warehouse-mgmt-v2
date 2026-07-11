"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading]   = useState(false);
  const [isExiting, setIsExiting]   = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { data: session, status } = useSession();
  const router = useRouter();

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  };

  useEffect(() => {
    // If already authenticated, skip splash and go to dashboard
    if (status === "authenticated" && session) {
      setShowSplash(false);
    }
    return () => { timersRef.current.forEach(clearTimeout); };
  }, [status, session]);

  const handleEnter = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // Kick off Google OAuth immediately
    signIn("google", { callbackUrl: "/", prompt: "select_account" });
  };

  // Once session is confirmed after OAuth redirect, fade out splash
  useEffect(() => {
    if (status === "authenticated" && isLoading) {
      setIsExiting(true);
      addTimer(() => setShowSplash(false), 800);
    }
  }, [status, isLoading]);

  if (!showSplash) return <>{children}</>;

  // The image is 1024×576 (≈16:9). The ENTER WAREHOUSE button is
  // centered horizontally and sits at ~79% vertically in the image.
  // Width of button area ≈ 36% of image width, height ≈ 10%.

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          width: "100vw", height: "100dvh",
          backgroundColor: "#000",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: isExiting ? 0 : 1,
          transition: "opacity 0.8s ease",
          pointerEvents: isExiting ? "none" : "auto",
        }}
      >
        {/*
          Constraint container.
          CSS trick: constrain by BOTH axes so the box always exactly fits the 16:9 image.
            - maxWidth  = what the width would be if height fills the screen
            - maxHeight = what the height would be if width fills the screen
          The smaller constraint wins, giving pixel-perfect containment without JS.
        */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            /* 1024/576 ≈ 1.7778 */
            maxWidth:  "calc(100dvh * 1.7778)",
            maxHeight: "calc(100vw  * 0.5625)",
          }}
        >
          {/* The full cinematic image — unoptimized for maximum sharpness */}
          <Image
            src="/AI-wide.jpg"
            alt="AdithyaTech Warehouse"
            fill
            priority
            unoptimized
            style={{ objectFit: "fill" }}   /* fills the constrained box exactly */
          />

          {/* ── Transparent ENTER WAREHOUSE hotspot ──
              Coordinates relative to the constrained image box:
                left centre:  50%
                vertical:     ~79% down
                width:        ~37% of image
                height:       ~11% of image
          */}
          <div
            onClick={handleEnter}
            style={{
              position: "absolute",
              left:      "50%",
              top:       "79%",
              width:     "37%",
              height:    "11%",
              transform: "translate(-50%, -50%)",
              cursor:    isLoading ? "wait" : "pointer",
              zIndex:    10,
              // Uncomment next line to debug the hotspot area:
              // background: "rgba(255,0,0,0.35)",
              borderRadius: "999px",
            }}
            aria-label="Enter Warehouse"
            title="Enter Warehouse"
          />

          {/* Loading indicator — shows inside the image area while OAuth loads */}
          {isLoading && (
            <div
              style={{
                position: "absolute",
                left: "50%",
                top:  "88%",
                transform: "translate(-50%, -50%)",
                color: "#0FD2F5",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontSize: "clamp(9px, 1.1vmax, 14px)",
                fontFamily: "'Orbitron', 'Inter', sans-serif",
                animation: "atPulse 1.2s ease-in-out infinite",
                textShadow: "0 0 12px rgba(15,210,245,0.8)",
              }}
            >
              Connecting...
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes atPulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 1;    }
        }
      `}</style>
    </>
  );
}
