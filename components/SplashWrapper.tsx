"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

// Every character is its own DOM element, driven by state
const CHARS = ['A','D','I','T','H','Y','A','T','E','C','H','.','I','N'] as const;
const CHAR_DELAY_MS   = 220;
const BOX_SHOW_AT_MS  = 100;
const LOGO_PULSE_AT_MS = 950;
const BOX_OPEN_AT_MS  = 1350;
const FIRST_CHAR_AT_MS = 2150;

type Phase =
  | "idle"
  | "box"
  | "logoPulse"
  | "opening"
  | "throwing"
  | "pulse"
  | "reveal"
  | "ready"
  | "loading"
  | "exit";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash]       = useState(true);
  const [isMounted, setIsMounted]         = useState(false);
  const [phase, setPhase]                 = useState<Phase>("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const [isLoading, setIsLoading]         = useState(false);
  const [progressKey, setProgressKey]     = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef   = useRef<ReturnType<typeof setTimeout>[]>([]);

  const addTimer = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) { setShowSplash(false); return; }
    setIsMounted(true);

    addTimer(() => setPhase("box"),       BOX_SHOW_AT_MS);
    addTimer(() => setPhase("logoPulse"), LOGO_PULSE_AT_MS);
    addTimer(() => setPhase("opening"),   BOX_OPEN_AT_MS);

    addTimer(() => {
      setPhase("throwing");
      let count = 0;
      intervalRef.current = setInterval(() => {
        count++;
        setRevealedCount(count);
        if (count >= CHARS.length) clearInterval(intervalRef.current!);
      }, CHAR_DELAY_MS);
    }, FIRST_CHAR_AT_MS);

    const allLettersAt = FIRST_CHAR_AT_MS + CHARS.length * CHAR_DELAY_MS + 300;
    addTimer(() => setPhase("pulse"),  allLettersAt);
    addTimer(() => setPhase("reveal"), allLettersAt + 700);
    addTimer(() => setPhase("ready"),  allLettersAt + 1700);

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

  const boxVisible     = phase === "box" || phase === "logoPulse" || phase === "opening" || phase === "throwing";
  const isBoxPulsing   = phase === "logoPulse";
  const pulseActive    = phase === "pulse" || phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const logoVisible    = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const taglineVisible = phase === "reveal" || phase === "ready" || phase === "loading" || phase === "exit";
  const buttonVisible  = phase === "ready" && !isLoading;
  const loadingVisible = isLoading;

  return (
    <>
      {/* Hidden pre-render of children */}
      <div style={{ opacity: phase === "exit" ? 1 : 0, height: phase === "exit" ? "auto" : 0, overflow:"hidden", transition:"opacity 1s ease" }}>
        {children}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          FULL-SCREEN SPLASH CONTAINER
      ═══════════════════════════════════════════════════════════ */}
      <div style={{
        position:"fixed", inset:0, zIndex:100,
        width:"100vw", height:"100dvh", overflow:"hidden",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        // Deep cinematic black-midnight navy base
        background:"#020509",
        opacity: phase === "exit" ? 0 : 1,
        transition:"opacity 1s ease",
        pointerEvents: phase === "exit" ? "none" : "auto",
      }}>

        {/* ── BACKGROUND ATMOSPHERE ── */}
        {/* Left warm orange-amber bloom */}
        <div style={{ position:"absolute", top:"-15%", left:"-12%", width:"58vw", height:"80vh", pointerEvents:"none",
          background:"radial-gradient(ellipse at 15% 35%, rgba(220,95,0,0.22) 0%, rgba(160,55,0,0.12) 30%, transparent 65%)" }} />
        {/* Left lower amber reflection */}
        <div style={{ position:"absolute", bottom:"-5%", left:"-5%", width:"45vw", height:"45vh", pointerEvents:"none",
          background:"radial-gradient(ellipse at 5% 95%, rgba(190,75,0,0.14) 0%, transparent 60%)" }} />

        {/* Right deep-blue/cyan bloom */}
        <div style={{ position:"absolute", top:"-10%", right:"-12%", width:"58vw", height:"80vh", pointerEvents:"none",
          background:"radial-gradient(ellipse at 85% 28%, rgba(2,60,180,0.26) 0%, rgba(0,35,110,0.14) 35%, transparent 65%)" }} />
        {/* Right lower blue reflection */}
        <div style={{ position:"absolute", bottom:"-5%", right:"-5%", width:"45vw", height:"45vh", pointerEvents:"none",
          background:"radial-gradient(ellipse at 95% 95%, rgba(7,96,240,0.16) 0%, transparent 60%)" }} />

        {/* Subtle floor glow centre */}
        <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"55vw", height:"18vh", pointerEvents:"none",
          background:"radial-gradient(ellipse at 50% 100%, rgba(5,60,160,0.1) 0%, transparent 70%)" }} />

        {/* ── LEFT CIRCUIT GRAPHICS (orange / gold) ── */}
        <svg
          style={{ position:"absolute", top:0, left:0, width:"30vw", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 300 800" preserveAspectRatio="xMinYMid meet"
        >
          <defs>
            <linearGradient id="goldFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ED8506" stopOpacity="0.85"/>
              <stop offset="60%" stopColor="#F7B916" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#FFE36E" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="goldFadeV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F7B916" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#ED8506" stopOpacity="0.2"/>
            </linearGradient>
            <filter id="goldGlow">
              <feGaussianBlur stdDeviation="1.2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Main vertical trunk */}
          <polyline points="55,30 55,130 18,130 18,260 72,260 72,400 28,400 28,540 65,540 65,660 20,660 20,780"
            stroke="url(#goldFadeV)" strokeWidth="1.2" fill="none"/>

          {/* Horizontal branches with 90° turns */}
          <polyline points="55,90 110,90 110,130 145,130" stroke="#F79400" strokeWidth="1" fill="none" opacity="0.5"/>
          <polyline points="18,195 -15,195" stroke="#ED8506" strokeWidth="1" fill="none" opacity="0.45"/>
          <polyline points="72,320 125,320 125,355 95,355" stroke="#F7B916" strokeWidth="1" fill="none" opacity="0.5"/>
          <polyline points="28,460 -20,460" stroke="#ED8506" strokeWidth="1" fill="none" opacity="0.4"/>
          <polyline points="65,590 140,590 140,620 105,620 105,650" stroke="#F79400" strokeWidth="1" fill="none" opacity="0.45"/>
          <polyline points="18,130 18,90 -10,90" stroke="#FFB000" strokeWidth="0.8" fill="none" opacity="0.35"/>
          <polyline points="72,400 170,400 170,360 130,360" stroke="#F7B916" strokeWidth="0.9" fill="none" opacity="0.4"/>

          {/* Diagonal accent lines */}
          <line x1="55" y1="260" x2="30" y2="290" stroke="#ED8506" strokeWidth="0.8" opacity="0.35"/>
          <line x1="72" y1="540" x2="50" y2="560" stroke="#F79400" strokeWidth="0.8" opacity="0.3"/>

          {/* Circuit nodes (glowing dots) */}
          <g filter="url(#goldGlow)">
            <circle cx="55" cy="90" r="3" fill="#FFB000" opacity="0.9"/>
            <circle cx="110" cy="130" r="2.5" fill="#F7B916" opacity="0.8"/>
            <circle cx="18" cy="195" r="3" fill="#ED8506" opacity="0.85"/>
            <circle cx="72" cy="320" r="3" fill="#FFB000" opacity="0.9"/>
            <circle cx="125" cy="355" r="2" fill="#F7B916" opacity="0.7"/>
            <circle cx="28" cy="460" r="3" fill="#ED8506" opacity="0.85"/>
            <circle cx="65" cy="590" r="3" fill="#FFB000" opacity="0.8"/>
            <circle cx="140" cy="620" r="2" fill="#F7B916" opacity="0.65"/>
            <circle cx="18" cy="90" r="2" fill="#FFE36E" opacity="0.6"/>
            <circle cx="170" cy="400" r="2.2" fill="#F79400" opacity="0.7"/>
          </g>

          {/* Node halos (tiny outer ring) */}
          <g fill="none" stroke="#FFB000" opacity="0.3">
            <circle cx="55" cy="90" r="5.5" strokeWidth="0.6"/>
            <circle cx="18" cy="195" r="5.5" strokeWidth="0.6"/>
            <circle cx="72" cy="320" r="5.5" strokeWidth="0.6"/>
            <circle cx="28" cy="460" r="5.5" strokeWidth="0.6"/>
          </g>

          {/* Sparse orange particles */}
          <g fill="#EE8506">
            <circle cx="25" cy="55" r="1.1" opacity="0.45"/>
            <circle cx="130" cy="110" r="0.9" opacity="0.35"/>
            <circle cx="10" cy="340" r="1.1" opacity="0.4"/>
            <circle cx="88" cy="430" r="0.9" opacity="0.35"/>
            <circle cx="42" cy="565" r="1.1" opacity="0.4"/>
            <circle cx="155" cy="590" r="0.8" opacity="0.3"/>
            <circle cx="70" cy="700" r="1" opacity="0.35"/>
            <circle cx="30" cy="720" r="0.8" opacity="0.3"/>
          </g>
        </svg>

        {/* ── RIGHT CIRCUIT GRAPHICS (cyan / electric-blue) ── */}
        <svg
          style={{ position:"absolute", top:0, right:0, width:"30vw", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 300 800" preserveAspectRatio="xMaxYMid meet"
        >
          <defs>
            <linearGradient id="blueFade" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0FD2F5" stopOpacity="0"/>
              <stop offset="40%" stopColor="#079FEA" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#0760F0" stopOpacity="0.85"/>
            </linearGradient>
            <linearGradient id="blueFadeV" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0FD2F5" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#023A9B" stopOpacity="0.25"/>
            </linearGradient>
            <filter id="blueGlow">
              <feGaussianBlur stdDeviation="1.2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Main vertical trunk */}
          <polyline points="245,30 245,130 282,130 282,260 228,260 228,400 272,400 272,540 235,540 235,660 280,660 280,780"
            stroke="url(#blueFadeV)" strokeWidth="1.2" fill="none"/>

          {/* Horizontal branches */}
          <polyline points="245,90 190,90 190,130 155,130" stroke="#079FEA" strokeWidth="1" fill="none" opacity="0.5"/>
          <polyline points="282,195 315,195" stroke="#0760F0" strokeWidth="1" fill="none" opacity="0.45"/>
          <polyline points="228,320 175,320 175,355 205,355" stroke="#0FD2F5" strokeWidth="1" fill="none" opacity="0.5"/>
          <polyline points="272,460 320,460" stroke="#0760F0" strokeWidth="1" fill="none" opacity="0.4"/>
          <polyline points="235,590 160,590 160,620 195,620 195,650" stroke="#079FEA" strokeWidth="1" fill="none" opacity="0.45"/>
          <polyline points="282,130 282,90 310,90" stroke="#0FD2F5" strokeWidth="0.8" fill="none" opacity="0.35"/>
          <polyline points="228,400 130,400 130,360 170,360" stroke="#0FD2F5" strokeWidth="0.9" fill="none" opacity="0.4"/>

          {/* Diagonals */}
          <line x1="245" y1="260" x2="270" y2="290" stroke="#0760F0" strokeWidth="0.8" opacity="0.35"/>
          <line x1="228" y1="540" x2="250" y2="560" stroke="#079FEA" strokeWidth="0.8" opacity="0.3"/>

          {/* Circuit nodes */}
          <g filter="url(#blueGlow)">
            <circle cx="245" cy="90" r="3" fill="#0FD2F5" opacity="0.95"/>
            <circle cx="190" cy="130" r="2.5" fill="#079FEA" opacity="0.8"/>
            <circle cx="282" cy="195" r="3" fill="#0760F0" opacity="0.85"/>
            <circle cx="228" cy="320" r="3" fill="#0FD2F5" opacity="0.9"/>
            <circle cx="175" cy="355" r="2" fill="#079FEA" opacity="0.7"/>
            <circle cx="272" cy="460" r="3" fill="#0760F0" opacity="0.85"/>
            <circle cx="235" cy="590" r="3" fill="#0FD2F5" opacity="0.8"/>
            <circle cx="160" cy="620" r="2" fill="#079FEA" opacity="0.65"/>
            <circle cx="310" cy="90" r="2" fill="#0FD2F5" opacity="0.6"/>
            <circle cx="130" cy="400" r="2.2" fill="#0760F0" opacity="0.7"/>
          </g>

          {/* Node halos */}
          <g fill="none" stroke="#0FD2F5" opacity="0.3">
            <circle cx="245" cy="90" r="5.5" strokeWidth="0.6"/>
            <circle cx="282" cy="195" r="5.5" strokeWidth="0.6"/>
            <circle cx="228" cy="320" r="5.5" strokeWidth="0.6"/>
            <circle cx="272" cy="460" r="5.5" strokeWidth="0.6"/>
          </g>

          {/* Sparse blue particles */}
          <g fill="#0FD2F5">
            <circle cx="275" cy="55" r="1.1" opacity="0.45"/>
            <circle cx="170" cy="115" r="0.9" opacity="0.35"/>
            <circle cx="290" cy="340" r="1.1" opacity="0.4"/>
            <circle cx="212" cy="435" r="0.9" opacity="0.35"/>
            <circle cx="258" cy="565" r="1.1" opacity="0.4"/>
            <circle cx="145" cy="595" r="0.8" opacity="0.3"/>
            <circle cx="230" cy="700" r="1" opacity="0.35"/>
            <circle cx="270" cy="720" r="0.8" opacity="0.3"/>
          </g>
        </svg>

        {/* Right edge vertical accent */}
        <div style={{ position:"absolute", top:0, right:0, width:"1.5px", height:"100%", pointerEvents:"none",
          background:"linear-gradient(to bottom, transparent 0%, rgba(15,210,245,0.2) 25%, rgba(7,96,240,0.25) 65%, transparent 100%)" }} />

        {/* ═══ MAIN CONTENT STACK ═══ */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          gap:"clamp(8px,1.5vh,20px)",
          position:"relative", zIndex:10,
          width:"100%", padding:"0 clamp(12px,3vw,48px)",
        }}>

          {/* LOGO (shown after animation) */}
          <div style={{
            transition:"opacity 0.8s ease, transform 0.8s ease",
            opacity: logoVisible ? 1 : 0,
            transform: logoVisible ? "translateY(0) scale(1)" : "translateY(-16px) scale(0.9)",
          }}>
            <Image
              src="/adithyatech-emblem.png"
              alt="AdithyaTech Logo"
              width={130} height={130}
              priority quality={100}
              style={{
                width:"clamp(50px,7.5vw,110px)", height:"auto",
                // Tight split glow matching logo's two halves
                filter:"drop-shadow(-3px 0 8px rgba(238,133,6,0.55)) drop-shadow(3px 0 8px rgba(15,210,245,0.55))",
              }}
            />
          </div>

          {/* 3D BOX */}
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
              animation: (phase === "opening" || phase === "throwing") ? "boxFloat 2s ease infinite alternate" : undefined,
            }}>
              {/* FRONT FACE with logo */}
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
                <div style={{
                  position:"relative", zIndex:2, width:"72%", height:"72%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  animation: isBoxPulsing ? "logoPulse 0.45s ease-in-out 2 alternate" : undefined,
                }}>
                  <Image src="/adithyatech-emblem.png" alt="AdithyaTech" fill priority quality={100}
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

              {/* Other 4 faces */}
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

              {/* Lid */}
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

          {/* ══ CHARACTER-BY-CHARACTER NAME ══ */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            flexWrap:"nowrap",
            minHeight:"clamp(36px,7vw,90px)",
            position:"relative",
          }}>
            {CHARS.map((char, i) => {
              const isVisible = revealedCount > i;
              const isGold = i <= 6;
              const groupSize = 7;
              const posWithinGroup = isGold ? i : i - 7;
              const gradientPos = `${(posWithinGroup / (groupSize - 1)) * 100}%`;
              const gradient = isGold
                ? "linear-gradient(90deg, #EE8506 0%, #F7B916 50%, #FFE36E 100%)"
                : "linear-gradient(90deg, #0FD2F5 0%, #079FEA 55%, #0760F0 100%)";

              return (
                <span
                  key={`${char}-${i}`}
                  aria-hidden={i > 0 && char === CHARS[i - 1]}
                  style={{
                    display: "inline-block",
                    fontSize: "clamp(20px,4.5vw,68px)",
                    fontWeight: 900,
                    letterSpacing: "clamp(1px,0.3vw,4px)",
                    // Orbitron: futuristic geometric font matching the reference
                    fontFamily: "'Orbitron','Michroma','Inter',sans-serif",
                    background: gradient,
                    backgroundSize: `${groupSize * 100}% 100%`,
                    backgroundPosition: `${gradientPos} center`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "transparent",
                    opacity: isVisible ? 1 : 0,
                    animation: isVisible ? "letterFlyIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
                    willChange: "transform, opacity",
                    lineHeight: 1,
                    WebkitFontSmoothing: "antialiased",
                  }}
                >
                  {char}
                </span>
              );
            })}
          </div>

          {/* ══ TAGLINE ══ */}
          <div style={{
            display:"flex", alignItems:"center", gap:"clamp(8px,1.4vw,20px)",
            transition:"opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s",
            opacity: taglineVisible ? 1 : 0,
            transform: taglineVisible ? "translateY(0)" : "translateY(10px)",
            marginTop:"clamp(2px,0.3vh,6px)",
          }}>
            {/* SMART */}
            <span style={{
              fontFamily:"'Orbitron','Michroma','Inter',sans-serif",
              fontSize:"clamp(7px,0.95vw,12px)", fontWeight:700,
              letterSpacing:"clamp(2px,0.5vw,6px)",
              color:"#F79400",
            }}>SMART</span>

            {/* separator dot */}
            <span style={{
              display:"block", width:"4px", height:"4px", borderRadius:"50%",
              background:"linear-gradient(135deg, #F7B916, #0FD2F5)",
              boxShadow:"0 0 5px rgba(247,185,22,0.6), 0 0 5px rgba(15,210,245,0.6)",
            }}/>

            {/* SECURE */}
            <span style={{
              fontFamily:"'Orbitron','Michroma','Inter',sans-serif",
              fontSize:"clamp(7px,0.95vw,12px)", fontWeight:700,
              letterSpacing:"clamp(2px,0.5vw,6px)",
              color:"#079FEA",
            }}>SECURE</span>

            {/* separator dot */}
            <span style={{
              display:"block", width:"4px", height:"4px", borderRadius:"50%",
              background:"linear-gradient(135deg, #0FD2F5, #e040fb)",
              boxShadow:"0 0 5px rgba(15,210,245,0.5), 0 0 5px rgba(224,64,251,0.5)",
            }}/>

            {/* SCALABLE */}
            <span style={{
              fontFamily:"'Orbitron','Michroma','Inter',sans-serif",
              fontSize:"clamp(7px,0.95vw,12px)", fontWeight:700,
              letterSpacing:"clamp(2px,0.5vw,6px)",
              color:"#c855e8",
            }}>SCALABLE</span>
          </div>

          {/* ══ ENTER WAREHOUSE BUTTON ══ */}
          <div style={{
            marginTop:"clamp(8px,1.4vh,20px)",
            transition:"opacity 0.6s ease, transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
            opacity: buttonVisible ? 1 : 0,
            transform: buttonVisible ? "translateY(0) scale(1)" : "translateY(18px) scale(0.92)",
            pointerEvents: buttonVisible ? "auto" : "none",
          }}>
            <button
              onClick={handleEnter}
              style={{
                position:"relative", display:"flex", alignItems:"center",
                gap:"clamp(10px,1.2vw,16px)",
                padding:"clamp(13px,1.5vh,18px) clamp(28px,3.2vw,52px)",
                background:"linear-gradient(135deg, rgba(3,11,28,0.95) 0%, rgba(2,6,18,0.98) 100%)",
                border:"1.5px solid rgba(7,96,240,0.7)",
                borderRadius:"clamp(30px,5vw,64px)",
                color:"rgba(255,255,255,0.92)",
                fontSize:"clamp(10px,1.05vw,13px)",
                fontWeight:700,
                fontFamily:"'Orbitron','Michroma','Inter',sans-serif",
                letterSpacing:"clamp(2px,0.45vw,5px)",
                cursor:"pointer", whiteSpace:"nowrap",
                // Tight electric-blue border glow only, no giant blur
                boxShadow:"0 0 12px -2px rgba(7,96,240,0.6), 0 0 30px -8px rgba(15,210,245,0.35), inset 0 0 20px -10px rgba(7,96,240,0.15)",
                backdropFilter:"blur(8px)",
                overflow:"hidden",
                transition:"border-color 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.borderColor = "rgba(15,210,245,0.85)";
                b.style.boxShadow = "0 0 18px -2px rgba(15,210,245,0.7), 0 0 45px -8px rgba(7,96,240,0.45), inset 0 0 20px -8px rgba(15,210,245,0.12)";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.borderColor = "rgba(7,96,240,0.7)";
                b.style.boxShadow = "0 0 12px -2px rgba(7,96,240,0.6), 0 0 30px -8px rgba(15,210,245,0.35), inset 0 0 20px -10px rgba(7,96,240,0.15)";
              }}
              onMouseDown={e => (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)"}
              onMouseUp={e   => (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"}
              aria-label="Enter Warehouse"
            >
              {/* Shimmer sweep */}
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)", transform:"translateX(-100%)", animation:"shimmer 2.8s ease infinite" }} />
              <span style={{ position:"relative", zIndex:1 }}>ENTER WAREHOUSE</span>
              <span style={{ position:"relative", zIndex:1, fontSize:"clamp(14px,1.5vw,20px)", color:"rgba(15,210,245,0.9)", transition:"transform 0.25s ease" }}>→</span>
            </button>
          </div>

          {/* LOADING STATE */}
          <div style={{
            marginTop:"clamp(8px,1.4vh,20px)",
            transition:"opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s",
            opacity: loadingVisible ? 1 : 0,
            transform: loadingVisible ? "translateY(0) scale(1)" : "translateY(18px) scale(0.92)",
            pointerEvents:"none",
            display:"flex", flexDirection:"column", alignItems:"center",
            gap:"clamp(8px,1.2vh,16px)", width:"clamp(140px,22vw,260px)",
          }}>
            <div style={{ color:"#079FEA", fontWeight:700, letterSpacing:"clamp(2px,0.45vw,5px)", textTransform:"uppercase", fontSize:"clamp(9px,0.9vw,12px)", fontFamily:"'Orbitron','Inter',sans-serif", animation:"pulseOpacity 1.5s ease-in-out infinite" }}>
              Loading
            </div>
            <div style={{ display:"flex", gap:"clamp(5px,0.7vw,9px)" }}>
              {[...Array(5)].map((_,i) => (
                <div key={i} style={{ width:"clamp(5px,0.7vw,9px)", height:"clamp(5px,0.7vw,9px)", borderRadius:"50%", background:"#079FEA", boxShadow:"0 0 8px rgba(7,159,234,0.9)", animation:"dotBounce 1.2s ease-in-out infinite", animationDelay:`${i*0.15}s` }} />
              ))}
            </div>
            <div style={{ width:"100%", height:"2px", background:"rgba(7,96,240,0.14)", borderRadius:"2px", overflow:"hidden", position:"relative" }}>
              <div key={progressKey} style={{ position:"absolute", top:0, left:0, height:"100%", background:"linear-gradient(90deg,#0760F0,#0FD2F5)", boxShadow:"0 0 10px rgba(15,210,245,0.9)", borderRadius:"2px", animation:"progressBar 3s ease-in-out forwards" }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position:"absolute", bottom:"clamp(10px,1.8vh,22px)", color:"rgba(255,255,255,0.15)", fontSize:"clamp(7px,0.6vw,9px)", letterSpacing:"clamp(2px,0.45vw,5px)", fontWeight:700, textTransform:"uppercase", fontFamily:"'Orbitron','Inter',sans-serif", transition:"opacity 1s ease", opacity: logoVisible ? 1 : 0 }}>
          © 2026 ADITHYATECH • Global Warehouse Network
        </div>
      </div>

      {/* ══ GOOGLE FONT IMPORT + KEYFRAMES ══ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Michroma&display=swap');

        @keyframes letterFlyIn {
          0%   { opacity:0; transform: translateY(clamp(-120px,-18vh,-60px)) scale(0.25) rotateX(80deg) rotateZ(-8deg); }
          60%  { opacity:1; }
          80%  { transform: translateY(4px) scale(1.06) rotateX(0deg) rotateZ(0deg); }
          100% { opacity:1; transform: translateY(0) scale(1) rotateX(0deg) rotateZ(0deg); }
        }
        @keyframes logoPulse {
          0%   { transform:scale(1);    filter:drop-shadow(0 0 8px rgba(77,144,254,0.7)) drop-shadow(0 0 16px rgba(255,140,0,0.4)); }
          50%  { transform:scale(1.12); filter:drop-shadow(0 0 20px rgba(77,144,254,1)) drop-shadow(0 0 40px rgba(255,180,0,1)) brightness(1.4); }
          100% { transform:scale(1);    filter:drop-shadow(0 0 8px rgba(77,144,254,0.7)) drop-shadow(0 0 16px rgba(255,140,0,0.4)); }
        }
        @keyframes boxFloat {
          from { transform: rotateY(-5deg) rotateX(3deg) translateY(0px); }
          to   { transform: rotateY(5deg) rotateX(-3deg) translateY(-8px); }
        }
        @keyframes neonPulse {
          from { opacity:0.45; }
          to   { opacity:1; }
        }
        @keyframes shimmer {
          0%   { transform:translateX(-100%); }
          60%  { transform:translateX(100%); }
          100% { transform:translateX(100%); }
        }
        @keyframes pulseOpacity {
          0%,100% { opacity:0.6; }
          50%     { opacity:1; }
        }
        @keyframes dotBounce {
          0%,80%,100% { transform:translateY(0); }
          40%          { transform:translateY(-8px); }
        }
        @keyframes progressBar {
          0%   { width:0%; }
          100% { width:100%; }
        }
        @keyframes splashFadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
        }
      `}</style>
    </>
  );
}
