"use client";

import { useState } from "react";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";

export default function ChangePasswordPage() {
  const { update } = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password. Please verify current password.");
      } else {
        // Force NextAuth to re-fetch the session so mustChangePassword becomes false in the JWT/client side
        await update();
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
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Action Required</h1>
            <p className="text-white/60 text-sm">Please change your password to continue</p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 px-1 uppercase tracking-wider block">
              Current Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-11 pr-4 py-3 border border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 px-1 uppercase tracking-wider block">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl pl-11 pr-4 py-3 border border-white/10 focus:border-white/20 focus:ring-2 focus:ring-white/10 font-bold text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/70 px-1 uppercase tracking-wider block">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/40">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              "Update Password"
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
