"use client";

import { useState, useEffect } from "react";
import { 
  Loader2,
  Users,
  UserPlus,
  Shield
} from "lucide-react";
import { useSession } from "next-auth/react";

// A user is "currently active" if they logged in within the last 15 minutes
const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;

type StaffStatus = "active" | "offline" | "never";

function getStatus(lastLoginAt: string | null): StaffStatus {
  if (!lastLoginAt) return "never";
  const diff = Date.now() - new Date(lastLoginAt).getTime();
  return diff <= ACTIVE_THRESHOLD_MS ? "active" : "offline";
}

function StatusIndicator({ status }: { status: StaffStatus }) {
  if (status === "active") {
    return (
      <span title="Currently Active" className="flex items-center gap-1 text-xs font-bold text-emerald-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.5)] animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span title="Previously logged in — currently offline" className="flex items-center gap-1 text-xs font-bold text-emerald-600/70">
        <span className="text-emerald-600/70 text-base leading-none select-none">♦</span>
        Offline
      </span>
    );
  }
  // never
  return (
    <span title="Never logged in" className="flex items-center gap-1 text-xs font-bold text-rose-500">
      <span className="text-rose-400 text-base leading-none select-none">♦</span>
      Never Logged In
    </span>
  );
}

export default function StaffPage() {
  const { data: session } = useSession();
  const callerRole = (session?.user as any)?.role;
  const isWarehouseAdmin = callerRole === "WAREHOUSE_ADMIN";
  const isSuperAdmin = callerRole === "SUPER_ADMIN";
  const activeWarehouseId = (session?.user as any)?.activeWarehouseId;

  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment state
  const [emailsInput, setEmailsInput] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const usersRes = await fetch("/api/staff");
      if (usersRes.ok) {
        let usersData = await usersRes.json();
        
        // Extra client-side guard for activeWarehouseId consistency (applies to both Super Admin & Warehouse Admin).
        if (activeWarehouseId) {
            usersData = usersData.filter((u: any) => 
                u.assignedWarehouses?.some((w: any) => 
                    w.warehouseId?._id === activeWarehouseId || w.warehouseId === activeWarehouseId
                )
            );
        }
        setActiveUsers(usersData);
      }
    } catch (e) {
      console.error("Error loading staff data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantStaffAccess = async () => {
    setAssignError("");
    if (!emailsInput.trim()) {
      setAssignError("Please enter at least one email.");
      return;
    }

    if (!activeWarehouseId) {
        setAssignError("No active warehouse context to assign staff.");
        return;
    }

    setAssigning(true);
    try {
      const emails = emailsInput.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e);

      const res = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: activeWarehouseId,
          emails,
          role: "STAFF",
        })
      });

      if (res.ok) {
        setEmailsInput("");
        await fetchData();
        alert("Staff access granted successfully!");
      } else {
        const data = await res.json();
        setAssignError(data.error || "Failed to grant staff access.");
      }
    } catch (e) {
      setAssignError("An error occurred during assignment.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeAccess = async (userId: string, warehouseId: string, email: string) => {
    if (!confirm(`Are you sure you want to completely REVOKE ${email}'s access?`)) return;

    try {
      const res = await fetch(`/api/admin/users/revoke?userId=${userId}&warehouseId=${warehouseId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchData();
        alert("Access revoked successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to revoke access");
      }
    } catch (e) {
      alert("An error occurred during revocation");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Staff Management
          </h1>
          <p className="text-muted-foreground font-medium">Manage your warehouse staff and their access.</p>
        </div>
      </div>

      {/* Grant Staff Access */}
      {(isWarehouseAdmin || (isSuperAdmin && activeWarehouseId)) && (
        <div className="bg-card p-8 rounded-2xl shadow-erp-card border border-border space-y-6">
          <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Quick Staff Assignment
          </h2>

          {assignError && (
            <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
              {assignError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Google Email IDs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground px-1">
                📧 Google Email IDs (comma separated)
              </label>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder={"user1@gmail.com, user2@gmail.com"}
                className="w-full h-12 bg-muted rounded-[1rem] px-4 py-3 border border-border focus:ring-2 focus:ring-primary font-bold text-sm outline-none resize-none"
              />
            </div>

            {/* Authorize Button */}
            <div>
              <button
                onClick={handleGrantStaffAccess}
                disabled={assigning || !emailsInput.trim()}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {assigning ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                    <>
                        ➕ Grant Staff Access
                    </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Directory Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground tracking-tight">
            STAFF DIRECTORY
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> Active
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-600/70 text-sm">♦</span> Offline
            </span>
            <span className="flex items-center gap-1">
              <span className="text-rose-400 text-sm">♦</span> Never Logged In
            </span>
          </div>
        </div>
        
        <div className="bg-card rounded-2xl border border-border shadow-erp-card">
          <div className="p-6">
            <div className="space-y-6">
                {isSuperAdmin && (
                  <div>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <Shield className="w-3 h-3" /> Warehouse Admin
                    </span>
                    {activeUsers.filter(u => u.role === "WAREHOUSE_ADMIN").length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No warehouse admin assigned.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {activeUsers.filter(u => u.role === "WAREHOUSE_ADMIN").map(u => {
                            const assignedW = u.assignedWarehouses?.[0];
                            const wId = assignedW?.warehouseId?._id?.toString() || assignedW?.warehouseId?.toString();
                            const status = getStatus(u.lastLoginAt);
                            const emailColorClass =
                              status === "active"   ? "text-emerald-500 font-bold" :
                              status === "offline"  ? "text-emerald-700 dark:text-emerald-400 font-bold" :
                              "text-rose-500 font-bold";

                            return (
                                <div key={u._id} className="flex justify-between items-center py-4 text-sm font-medium">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <StatusIndicator status={status} />
                                        </div>
                                        <span className={`truncate block mt-0.5 ${emailColorClass}`}>{u.email}</span>
                                        <span className="text-xs text-muted-foreground">{u.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => handleRevokeAccess(u._id, wId, u.email)}
                                        className="text-xs text-destructive hover:underline font-bold px-3 py-1.5 rounded-lg bg-destructive/10"
                                    >
                                        Revoke Access
                                    </button>
                                </div>
                                </div>
                            )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {isSuperAdmin && <div className="border-t border-border" />}

                <div>
                  {isSuperAdmin && (
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <Users className="w-3 h-3" /> Staff Directory
                    </span>
                  )}
                  {activeUsers.filter(u => u.role === "STAFF").length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4">No staff members found.</p>
                  ) : (
                      <div className="divide-y divide-border">
                          {activeUsers.filter(u => u.role === "STAFF").map(u => {
                              const assignedW = u.assignedWarehouses?.[0];
                              const wId = assignedW?.warehouseId?._id?.toString() || assignedW?.warehouseId?.toString();
                              const status = getStatus(u.lastLoginAt);
                              const emailColorClass =
                                status === "active"   ? "text-emerald-500 font-bold" :
                                status === "offline"  ? "text-emerald-700 dark:text-emerald-400 font-bold" :
                                "text-rose-500 font-bold";

                              return (
                                  <div key={u._id} className="flex justify-between items-center py-4 text-sm font-medium">
                                  <div className="flex items-center gap-4 min-w-0">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                          <Users className="w-5 h-5 text-primary" />
                                      </div>
                                      <div className="min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <StatusIndicator status={status} />
                                          </div>
                                          <span className={`truncate block mt-0.5 ${emailColorClass}`}>{u.email}</span>
                                          <span className="text-xs text-muted-foreground">{u.name}</span>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                      <button
                                          onClick={() => handleRevokeAccess(u._id, wId, u.email)}
                                          className="text-xs text-destructive hover:underline font-bold px-3 py-1.5 rounded-lg bg-destructive/10"
                                      >
                                          Revoke Access
                                      </button>
                                  </div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


