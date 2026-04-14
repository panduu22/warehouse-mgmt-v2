"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Warehouse, Timer, CheckCircle2, XCircle, Clock, Send, ShieldCheck } from "lucide-react";
import clsx from "clsx";

interface LandingClientProps {
  user: any;
  warehouses: any[];
}

export default function LandingClient({ user, warehouses }: LandingClientProps) {
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) {
        const data = await res.json();
        const myRequests = data.filter((r: any) => r.userId?._id === user.id);
        setRequests(myRequests);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setFetchingRequests(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse) return alert("Please select a warehouse");

    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedWarehouse,
          requestedDuration: duration
        })
      });

      if (res.ok) {
        alert("Access request submitted successfully!");
        setSelectedWarehouse("");
        fetchRequests();
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

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Side: Welcome & Form */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-black text-foreground mb-2 leading-tight tracking-tight">Welcome, {user.name?.split(' ')[0] || 'User'}! 👋</h2>
            <p className="text-muted-foreground font-medium leading-relaxed">
              You are currently logged in as <span className="text-primary font-bold">{user.email}</span>. 
              To access the system, please select a warehouse and request permission.
            </p>
          </div>

          <form onSubmit={handleRequest} className="bg-card p-8 rounded-[2rem] shadow-xl border border-border space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="space-y-4 relative z-10">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                1. Select Warehouse
              </label>
              <div className="grid grid-cols-1 gap-3">
                {warehouses.map((w) => (
                  <button
                    key={w._id}
                    type="button"
                    onClick={() => setSelectedWarehouse(w._id)}
                    className={clsx(
                      "p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
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
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                2. Access Period (Days)
              </label>
              <div className="flex items-center gap-4 bg-muted p-5 rounded-2xl border border-border">
                <Timer className="w-6 h-6 text-primary" />
                <input 
                  type="number" 
                  min="1" 
                  max="365"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="bg-transparent text-3xl font-black text-primary outline-none w-24 tracking-tighter"
                />
                <span className="text-muted-foreground font-black text-sm uppercase tracking-widest">Days Requested</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 font-medium px-1">Default is 30 days. Final duration is at administrator discretion.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedWarehouse}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground py-5 rounded-2xl font-black text-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 active:scale-95"
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
        </div>

        {/* Right Side: Request Status */}
        <div className="space-y-6">
          <h3 className="text-xl font-black text-foreground flex items-center gap-2">
            Your Requests
            <span className="bg-muted text-muted-foreground text-xs px-2.5 py-1 rounded-full">{requests.length}</span>
          </h3>

          {fetchingRequests ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-muted/50 rounded-[2rem] border border-border" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-card p-12 rounded-[2rem] border-2 border-dashed border-border text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-muted-foreground font-bold italic">No active or pending requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req._id} className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex items-start gap-4 transition-all hover:shadow-md">
                  <div className={clsx(
                    "p-3 rounded-2xl shrink-0",
                    req.status === "PENDING" ? "bg-amber-500/10 text-amber-500" :
                    req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-destructive/10 text-destructive"
                  )}>
                    {req.status === "PENDING" ? <Clock className="w-6 h-6" /> :
                     req.status === "APPROVED" ? <CheckCircle2 className="w-6 h-6" /> :
                     <XCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground text-lg leading-tight">{req.warehouseId?.name || "Deleted Warehouse"}</h4>
                        <p className="text-sm text-muted-foreground font-medium">{req.warehouseId?.location || "N/A"}</p>
                      </div>
                      <span className={clsx(
                        "text-[10px] font-black px-2.5 py-1 rounded-full tracking-widest uppercase border",
                        req.status === "PENDING" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                        req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {req.status}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                      <div className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-wider">
                        Requested {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-black text-foreground">
                        {req.requestedDuration} Days Access
                      </div>
                    </div>
                    {req.adminNotes && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-xl text-xs font-medium text-muted-foreground italic border border-border">
                        " {req.adminNotes} "
                      </div>
                    )}
                    {req.status === "APPROVED" && (
                      <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95 text-sm uppercase tracking-widest"
                      >
                        Enter Warehouse Dashboard
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-8 bg-muted border border-border rounded-[2rem] space-y-4 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-xl group-hover:scale-110 transition-transform"></div>
            <h4 className="font-black text-foreground text-sm uppercase tracking-widest relative z-10 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Tip for fast access:
            </h4>
            <p className="text-sm font-medium leading-relaxed text-muted-foreground relative z-10">
              Once you submit a request, contact your inventory manager or administrator to approve your access period. 
              You'll be able to access the dashboard immediately after approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
