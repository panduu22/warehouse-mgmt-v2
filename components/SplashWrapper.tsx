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
  
  // State to hold the calculated dimensions of the object-fit: contain image
  const [imgBounds, setImgBounds] = useState({ width: 0, height: 0, left: 0, top: 0 });

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  // Calculate the actual rendered dimensions of the image on the screen
  const calculateBounds = () => {
    const vWidth = window.innerWidth;
    const vHeight = window.innerHeight;
    
    // Original image aspect ratio for AI.png (1024x1024 = 1)
    const imageAspect = 1; 
    const viewportAspect = vWidth / vHeight;

    let renderedWidth, renderedHeight;

    // object-fit: contain logic
    if (viewportAspect > imageAspect) {
      // Screen is wider than the image's aspect ratio.
      // Image height will fill the screen, width will be scaled proportionally.
      renderedHeight = vHeight;
      renderedWidth = renderedHeight * imageAspect;
    } else {
      // Screen is taller than the image's aspect ratio.
      // Image width will fill the screen, height will be scaled proportionally.
      renderedWidth = vWidth;
      renderedHeight = renderedWidth / imageAspect;
    }

    // Because object-position is center center, the image is centered in the viewport.
    const left = (vWidth - renderedWidth) / 2;
    const top = (vHeight - renderedHeight) / 2;

    setImgBounds({ width: renderedWidth, height: renderedHeight, left, top });
  };

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) { setShowSplash(false); return; }
    setIsMounted(true);
    setPhase("ready");
    
    calculateBounds();
    window.addEventListener("resize", calculateBounds);

    return () => {
      window.removeEventListener("resize", calculateBounds);
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

  // The coordinates of the ENTER WAREHOUSE button inside the original AI.png image
  // Estimated as percentages based on the visual layout
  const BUTTON_X_PERCENT = 0.50; // Centered horizontally
  const BUTTON_Y_PERCENT = 0.725; // ~72.5% down from the top edge
  const BUTTON_WIDTH_PERCENT = 0.35; // ~35% of the image width
  const BUTTON_HEIGHT_PERCENT = 0.08; // ~8% of the image height

  return (
    <>
      {/* Hidden pre-render of children */}
      <div style={{ opacity: phase === "exit" ? 1 : 0, height: phase === "exit" ? "auto" : 0, overflow:"hidden", transition:"opacity 1s ease" }}>
        {children}
      </div>

      <div style={{
        position:"fixed", inset:0, zIndex:100,
        width:"100vw", height:"100dvh", overflow:"hidden",
        backgroundColor: "#000000",
        opacity: phase === "exit" ? 0 : 1,
        transition:"opacity 1s ease",
        pointerEvents: phase === "exit" ? "none" : "auto"
      }}>
        {/* 
          Full screen background image with object-fit: contain 
          This ensures the COMPLETE image is visible without zooming or cropping 
        */}
        <Image 
          src="/AI.png"
          alt="AdithyaTech Landing"
          fill
          priority
          quality={100}
          style={{ objectFit: "contain", objectPosition: "center center" }}
        />

        {/* 
          Transparent Clickable Hotspot for ENTER WAREHOUSE
          Calculated relative to the actual rendered image dimensions on screen
        */}
        {imgBounds.width > 0 && (
          <div 
            onClick={handleEnter}
            style={{
              position: "absolute",
              left: imgBounds.left + (imgBounds.width * BUTTON_X_PERCENT),
              top: imgBounds.top + (imgBounds.height * BUTTON_Y_PERCENT),
              width: imgBounds.width * BUTTON_WIDTH_PERCENT,
              height: imgBounds.height * BUTTON_HEIGHT_PERCENT,
              transform: "translate(-50%, -50%)",
              cursor: "pointer",
              zIndex: 10,
              // backgroundColor: "rgba(255, 0, 0, 0.0)", // Keep completely transparent
              borderRadius: "4vmax",
            }}
            aria-label="Enter Warehouse"
            title="Enter Warehouse"
          />
        )}

        {/* LOADING STATE - positioned strictly below the hotspot */}
        {isLoading && imgBounds.width > 0 && (
          <div style={{
            position: "absolute",
            left: imgBounds.left + (imgBounds.width * 0.5),
            top: imgBounds.top + (imgBounds.height * 0.82), // Below the button
            transform: "translate(-50%, -50%)",
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
