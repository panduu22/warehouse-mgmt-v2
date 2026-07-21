// components/InstallPrompt.tsx
//
// Shows a subtle install banner when the browser fires beforeinstallprompt
// (Android Chrome). This event is not fired on iOS — iOS users use Safari's
// "Share → Add to Home Screen" flow, which is enabled by the manifest's
// apple-related metadata in app/layout.tsx.
//
// The banner is fully dismissable and does not appear again after dismissal
// (stored in sessionStorage to avoid re-appearing on every page navigation
// within the same session).

"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't re-show if the user dismissed it this session.
    if (sessionStorage.getItem("pwa-install-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault(); // Suppress the browser's default mini-infobar.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install AdithyaTech app"
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        backgroundColor: "#1E293B",
        border: "1px solid #334155",
        borderRadius: "16px",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.2)",
        maxWidth: "90vw",
        width: "360px",
        animation: "slideUp 0.25s ease-out",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      {/* App icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/adithyatech-emblem.png"
        alt="AdithyaTech"
        width={40}
        height={40}
        style={{ borderRadius: "10px", flexShrink: 0 }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 700,
            color: "#F8FAFC",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
          }}
        >
          Install AdithyaTech
        </p>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: "11.5px",
            color: "rgba(248,250,252,0.50)",
            lineHeight: 1.4,
          }}
        >
          Add to home screen for quick access
        </p>
      </div>

      {/* Install CTA */}
      <button
        id="pwa-install-btn"
        onClick={handleInstall}
        style={{
          backgroundColor: "#2563EB",
          color: "#fff",
          border: "none",
          borderRadius: "9px",
          padding: "7px 14px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
          letterSpacing: "-0.01em",
        }}
      >
        Install
      </button>

      {/* Dismiss */}
      <button
        id="pwa-install-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss install prompt"
        style={{
          background: "none",
          border: "none",
          color: "rgba(248,250,252,0.35)",
          cursor: "pointer",
          padding: "4px",
          flexShrink: 0,
          lineHeight: 1,
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
        }}
      >
        ×
      </button>
    </div>
  );
}
