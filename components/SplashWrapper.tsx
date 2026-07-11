"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading]   = useState(false);
  const [fadeOut, setFadeOut]       = useState(false);
  const hasTriggeredFade            = useRef(false);

  // ── Hide splash once authenticated ──────────────────────────────────────
  useEffect(() => {
    if (status === "authenticated" && !hasTriggeredFade.current) {
      hasTriggeredFade.current = true;
      setFadeOut(true);
      const t = setTimeout(() => setShowSplash(false), 700);
      return () => clearTimeout(t);
    }
  }, [status]);

  // ── Click handler ────────────────────────────────────────────────────────
  const handleEnter = () => {
    if (isLoading || status === "loading") return;
    setIsLoading(true);
    // Direct NextAuth Google OAuth — identical to what the /login page does
    signIn("google", { callbackUrl: "/", prompt: "select_account" });
  };

  if (!showSplash) return <>{children}</>;

  return (
    <>
      {/* ── Fullscreen black overlay ─────────────────────────────────────── */}
      <div
        style={{
          position:   "fixed",
          inset:      0,
          zIndex:     9999,
          background: "#000",
          display:    "flex",
          alignItems:  "center",
          justifyContent: "center",
          opacity:        fadeOut ? 0 : 1,
          transition:     "opacity 0.7s ease",
          pointerEvents:  fadeOut ? "none" : "auto",
        }}
      >
        {/*
          ── Aspect-ratio constraint box ──────────────────────────────────
          Source image: 1024 × 576  (16:9 = 1.7778)
          CSS trick: both max-width and max-height are set to the 16:9 boundary.
          The SMALLER constraint always wins → the box perfectly tracks the image
          on any viewport without JS.
        */}
        <div
          style={{
            position:  "relative",
            width:     "100%",
            height:    "100%",
            maxWidth:  "calc(100dvh * 1.7778)",
            maxHeight: "calc(100vw  * 0.5625)",
          }}
        >
          {/*
            ── Background image ─────────────────────────────────────────
            Use CSS background-image, NOT <img> or Next/Image.
            Browsers apply the same high-quality interpolation pipeline used for
            photos in CSS — typically a Lanczos or Mitchell kernel on Chrome/Safari.
            Serving the @2x version via image-set() makes it crisp on Retina.
          */}
          <div
            style={{
              position:        "absolute",
              inset:           0,
              backgroundImage: `image-set(
                url('/AI-wide@2x.jpg') 2x,
                url('/AI-wide.jpg')    1x
              )`,
              backgroundSize:     "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat:   "no-repeat",
              // Slight contrast & saturation boost to fight JPEG softness
              filter:  "contrast(1.04) saturate(1.06)",
              // Force GPU layer → crispest compositing
              transform:   "translateZ(0)",
              willChange:  "transform",
              pointerEvents: "none", // clicks fall through to the hotspot below
            }}
          />

          {/*
            ── ENTER WAREHOUSE transparent hotspot ───────────────────────
            Measured from the 1024×576 source image:
              Button horizontal centre: ~512 px → 50.0 %
              Button vertical centre:   ~443 px → 76.9 %
              Button width:             ~350 px → 34.2 %
              Button height:            ~55  px →  9.5 %

            We add ±2 % padding on each side so slight misalignment
            on different screen sizes is forgiven.
          */}
          <div
            onClick={handleEnter}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleEnter(); }}
            style={{
              position:  "absolute",
              left:      "50%",
              top:       "77%",
              width:     "38%",
              height:    "13%",
              transform: "translate(-50%, -50%)",
              cursor:    isLoading ? "wait" : "pointer",
              zIndex:    10,
              // ↓ Uncomment to debug the hotspot boundary:
              // outline: "2px solid red",
            }}
            aria-label="Enter Warehouse"
          />

          {/* ── "Signing in…" text beneath the button while OAuth loads ── */}
          {isLoading && (
            <p
              style={{
                position:      "absolute",
                left:          "50%",
                top:           "87%",
                margin:        0,
                transform:     "translate(-50%, -50%)",
                color:         "#0FD2F5",
                fontWeight:    700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontSize:      "clamp(9px, 1.1vmax, 13px)",
                fontFamily:    "'Orbitron', 'Inter', sans-serif",
                animation:     "atPulse 1.1s ease-in-out infinite",
                textShadow:    "0 0 10px rgba(15,210,245,0.8)",
              }}
            >
              Signing in…
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes atPulse {
          0%, 100% { opacity: 0.25; }
          50%       { opacity: 1;    }
        }
      `}</style>
    </>
  );
}
