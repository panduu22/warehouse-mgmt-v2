"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import clsx from "clsx";

export default function SplashWrapper({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showButton, setShowButton] = useState(true); // Button is shown initially
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Check if we've already seen the splash in this session
    const hasSeenSplash = sessionStorage.getItem("hasSeenSplash");
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }
    setIsMounted(true);
  }, []);

  const handleEnter = () => {
    if (isLoading) return;
    setIsLoading(true);
    setShowButton(false);
    
    // Exactly 3 seconds loading animation
    setTimeout(() => {
      setIsAnimatingOut(true); // start fade out of the entire splash screen
      setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("hasSeenSplash", "true");
      }, 1000); // 1s fade out duration
    }, 3000); // 3 seconds loading duration
  };

  // If splash was already seen, just render children directly
  if (!showSplash && !isMounted) {
    return <>{children}</>;
  }

  if (!showSplash) {
    return <div className="animate-in fade-in duration-1000">{children}</div>;
  }

  return (
    <>
      {/* Pre-render children but hide them to avoid a blink after transition */}
      <div className={clsx("transition-opacity duration-1000", isAnimatingOut ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
        {children}
      </div>

      <div className={clsx(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-1000",
        isAnimatingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {/* Full-screen exact image, contained to avoid any cropping of the brand elements */}
        {/* We assume the user has placed the image as public/splash-bg.png */}
        <img 
          src="/splash-bg.png" 
          alt="AdithyaTech Splash" 
          className="w-full h-full object-cover sm:object-contain absolute inset-0 pointer-events-none"
        />

        {/* Overlay for the interactive elements, positioned in the lower area */}
        <div className="absolute bottom-[10%] sm:bottom-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center justify-center w-full px-6">
            
            {/* Button State */}
            <div className={clsx(
              "transition-all duration-500 absolute w-full max-w-xs flex justify-center",
              showButton ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
            )}>
              <button 
                onClick={handleEnter}
                className="group relative flex items-center justify-center gap-4 w-full sm:w-auto px-10 py-4 bg-[#0a192f]/80 hover:bg-[#112240]/90 border border-[#4d90fe]/50 rounded-full text-[#4d90fe] overflow-hidden transition-all duration-500 hover:scale-105 active:scale-95 shadow-[0_0_30px_-5px_rgba(77,144,254,0.4)] hover:shadow-[0_0_50px_-5px_rgba(77,144,254,0.7)] backdrop-blur-md"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative font-black tracking-[0.2em] text-sm sm:text-base uppercase text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Enter Warehouse</span>
                <ArrowRight className="w-5 h-5 relative group-hover:translate-x-1.5 transition-transform duration-300 text-white" />
              </button>
            </div>

            {/* Loading State */}
            <div className={clsx(
              "transition-all duration-500 absolute flex flex-col items-center w-full max-w-xs",
              !showButton ? "opacity-100 scale-100 delay-300" : "opacity-0 scale-90 pointer-events-none"
            )}>
              <div className="text-[#4d90fe] font-bold tracking-[0.3em] uppercase text-sm mb-4 animate-pulse drop-shadow-[0_0_8px_rgba(77,144,254,0.8)]">
                Loading
              </div>
              
              {/* 5 Glowing Blue Dots */}
              <div className="flex gap-3 mb-6">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-2 h-2 rounded-full bg-[#4d90fe] shadow-[0_0_10px_rgba(77,144,254,1)] animate-bounce"
                    style={{ animationDelay: (i * 0.15) + 's' }}
                  ></div>
                ))}
              </div>

              {/* Thin Glowing Progress Line */}
              <div className="w-full h-[2px] bg-[#112240] rounded-full overflow-hidden relative shadow-[0_0_10px_rgba(77,144,254,0.3)]">
                <div className="absolute top-0 left-0 h-full bg-[#4d90fe] shadow-[0_0_15px_rgba(77,144,254,1)] w-full -translate-x-full animate-[progress_3s_ease-in-out_forwards]"></div>
              </div>
            </div>
        </div>
      </div>
      
      {/* Required for the progress bar animation */}
      <style dangerouslySetInnerHTML={{__html: "@keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }"}} />
    </>
  );
}
