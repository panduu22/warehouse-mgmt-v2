"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User as UserIcon, 
  Warehouse, 
  Calendar,
  ShieldCheck,
  MessageSquare,
  ChevronRight,
  Loader2,
  Users
} from "lucide-react";
import clsx from "clsx";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Assignment state
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
      try {
          const res = await fetch("/api/warehouses");
          if (res.ok) {
              const data = await res.json();
              setWarehouses(data);
          }
      } catch (e) {
          console.error("Error fetching warehouses", e);
      }
  };

  const fetchRequests = async () => {
    try {
      const [reqsRes, usersRes] = await Promise.all([
        fetch("/api/requests"),
        fetch("/api/admin/users")
      ]);
      
      if (reqsRes.ok) {
        const data = await reqsRes.json();
        setRequests(data);
      }
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setActiveUsers(usersData);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssign = async () => {
      if (!selectedUser || selectedWarehouses.length === 0) {
          alert("Please select a user and at least one warehouse");
          return;
      }

      setAssigning(true);
      try {
          const res = await fetch("/api/admin/users/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  userId: selectedUser,
                  warehouseIds: selectedWarehouses,
                  durationDays: 365
              })
          });

          if (res.ok) {
              setSelectedUser("");
              setSelectedWarehouses([]);
              fetchRequests();
              alert("Warehouses assigned successfully!");
          } else {
              const data = await res.json();
              alert(data.error || "Failed to assign warehouses");
          }
      } catch (e) {
          alert("An error occurred during assignment");
      } finally {
          setAssigning(false);
      }
  };

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", duration?: number) => {
    setProcessingId(id);
    const adminNotes = status === "APPROVED" 
        ? prompt("Enter any notes for the user (optional):", "Access granted by administrator.")
        : prompt("Why is this request being rejected?", "Request not justified at this time.");
    
    if (status === "REJECTED" && adminNotes === null) {
      setProcessingId(null);
      return;
    }

    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes || "",
          durationDays: duration || 365
        })
      });

      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update request");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (userId: string, warehouseId: string, userName: string, warehouseName: string) => {
    if (!confirm(`Are you sure you want to completely REVOKE ${userName}'s access to ${warehouseName}? They will be immediately locked out.`)) return;
    
    setProcessingId(`${userId}-${warehouseId}`);
    try {
      const res = await fetch(`/api/admin/users/revoke?userId=${userId}&warehouseId=${warehouseId}`, { method: "DELETE" });
      if (res.ok) {
        fetchRequests();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to revoke access");
      }
    } catch (error) {
      alert("An error occurred");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const pastRequests = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Access Control
          </h1>
          <p className="text-muted-foreground font-medium">Manage warehouse permissions and active directory.</p>
        </div>
      </div>

      {/* Manual Assignment Section */}
      <div className="bg-card p-8 rounded-[2rem] shadow-xl border border-border space-y-6">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Quick Access Assignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground px-1">Staff Member</label>
                <select 
                    value={selectedUser} 
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full h-12 bg-muted rounded-xl px-4 border-none focus:ring-2 focus:ring-primary font-bold text-sm outline-none appearance-none"
                >
                    <option value="">Select User...</option>
                    {activeUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                    ))}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground px-1">Authorized Units</label>
                <div className="flex flex-wrap gap-2">
                    {warehouses.map(w => (
                        <button
                            key={w._id}
                            type="button"
                            onClick={() => {
                                if (selectedWarehouses.includes(w._id)) {
                                    setSelectedWarehouses(selectedWarehouses.filter(id => id !== w._id));
                                } else {
                                    setSelectedWarehouses([...selectedWarehouses, w._id]);
                                }
                            }}
                            className={clsx(
                                "text-[10px] font-black uppercase px-3 py-1.5 rounded-full border transition-all",
                                selectedWarehouses.includes(w._id) 
                                    ? "bg-primary text-primary-foreground border-primary" 
                                    : "bg-muted text-muted-foreground border-transparent hover:bg-muted-foreground/10"
                            )}
                        >
                            {w.name}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-end">
                <button
                    onClick={handleManualAssign}
                    disabled={assigning || !selectedUser || selectedWarehouses.length === 0}
                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {assigning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Authorize Access"}
                </button>
            </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pending Approvals
          {pendingRequests.length > 0 && (
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">{pendingRequests.length}</span>
          )}
        </h2>
        
        {pendingRequests.length === 0 ? (
          <div className="bg-card p-12 rounded-[2rem] border-2 border-dashed border-border text-center space-y-4">
            <p className="text-muted-foreground font-bold italic">No pending requests at this time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div key={req._id} className="bg-card p-6 rounded-[2rem] shadow-sm border border-border flex flex-col lg:flex-row gap-6 items-center">
                <div className="flex items-center gap-4 w-full lg:w-1/3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border">
                    {req.userId?.image ? (
                      <img src={req.userId.image} alt={req.userId.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate">{req.userId?.name || "Unknown"}</h3>
                    <p className="text-xs text-muted-foreground font-medium truncate">{req.userId?.email}</p>
                  </div>
                </div>

                <div className="flex-1 w-full grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Unit</p>
                      <p className="font-bold text-sm">{req.warehouseId?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Requested For</p>
                      <p className="font-bold text-sm">{req.requestedDuration} Days</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => handleAction(req._id, "REJECTED")}
                    disabled={processingId === req._id}
                    className="p-3 rounded-xl border border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleAction(req._id, "APPROVED", req.requestedDuration)}
                    disabled={processingId === req._id}
                    className="flex-1 lg:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black transition-all flex items-center justify-center gap-2"
                  >
                    {processingId === req._id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Directory Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" />
          Active Directory
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeUsers.map(user => (
                <div key={user._id} className="bg-card p-6 rounded-[2rem] border border-border shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg">
                        {user.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-black text-foreground">{user.name}</h3>
                        <p className="text-xs font-bold text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider font-sans">Assigned Warehouses</p>
                    <div className="grid grid-cols-1 gap-1">
                        {(user.assignedWarehouses || []).map((aw: any) => (
                            <div key={aw.warehouseId?._id} className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-lg group">
                                <div className="flex items-center gap-3">
                                    <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                                    <div>
                                        <p className="text-[12px] font-bold text-foreground">{aw.warehouseId?.name || "Deleted"}</p>
                                        <p className="text-[10px] text-muted-foreground">Expires: {new Date(aw.expiresAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRevoke(user._id, aw.warehouseId?._id, user.name, aw.warehouseId?.name)}
                                    disabled={processingId === `${user._id}-${aw.warehouseId?._id}`}
                                    className="text-[10px] font-black text-destructive/40 hover:text-destructive p-1 transition-all opacity-0 group-hover:opacity-100"
                                >
                                    REVOKE
                                </button>
                            </div>
                        ))}
                        {(!user.assignedWarehouses || user.assignedWarehouses.length === 0) && (
                            <p className="text-[11px] font-bold text-muted-foreground italic px-1">No assignments yet.</p>
                        )}
                    </div>
                </div>
                </div>
            ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          Recent Activity
        </h2>
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-widest border-b border-border">
                <tr>
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Target Unit</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pastRequests.slice(0, 10).map((req) => (
                  <tr key={req._id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                          {req.userId?.name?.charAt(0)}
                        </div>
                        <span className="font-bold text-sm">{req.userId?.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">{req.warehouseId?.name}</td>
                    <td className="p-4">
                      <span className={clsx(
                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase border",
                        req.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-[11px] text-muted-foreground font-medium">
                      {new Date(req.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
