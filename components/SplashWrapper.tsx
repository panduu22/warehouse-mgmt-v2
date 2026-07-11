"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading]   = useState(false);
  const [isExiting, setIsExiting]   = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    return () => { timersRef.current.forEach(clearTimeout); };
  }, []);

  // If the user is already authenticated (e.g. after OAuth callback returns),
  // fade out the splash and reveal the app.
  useEffect(() => {
    if (status === "authenticated") {
      setIsExiting(true);
      addTimer(() => setShowSplash(false), 800);
    }
  }, [status]);

  // If the session has already been checked and user is not logged in, show splash.
  // If session check is still loading ("loading" status), keep splash visible.

  const handleEnter = () => {
    if (isLoading) return;
    setIsLoading(true);
    // Direct Google OAuth — the page will redirect to Google and come back authenticated.
    signIn("google", { callbackUrl: "/" });
  };

  if (!showSplash) return <>{children}</>;

  return (
    <>
      {/* ── Fullscreen overlay ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: isExiting ? 0 : 1,
          transition: "opacity 0.8s ease",
          pointerEvents: isExiting ? "none" : "auto",
        }}
      >
        {/*
          Aspect-ratio constraint box.
          Image is 1024×576 = 16:9 (ratio = 1.7778).
          CSS trick — the smaller of the two max constraints wins,
          so the box perfectly tracks the image proportions on ANY screen size.
        */}
        <div
          style={{
            position: "relative",
            /* fill the viewport up to the 16:9 boundary */
            width: "100%",
            height: "100%",
            maxWidth:  "calc(100dvh * 1.7778)",
            maxHeight: "calc(100vw  * 0.5625)",
          }}
        >
          {/*
            Use a plain <img> tag — skips ALL Next.js image processing,
            so no resampling blur is added by the server.
            image-rendering: high-quality tells the GPU to use bicubic upscaling.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/AI-wide.jpg"
            alt="AdithyaTech Warehouse"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "fill",
              imageRendering: "high-quality" as any,
              // Force GPU compositing for crispest upscale on Retina
              transform: "translateZ(0)",
              willChange: "transform",
            }}
          />

          {/*
            ── Transparent ENTER WAREHOUSE hotspot ──
            All coordinates are percentages of the *constrained image box*,
            which exactly matches the image pixels.

            In the 1024×576 source image:
              Button centre X ≈ 512 → 50.0%
              Button centre Y ≈ 443 → 76.9%
              Button width   ≈ 350 → 34.2%
              Button height  ≈  56 →  9.7%
          */}
          <div
            onClick={handleEnter}
            style={{
              position: "absolute",
              left:      "50%",
              top:       "77%",
              width:     "35%",
              height:    "10%",
              transform: "translate(-50%, -50%)",
              cursor:    isLoading ? "wait" : "pointer",
              zIndex:    10,
              // Debug: set to "rgba(255,0,0,0.4)" to see the hotspot
              background: "transparent",
              borderRadius: "999px",
            }}
            aria-label="Enter Warehouse"
            title="Enter Warehouse"
          />

          {/* "Signing in…" indicator while OAuth redirects */}
          {isLoading && (
            <p
              style={{
                position: "absolute",
                left: "50%",
                top:  "88%",
                margin: 0,
                transform: "translate(-50%, -50%)",
                color: "#0FD2F5",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontSize: "clamp(9px, 1.1vmax, 14px)",
                fontFamily: "'Orbitron', 'Inter', sans-serif",
                animation: "atPulse 1.2s ease-in-out infinite",
                textShadow: "0 0 12px rgba(15,210,245,0.8)",
              }}
            >
              Signing in…
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes atPulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;   }
        }
      `}</style>
    </>
  );
}
