"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Warehouse, CalendarDays, CheckCircle2, Clock, Send, ShieldCheck, Search, X } from "lucide-react";
import clsx from "clsx";

interface LandingClientProps {
  user: any;
  warehouses: any[];
}

export default function LandingClient({ user, warehouses }: LandingClientProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [loading, setLoading] = useState(false);
  const [warehouseSearch, setWarehouseSearch] = useState("");

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return alert("Please select a warehouse");

    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedWarehouse
        })
      });

      if (res.ok) {
        alert("Access request submitted successfully!");
        setSelectedWarehouse("");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to submit request");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center p-6 sm:p-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg border border-primary/20">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight">WM</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Access Control</p>
          </div>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary font-bold text-sm transition-all px-4 py-2 hover:bg-muted rounded-lg active:scale-95"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-foreground leading-tight tracking-tight">Welcome, {user.name?.split(' ')[0] || 'User'}! 👋</h2>
          <p className="text-muted-foreground font-medium leading-relaxed max-w-xl mx-auto">
            You are currently logged in as <span className="text-primary font-bold">{user.email}</span>. 
            To access the system, please select a warehouse and request permission.
          </p>
        </div>

        <form onSubmit={handleRequest} className="bg-card p-8 rounded-[1rem] shadow-erp border border-border space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          
          <div className="space-y-4 relative z-10">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              1. Select Warehouse
            </label>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={warehouseSearch}
                onChange={(e) => setWarehouseSearch(e.target.value)}
                placeholder="Search warehouses..."
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-border bg-muted/40 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
              {warehouseSearch && (
                <button
                  type="button"
                  onClick={() => setWarehouseSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {warehouses
                .filter((w) =>
                  w.name?.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                  w.location?.toLowerCase().includes(warehouseSearch.toLowerCase())
                )
                .map((w) => (
                <button
                  key={w._id}
                  type="button"
                  onClick={() => setSelectedWarehouse(w._id)}
                  className={clsx(
                    "p-5 rounded-[1rem] border-2 text-left transition-all flex items-center justify-between group",
                    selectedWarehouse === w._id 
                      ? "border-primary bg-primary/5 ring-4 ring-primary/10" 
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  )}
                >
                  <div>
                    <div className={clsx("font-bold text-lg leading-tight", selectedWarehouse === w._id ? "text-primary" : "text-foreground")}>
                      {w.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-medium">{w.location}</div>
                  </div>
                  <div className={clsx(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    selectedWarehouse === w._id ? "border-primary bg-primary text-primary-foreground" : "border-border group-hover:border-primary"
                  )}>
                    {selectedWarehouse === w._id && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </button>
              ))}
              {warehouses.filter((w) =>
                  w.name?.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
                  w.location?.toLowerCase().includes(warehouseSearch.toLowerCase())
                ).length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-bold">No warehouses match &ldquo;{warehouseSearch}&rdquo;</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 relative z-10">
            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              2. Access Validity
            </label>
            <div className="flex items-center gap-4 bg-primary/5 p-5 rounded-[1rem] border border-primary/20">
              <CalendarDays className="w-6 h-6 text-primary" />
              <div>
                <p className="font-black text-primary text-lg leading-tight tracking-tight">1 Year</p>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">(365 Calendar Days)</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/60 font-medium px-1">All new access requests are automatically granted for one calendar year from the approval date.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedWarehouse}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-5 rounded-[1rem] font-black text-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            {loading ? (
              <Clock className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Send className="w-6 h-6" />
                Submit Access Request
              </>
            )}
          </button>
        </form>

        <div className="p-8 bg-muted border border-border rounded-[1rem] space-y-4 shadow-erp relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:scale-110 transition-transform"></div>
          <h4 className="font-black text-foreground text-sm uppercase tracking-widest relative z-10 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Access Instructions
          </h4>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground relative z-10">
            Once you submit a request, contact your administrator to authorize your access. 
            You will be redirected to the dashboard immediately upon approval.
          </p>
        </div>
      </div>
    </div>
  );
}
