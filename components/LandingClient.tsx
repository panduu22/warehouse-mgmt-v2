"use client";

import { signOut } from "next-auth/react";
import { LogOut, ShieldAlert } from "lucide-react";

interface LandingClientProps {
  user: any;
  warehouses: any[]; // Kept for prop compatibility but unused
}

export default function LandingClient({ user }: LandingClientProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 sm:p-12 animate-in fade-in duration-700">
      
      <div className="w-full max-w-md bg-card p-8 rounded-[1rem] shadow-erp border border-border space-y-8 relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
        
        <div className="flex justify-center mb-6 relative z-10">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive shadow-lg border border-destructive/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <h2 className="text-2xl font-black text-foreground leading-tight tracking-tight">Warehouse Not Assigned</h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Your Google account is not assigned to any warehouse. Please contact the administrator.
          </p>
          
          <div className="bg-muted p-4 rounded-xl border border-border inline-block mt-4">
            <p className="text-sm font-bold text-foreground">{user.email}</p>
          </div>
        </div>

        <div className="pt-6 relative z-10">
          <button 
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-black text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

    </div>
  );
}
