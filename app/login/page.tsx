"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingDev, setLoadingDev] = useState(false);
  const [email, setEmail] = useState("");

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    await signIn("google", { callbackUrl: "/" });
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoadingDev(true);
    await signIn("credentials", { email, callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-black">
      {/* Background Image */}
      <Image 
        src="/adithyatech-bg.png" 
        alt="AdithyaTech Background" 
        fill
        priority
        className="object-cover opacity-80"
      />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        
        <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-white/60 text-sm">Sign in to your Warehouse Manager account</p>
        </div>

        <div className="space-y-6">
            <button
                onClick={handleGoogleLogin}
                disabled={loadingGoogle || loadingDev}
                className="w-full relative flex items-center justify-center gap-3 bg-white text-black py-3.5 px-4 rounded-xl font-semibold transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-lg"
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

            <div className="relative flex items-center justify-center py-2">
                <div className="absolute border-t border-white/10 w-full"></div>
                <div className="relative bg-transparent px-4 text-xs text-white/40 font-medium tracking-widest uppercase backdrop-blur-sm bg-black/40 rounded-full py-1">
                    or
                </div>
            </div>

            <form onSubmit={handleDevLogin} className="space-y-4">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-xs font-medium text-white/70 pl-1">
                        Developer Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all font-medium"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loadingDev || loadingGoogle || !email}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-3.5 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 border border-white/5"
                >
                    {loadingDev ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    <span>Sign in with Developer Login</span>
                </button>
            </form>
        </div>

      </div>
      
      <div className="absolute bottom-6 text-center text-white/30 text-xs font-medium uppercase tracking-[0.2em]">
        &copy; 2026 AdithyaTech
      </div>
    </div>
  );
}
