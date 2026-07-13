"use client";

import { useState, useEffect } from "react";
import { 
  ShieldCheck,
  Loader2
} from "lucide-react";

export default function AdminRequestsPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("");
  const [emailsInput, setEmailsInput] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

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
      if (!selectedWarehouseId || !emailsInput.trim()) {
          alert("Please select a warehouse and enter at least one email");
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
                  emails: emails
              })
          });

          if (res.ok) {
              setSelectedWarehouseId("");
              setEmailsInput("");
              await fetchData();
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

  const handlePerformReassign = async (email: string, newWarehouseId: string) => {
    if (!newWarehouseId) return;
    try {
      const res = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: newWarehouseId,
          emails: [email]
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

  // Group users by warehouse ID
  const usersByWarehouse: { [warehouseId: string]: any[] } = {};
  activeUsers.forEach(u => {
    const assigned = u.assignedWarehouses?.[0];
    const wId = assigned?.warehouseId?._id?.toString() || assigned?.warehouseId?.toString();
    if (wId) {
      if (!usersByWarehouse[wId]) {
        usersByWarehouse[wId] = [];
      }
      usersByWarehouse[wId].push(u);
    }
  });

  const selectedWarehouse = warehouses.find(w => w._id === selectedDirWarehouseId);
  const selectedWarehouseAssignedUsers = selectedWarehouse
    ? (usersByWarehouse[selectedWarehouse._id.toString()] || [])
    : [];

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

      {/* Manual Assignment Section */}
      <div className="bg-card p-8 rounded-2xl shadow-erp-card border border-border space-y-6">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Quick Access Assignment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground px-1">Target Warehouse</label>
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
            <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground px-1">Google Email IDs (Comma separated)</label>
                <textarea
                    value={emailsInput}
                    onChange={(e) => setEmailsInput(e.target.value)}
                    placeholder="user1@gmail.com, user2@gmail.com"
                    className="w-full h-12 bg-muted rounded-[1rem] px-4 py-3 border border-border focus:ring-2 focus:ring-primary font-bold text-sm outline-none resize-none"
                />
            </div>
            <div className="flex items-end">
                <button
                    onClick={handleManualAssign}
                    disabled={assigning || !selectedWarehouseId || !emailsInput.trim()}
                    className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {assigning ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Authorize Access"}
                </button>
            </div>
        </div>
      </div>

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
                const assigned = usersByWarehouse[w._id.toString()] || [];
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
                      {assigned.length}
                    </span>
                  </button>
                );
              })}
              {warehouses.length === 0 && (
                <p className="text-xs text-muted-foreground italic p-4">No warehouses available</p>
              )}
            </div>
          </div>

          {/* Right Column: Assigned users */}
          <div className="md:col-span-8 p-6 flex flex-col">
            {selectedWarehouse ? (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h3 className="font-black text-xl text-foreground">{selectedWarehouse.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider font-bold">
                      {selectedWarehouseAssignedUsers.length} {selectedWarehouseAssignedUsers.length === 1 ? "Assigned User" : "Assigned Users"}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-4">
                    Assigned Google Email IDs
                  </span>
                  <div className="divide-y divide-border">
                    {selectedWarehouseAssignedUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-4">No users assigned to this warehouse.</p>
                    ) : (
                      selectedWarehouseAssignedUsers.map(u => (
                        <div key={u._id} className="flex justify-between items-center py-3 text-sm font-medium">
                          <span className="text-foreground truncate max-w-[200px] sm:max-w-md">{u.email}</span>
                          <div className="flex items-center gap-2">
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
                          </div>
                        </div>
                      ))
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
