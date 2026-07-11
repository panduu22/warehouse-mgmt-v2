import Link from "next/link";

export default function SplashScreen() {
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
            alt="Splash Background"
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
            }}
          />

          {/* INVISIBLE ENTER WAREHOUSE HOTSPOT LINKS TO /login */}
          <Link
            href="/login"
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
              cursor: "pointer",
              zIndex: 10,
              WebkitTapHighlightColor: "transparent",
            }}
          ></Link>
        </div>
      </div>

      <style>{`
        html,
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </>
  );
}