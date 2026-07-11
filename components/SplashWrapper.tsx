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

  // Hide splash after successful authentication
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

  // Enter Warehouse button handler
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
          zIndex: 9999,
          backgroundColor: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          opacity: fadeOut ? 0 : 1,
          transition: "opacity 0.7s ease",
          pointerEvents: fadeOut ? "none" : "auto",
        }}
      >
        {/* EXACT IMAGE CONTAINER */}
        <div
          style={{
            position: "relative",

            width: "min(100vw, calc(100dvh * 1672 / 941))",

            aspectRatio: "1672 / 941",

            flexShrink: 0,
          }}
        >
          {/* EXACT ORIGINAL IMAGE — NO CSS MODIFICATION */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/AI-wide-enhanced.jpg"
            alt="ADITHYATECH.IN"
            draggable={false}
            decoding="sync"
            style={{
              position: "absolute",
              inset: 0,

              width: "100%",
              height: "100%",

              display: "block",

              objectFit: "contain",
              objectPosition: "center",

              pointerEvents: "none",
              userSelect: "none",
            }}
          />

          {/* TRANSPARENT ENTER WAREHOUSE HOTSPOT */}
          <div
            onClick={handleEnter}
            role="button"
            tabIndex={0}
            aria-label="Enter Warehouse"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                event.preventDefault();
                handleEnter();
              }
            }}
            style={{
              position: "absolute",

              left: "50%",
              top: "68.7%",

              width: "21.5%",
              height: "7.2%",

              transform: "translate(-50%, -50%)",

              cursor: isLoading
                ? "wait"
                : "pointer",

              zIndex: 10,

              background: "transparent",
              border: "none",

              WebkitTapHighlightColor: "transparent",

              // DEBUG ONLY:
              // outline: "2px solid red",
            }}
          />

          {/* SIGNING IN STATUS */}
          {isLoading && (
            <p
              style={{
                position: "absolute",

                left: "50%",
                top: "75%",

                margin: 0,

                transform: "translate(-50%, -50%)",

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
                  "0 0 10px rgba(15, 210, 245, 0.8)",

                whiteSpace: "nowrap",

                zIndex: 11,

                pointerEvents: "none",
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