"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: email.trim().toLowerCase(),
        password: password.trim(),
        callbackUrl: "/dashboard",
      });

      if (res?.error) {
        switch (res.error) {
          case "USER_NOT_FOUND":
            setError("No account found with this email.");
            break;
          case "INCORRECT_PASSWORD":
            setError("Incorrect password. Please try again.");
            break;
          case "ACCOUNT_INACTIVE":
            setError("Your account is currently inactive. Contact your admin.");
            break;
          case "UNASSIGNED_WAREHOUSE":
            setError("Your account is not assigned to any warehouse.");
            break;
          case "MISSING_CREDENTIALS":
            setError("Please fill out all fields.");
            break;
          default:
            setError("Authentication failed. Please verify credentials.");
        }
      } else if (res?.ok) {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
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
        
        <div className="mb-8 text-center flex flex-col items-center">
            <div className="mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/adithyatech-logo.png"
                    alt="AdithyaTech"
                    className="h-12 object-contain"
                />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Welcome Back</h1>
            <p className="text-white/60 text-sm">Sign in to your AdithyaTech account</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 px-1 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-11 pr-4 py-3 border border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 px-1 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-11 pr-4 py-3 border border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full relative mt-2 flex items-center justify-center gap-3 bg-white text-black py-3.5 px-4 rounded-xl font-bold transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 shadow-lg cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-black" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

      </div>
      
      <div className="absolute bottom-6 text-center text-white/30 text-xs font-medium uppercase tracking-[0.2em]">
        &copy; 2026 ADITHYA TECH
      </div>
    </div>
  );
}
