"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck,
  Loader2,
  Shield,
  Users
} from "lucide-react";
import { useSession } from "next-auth/react";

// ─── Status helpers ──────────────────────────────────────────────────────────
const ACTIVE_THRESHOLD_MS = 15 * 60 * 1000;
type StaffStatus = "active" | "offline" | "never";

function getStatus(lastLoginAt: string | null): StaffStatus {
  if (!lastLoginAt) return "never";
  return Date.now() - new Date(lastLoginAt).getTime() <= ACTIVE_THRESHOLD_MS ? "active" : "offline";
}

function StatusIndicator({ status }: { status: StaffStatus }) {
  if (status === "active") return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
      Active
    </span>
  );
  if (status === "offline") return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600/70">
      <span className="text-emerald-600/70 leading-none">♦</span> Offline
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500">
      <span className="text-rose-400 leading-none">♦</span> Never
    </span>
  );
}

export default function AdminRequestsPage() {
  const { data: session } = useSession();
  const callerRole = (session?.user as any)?.role;
  const isSuperAdmin = callerRole === "SUPER_ADMIN";

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"WAREHOUSE_ADMIN" | "STAFF">("STAFF");
  const [emailsInput, setEmailsInput] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(365);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string>("");

  // Directory selected warehouse state
  const [selectedDirWarehouseId, setSelectedDirWarehouseId] = useState<string>("");

  // Reassignment state
  const [reassigningEmail, setReassigningEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, warehousesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/warehouses")
      ]);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setActiveUsers(usersData);
      }
      if (warehousesRes.ok) {
        const warehousesData = await warehousesRes.json();
        setWarehouses(warehousesData);
        if (warehousesData.length > 0) {
          setSelectedDirWarehouseId(prev => {
            const exists = warehousesData.some((w: any) => w._id === prev);
            return exists ? prev : warehousesData[0]._id;
          });
        }
      }
    } catch (e) {
      console.error("Error loading access directory data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualAssign = async () => {
    setAssignError("");
    if (!selectedWarehouseId || !emailsInput.trim()) {
      setAssignError("Please select a warehouse and enter at least one email.");
      return;
    }

    setAssigning(true);
    try {
      const emails = emailsInput.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e);

      const res = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: selectedWarehouseId,
          emails,
          role: selectedRole,
        })
      });

      if (res.ok) {
        setSelectedWarehouseId("");
        setEmailsInput("");
        setSelectedRole("STAFF");
        await fetchData();
        alert("Access granted successfully!");
      } else {
        const data = await res.json();
        setAssignError(data.error || "Failed to assign access.");
      }
    } catch (e) {
      setAssignError("An error occurred during assignment.");
    } finally {
      setAssigning(false);
    }
  };

  const handlePerformReassign = async (email: string, newWarehouseId: string) => {
    if (!newWarehouseId) return;
    try {
      const res = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: newWarehouseId,
          emails: [email],
          role: "STAFF",
        })
      });

      if (res.ok) {
        setReassigningEmail(null);
        await fetchData();
        alert("Reassigned successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to reassign");
      }
    } catch (e) {
      alert("An error occurred during reassignment");
    }
  };

  const handleRevokeAccess = async (userId: string, warehouseId: string, email: string, warehouseName: string) => {
    if (!confirm(`Are you sure you want to completely REVOKE ${email}'s access to ${warehouseName}? They will be immediately locked out.`)) return;

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

  // Group users by warehouse ID — for BOTH WAREHOUSE_ADMIN and STAFF, use assignedWarehouses
  const adminsByWarehouse: { [warehouseId: string]: any[] } = {};
  const staffByWarehouse:  { [warehouseId: string]: any[] } = {};

  activeUsers.forEach(u => {
    const assigned = u.assignedWarehouses?.[0];
    const wId = assigned?.warehouseId?._id?.toString() || assigned?.warehouseId?.toString();
    
    if (wId) {
      if (u.role === "WAREHOUSE_ADMIN") {
        if (!adminsByWarehouse[wId]) adminsByWarehouse[wId] = [];
        adminsByWarehouse[wId].push(u);
      } else {
        if (!staffByWarehouse[wId]) staffByWarehouse[wId] = [];
        staffByWarehouse[wId].push(u);
      }
    }
  });

  const selectedWarehouse = warehouses.find(w => w._id === selectedDirWarehouseId);
  const selId = selectedWarehouse?._id?.toString() ?? "";
  const selectedAdmins = selId ? (adminsByWarehouse[selId] || []) : [];
  const selectedStaff  = selId ? (staffByWarehouse[selId]  || []) : [];
  const totalAssigned  = selectedAdmins.length + selectedStaff.length;

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
            Access Control
          </h1>
          <p className="text-muted-foreground font-medium">Manage warehouse permissions and active directory.</p>
        </div>
      </div>

      {/* Quick Access Assignment — Super Admin only */}
      {isSuperAdmin && (
        <div className="bg-card p-8 rounded-2xl shadow-erp-card border border-border space-y-6">
          <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Quick Access Assignment
          </h2>

          {assignError && (
            <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-medium">
              {assignError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Warehouse */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground px-1">🏢 Target Warehouse</label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full h-12 bg-muted rounded-[1rem] px-4 border border-border focus:ring-2 focus:ring-primary font-bold text-sm outline-none appearance-none"
              >
                <option value="">Select Warehouse...</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>

            {/* Role Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground px-1">👤 Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "WAREHOUSE_ADMIN" | "STAFF")}
                className="w-full h-12 bg-muted rounded-[1rem] px-4 border border-border focus:ring-2 focus:ring-primary font-bold text-sm outline-none appearance-none"
              >
                <option value="WAREHOUSE_ADMIN">🛡️ Warehouse Admin</option>
                <option value="STAFF">👤 Staff</option>
              </select>
            </div>

            {/* Role hint */}
            {selectedRole === "WAREHOUSE_ADMIN" && (
              <div className="md:col-span-2 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2">
                <Shield className="w-4 h-4 shrink-0" />
                One warehouse can only have <strong>one</strong> Warehouse Admin. One Google account can only be Warehouse Admin for <strong>one</strong> warehouse.
              </div>
            )}

            {/* Google Email IDs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground px-1">
                📧 Google Email {selectedRole === "WAREHOUSE_ADMIN" ? "(one email only)" : "IDs (comma separated)"}
              </label>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder={selectedRole === "WAREHOUSE_ADMIN" ? "admin@gmail.com" : "user1@gmail.com, user2@gmail.com"}
                className="w-full h-12 bg-muted rounded-[1rem] px-4 py-3 border border-border focus:ring-2 focus:ring-primary font-bold text-sm outline-none resize-none"
              />
            </div>

            {/* Authorize Button */}
            <div className="flex items-end">
              <button
                onClick={handleManualAssign}
                disabled={assigning || !selectedWarehouseId || !emailsInput.trim()}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {assigning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "✅ Authorize Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Access Directory Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          WAREHOUSE ACCESS DIRECTORY
        </h2>
        
        <div className="bg-card rounded-2xl border border-border shadow-erp-card grid grid-cols-1 md:grid-cols-12 overflow-hidden min-h-[350px]">
          {/* Left Column: Warehouses list */}
          <div className="md:col-span-4 border-r border-border bg-muted/10 flex flex-col">
            <div className="p-4 border-b border-border bg-muted/20">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Warehouses
              </span>
            </div>
            <div className="divide-y divide-border overflow-y-auto flex-1">
              {warehouses.map(w => {
                const wStrId = w._id.toString();
                const count = (adminsByWarehouse[wStrId]?.length ?? 0) + (staffByWarehouse[wStrId]?.length ?? 0);
                const isSelected = selectedDirWarehouseId === w._id;
                return (
                  <button
                    key={w._id}
                    onClick={() => setSelectedDirWarehouseId(w._id)}
                    className={`w-full text-left p-4 flex justify-between items-center transition-all hover:bg-muted ${
                      isSelected 
                        ? "bg-primary/5 border-l-4 border-primary pl-3 font-bold" 
                        : "pl-4 text-muted-foreground"
                    }`}
                  >
                    <span className={`text-sm ${isSelected ? "text-primary font-bold" : "text-foreground font-medium"}`}>
                      {w.name}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {warehouses.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-4">No warehouses available</p>
              )}
            </div>
          </div>

          {/* Right Column: Assigned users — split into Admin / Staff sections */}
          <div className="md:col-span-8 p-6 flex flex-col">
            {selectedWarehouse ? (
              <div className="space-y-6 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="font-black text-xl text-foreground">{selectedWarehouse.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider font-bold">
                      {selectedAdmins.length} Admin + {selectedStaff.length} Staff = {totalAssigned} {totalAssigned === 1 ? "Assigned User" : "Assigned Users"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6">

                  {/* ── Warehouse Admin Section ── */}
                  <div>
                    <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <Shield className="w-3 h-3" /> Warehouse Admin
                    </span>
                    {selectedAdmins.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No warehouse admin assigned.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {selectedAdmins.map(u => (
                          <div key={u._id} className="flex justify-between items-center py-3 text-sm font-medium">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <StatusIndicator status={getStatus(u.lastLoginAt)} />
                                <span className={`block truncate text-sm font-bold ${
                                  getStatus(u.lastLoginAt) === "active"  ? "text-emerald-500" :
                                  getStatus(u.lastLoginAt) === "offline" ? "text-emerald-700 dark:text-emerald-400" :
                                  "text-rose-500"
                                }`}>{u.email}</span>
                                {u.name && <span className="text-xs text-muted-foreground">{u.name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleRevokeAccess(u._id, selectedWarehouse._id, u.email, selectedWarehouse.name)}
                                  className="text-xs text-destructive hover:underline font-bold px-2 py-1 rounded-lg bg-destructive/10"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* ── Staff Section ── */}
                  <div>
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
                      <Users className="w-3 h-3" /> Staff
                    </span>
                    {selectedStaff.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">No staff assigned to this warehouse.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        {selectedStaff.map(u => (
                          <div key={u._id} className="flex justify-between items-center py-3 text-sm font-medium">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <StatusIndicator status={getStatus(u.lastLoginAt)} />
                                <span className={`block truncate text-sm font-bold ${
                                  getStatus(u.lastLoginAt) === "active"  ? "text-emerald-500" :
                                  getStatus(u.lastLoginAt) === "offline" ? "text-emerald-700 dark:text-emerald-400" :
                                  "text-rose-500"
                                }`}>{u.email}</span>
                                {u.name && <span className="text-xs text-muted-foreground">{u.name}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isSuperAdmin && (
                                <>
                                  {reassigningEmail === u.email ? (
                                    <div className="flex items-center gap-1">
                                      <select
                                        onChange={(e) => handlePerformReassign(u.email, e.target.value)}
                                        defaultValue=""
                                        className="h-8 bg-muted rounded-lg px-2 border border-border text-xs outline-none focus:ring-1 focus:ring-primary"
                                      >
                                        <option value="" disabled>Move to...</option>
                                        {warehouses.filter(wh => wh._id !== selectedWarehouse._id).map(wh => (
                                          <option key={wh._id} value={wh._id}>{wh.name}</option>
                                        ))}
                                      </select>
                                      <button
                                        onClick={() => setReassigningEmail(null)}
                                        className="text-xs text-muted-foreground hover:text-foreground font-bold px-1"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setReassigningEmail(u.email)}
                                        className="text-xs text-primary hover:underline font-bold"
                                      >
                                        Reassign
                                      </button>
                                      <span className="text-muted-foreground/30 text-xs">|</span>
                                      <button
                                        onClick={() => handleRevokeAccess(u._id, selectedWarehouse._id, u.email, selectedWarehouse.name)}
                                        className="text-xs text-destructive hover:underline font-bold"
                                      >
                                        Revoke
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground italic text-sm">
                Select a warehouse to view assigned users.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
