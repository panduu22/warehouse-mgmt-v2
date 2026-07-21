// app/offline/page.tsx
//
// Offline fallback page — served by the Serwist service worker when the user
// attempts to navigate to any page while offline. Uses only inline styles so
// it renders correctly even if the CSS bundle is not cached.
//
// force-static ensures this page is pre-rendered at build time and included
// in the service worker precache manifest.

"use client";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0F172A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* AdithyaTech Brand */}
      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/adithyatech-emblem.png"
          alt="AdithyaTech"
          width={60}
          height={60}
          style={{ objectFit: "contain", borderRadius: "14px" }}
        />
        <p
          style={{
            marginTop: "12px",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "#F8FAFC",
            lineHeight: 1,
          }}
        >
          ADITHYA
          <span style={{ color: "#2563EB" }}>TECH</span>
        </p>
        <p
          style={{
            fontSize: "9px",
            color: "rgba(248,250,252,0.30)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            marginTop: "4px",
          }}
        >
          Warehouse ERP
        </p>
      </div>

      {/* No-WiFi Icon */}
      <div
        style={{
          width: "76px",
          height: "76px",
          borderRadius: "50%",
          backgroundColor: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "28px",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(252,165,165,0.80)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
      </div>

      {/* Heading */}
      <h1
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#F8FAFC",
          margin: "0 0 10px 0",
          textAlign: "center",
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
        }}
      >
        You&apos;re Offline
      </h1>

      {/* Description */}
      <p
        style={{
          fontSize: "14px",
          color: "rgba(248,250,252,0.45)",
          textAlign: "center",
          maxWidth: "300px",
          margin: "0 0 36px 0",
          lineHeight: 1.65,
        }}
      >
        AdithyaTech Warehouse ERP requires a live connection to display
        real-time stock, trips, and invoice data. Please check your network
        and try again.
      </p>

      {/* Retry Button */}
      <button
        onClick={() => window.location.reload()}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#2563EB",
          color: "#FFFFFF",
          border: "none",
          borderRadius: "12px",
          padding: "12px 28px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "-0.01em",
          boxShadow: "0 4px 16px rgba(37,99,235,0.35)",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#1D4ED8")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "#2563EB")
        }
      >
        {/* Refresh icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        Retry Connection
      </button>

      {/* Footer */}
      <p
        style={{
          position: "fixed",
          bottom: "20px",
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: "10px",
          color: "rgba(248,250,252,0.16)",
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          fontWeight: 500,
          margin: 0,
        }}
      >
        © 2026 ADITHYA TECH
      </p>
    </div>
  );
}
