"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black"
      style={{
        backgroundImage: "url('/adithyatech-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-white/60 text-sm">Sign in to your Warehouse Manager account</p>
        </div>

        <div className="space-y-6">
            <button
                onClick={handleGoogleLogin}
                disabled={loadingGoogle}
                className="w-full relative flex items-center justify-center gap-3 bg-white text-black py-3.5 px-4 rounded-xl font-semibold transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-lg cursor-pointer"
            >
                {loadingGoogle ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                )}
                <span>Sign in with Google</span>
            </button>
        </div>

      </div>
      
      <div className="absolute bottom-6 text-center text-white/30 text-xs font-medium uppercase tracking-[0.2em]">
        &copy; 2026 AdithyaTech
      </div>
    </div>
  );
}
