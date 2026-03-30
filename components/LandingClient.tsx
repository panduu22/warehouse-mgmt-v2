"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Warehouse, Timer, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
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
    <div className="min-h-screen bg-snow flex flex-col items-center p-6 sm:p-12">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-ruby-700 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ruby-700 tracking-tight">WM</h1>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Access Control</p>
          </div>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 text-gray-500 hover:text-ruby-700 font-bold text-sm transition-colors px-4 py-2 hover:bg-ruby-50 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Side: Welcome & Form */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Welcome, {user.name?.split(' ')[0] || 'User'}! 👋</h2>
            <p className="text-gray-500 font-medium">
              You are currently logged in as <span className="text-ruby-600 font-bold">{user.email}</span>. 
              To access the system, please select a warehouse and request permission.
            </p>
          </div>

          <form onSubmit={handleRequest} className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-700 uppercase tracking-wider">
                1. Select Warehouse
              </label>
              <div className="grid grid-cols-1 gap-2">
                {warehouses.map((w) => (
                  <button
                    key={w._id}
                    type="button"
                    onClick={() => setSelectedWarehouse(w._id)}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group",
                      selectedWarehouse === w._id 
                        ? "border-ruby-600 bg-ruby-50 ring-4 ring-ruby-100" 
                        : "border-gray-100 hover:border-ruby-200 hover:bg-ruby-50/30"
                    )}
                  >
                    <div>
                      <div className={clsx("font-bold text-lg", selectedWarehouse === w._id ? "text-ruby-700" : "text-gray-900")}>
                        {w.name}
                      </div>
                      <div className="text-sm text-gray-500">{w.location}</div>
                    </div>
                    <div className={clsx(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      selectedWarehouse === w._id ? "border-ruby-600 bg-ruby-600 text-white" : "border-gray-200"
                    )}>
                      {selectedWarehouse === w._id && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-gray-700 uppercase tracking-wider">
                2. Access Period (Days)
              </label>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <Timer className="w-6 h-6 text-ruby-600" />
                <input 
                  type="number" 
                  min="1" 
                  max="365"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="bg-transparent text-2xl font-black text-ruby-700 outline-none w-24"
                />
                <span className="text-gray-400 font-bold">Days Requested</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Default is 30 days. Admin will ultimately decide the period.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedWarehouse}
              className="w-full bg-ruby-700 hover:bg-ruby-800 disabled:opacity-50 text-white py-5 rounded-2xl font-black text-xl shadow-lg hover:shadow-ruby-200 transition-all flex items-center justify-center gap-3"
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
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Your Requests
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{requests.length}</span>
          </h3>

          {fetchingRequests ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => <div key={i} className="h-32 bg-gray-100 rounded-3xl" />)}
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <Clock className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-400 font-bold">No active or pending requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req._id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-4">
                  <div className={clsx(
                    "p-3 rounded-2xl shrink-0",
                    req.status === "PENDING" ? "bg-amber-100 text-amber-600" :
                    req.status === "APPROVED" ? "bg-teal-100 text-teal-600" :
                    "bg-red-100 text-red-600"
                  )}>
                    {req.status === "PENDING" ? <Clock className="w-6 h-6" /> :
                     req.status === "APPROVED" ? <CheckCircle2 className="w-6 h-6" /> :
                     <XCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg">{req.warehouseId?.name || "Deleted Warehouse"}</h4>
                        <p className="text-sm text-gray-500 font-medium">{req.warehouseId?.location || "N/A"}</p>
                      </div>
                      <span className={clsx(
                        "text-[10px] font-black px-2 py-1 rounded-full tracking-widest uppercase",
                        req.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                        req.status === "APPROVED" ? "bg-teal-100 text-teal-800" :
                        "bg-red-100 text-red-800"
                      )}>
                        {req.status}
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                      <div className="text-xs font-bold text-gray-400">
                        Requested {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-black text-gray-700">
                        {req.requestedDuration} Days Access
                      </div>
                    </div>
                    {req.adminNotes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-600 italic">
                        " {req.adminNotes} "
                      </div>
                    )}
                    {req.status === "APPROVED" && (
                      <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-sm"
                      >
                        Refresh to Enter System
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-6 bg-ruby-900 rounded-3xl text-white space-y-4 shadow-xl">
            <h4 className="font-bold text-ruby-200">Tip for fast access:</h4>
            <p className="text-sm font-medium leading-relaxed">
              Once you submit a request, contact your inventory manager or administrator to approve your access period. 
              You'll be able to access the dashboard immediately after approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
