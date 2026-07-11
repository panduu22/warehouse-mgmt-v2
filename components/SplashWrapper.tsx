"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";

export default function SplashWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();

  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const hasTriggeredFade = useRef(false);

  useEffect(() => {
    if (
      status === "authenticated" &&
      !hasTriggeredFade.current
    ) {
      hasTriggeredFade.current = true;

      setFadeOut(true);

      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleEnter = () => {
    if (isLoading || status === "loading") {
      return;
    }

    setIsLoading(true);

    signIn("google", {
      callbackUrl: "/",
      prompt: "select_account",
    });
  };

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 9999,
          background: "#000000",
          overflow: "hidden",
          opacity: fadeOut ? 0 : 1,
          transition: "opacity 0.7s ease",
          pointerEvents: fadeOut ? "none" : "auto",
        }}
      >
        {/* EXACT 16:9 IMAGE STAGE */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",

            width: "100vw",
            height: "56.25vw",

            maxWidth: "177.777778dvh",
            maxHeight: "100dvh",

            transform: "translate(-50%, -50%)",

            overflow: "hidden",
          }}
        >
          {/* EXACT ORIGINAL IMAGE */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/AI-wide-perfect.png"
            alt=""
            draggable={false}
            decoding="sync"
            loading="eager"
            fetchPriority="high"
            style={{
              position: "absolute",
              inset: 0,

              width: "100%",
              height: "100%",

              display: "block",

              objectFit: "contain",
              objectPosition: "50% 50%",

              pointerEvents: "none",
              userSelect: "none",

              WebkitUserDrag: "none",
            }}
          />

          {/* INVISIBLE ENTER WAREHOUSE HOTSPOT */}
          <button
            type="button"
            onClick={handleEnter}
            disabled={
              isLoading ||
              status === "loading"
            }
            aria-label="Enter Warehouse"
            style={{
              position: "absolute",

              left: "50%",
              top: "68.7%",

              width: "21.5%",
              height: "7.2%",

              transform: "translate(-50%, -50%)",

              padding: 0,
              margin: 0,

              border: 0,
              outline: 0,

              background: "transparent",

              cursor: isLoading
                ? "wait"
                : "pointer",

              zIndex: 10,

              WebkitTapHighlightColor:
                "transparent",
            }}
          />

          {/* SIGNING IN STATUS */}
          {isLoading && (
            <p
              style={{
                position: "absolute",

                left: "50%",
                top: "75%",

                transform:
                  "translate(-50%, -50%)",

                margin: 0,

                color: "#0FD2F5",

                fontWeight: 700,

                letterSpacing: "0.18em",

                textTransform: "uppercase",

                fontSize:
                  "clamp(9px, 0.75vw, 13px)",

                fontFamily:
                  "'Orbitron', 'Inter', sans-serif",

                animation:
                  "atPulse 1.1s ease-in-out infinite",

                textShadow:
                  "0 0 10px rgba(15, 210,245,0.8)",

                whiteSpace: "nowrap",

                pointerEvents: "none",

                zIndex: 11,
              }}
            >
              Signing in…
            </p>
          )}
        </div>
      </div>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
        }

        @keyframes atPulse {
          0%,
          100% {
            opacity: 0.25;
          }

          50% {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}