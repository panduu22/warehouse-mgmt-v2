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
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

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

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", duration?: number) => {
    setProcessingId(id);
    const adminNotes = prompt(status === "APPROVED" ? "Enter any notes for the user (optional):" : "Why is this request being rejected?");
    
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
          durationDays: duration || 30
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
      <div className="flex items-center justify-center min-h-screen bg-snow">
        <Loader2 className="w-12 h-12 text-ruby-700 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const pastRequests = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12 space-y-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            Access Requests
            <span className="bg-ruby-100 text-ruby-700 text-sm px-3 py-1 rounded-full">{pendingRequests.length} Pending</span>
          </h1>
          <p className="text-gray-500 font-medium">Manage warehouse access permissions and duration.</p>
        </div>
      </div>

      {/* Pending Requests Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pending Approvals
        </h2>
        
        {pendingRequests.length === 0 ? (
          <div className="bg-white p-16 rounded-[2rem] border-2 border-dashed border-gray-100 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-10 h-10 text-gray-200" />
            </div>
            <p className="text-gray-400 font-bold text-lg">Clean slate! No pending requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div key={req._id} className="bg-white p-8 rounded-[2rem] shadow-xl shadow-ruby-900/5 border border-gray-100 flex flex-col lg:flex-row gap-8 items-center">
                
                {/* User Info */}
                <div className="flex items-center gap-4 w-full lg:w-1/3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white shadow-sm">
                    {req.userId.image ? (
                      <img src={req.userId.image} alt={req.userId.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-gray-900 text-xl truncate">{req.userId.name}</h3>
                    <p className="text-sm text-gray-500 font-bold truncate">{req.userId.email}</p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="flex-1 w-full grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-10 h-10 bg-ruby-50 rounded-xl flex items-center justify-center text-ruby-600">
                      <Warehouse className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-sans">Target Warehouse</p>
                      <p className="font-bold">{req.warehouseId?.name || "Deleted Warehouse"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider font-sans">Requested For</p>
                      <p className="font-bold">{req.requestedDuration} Days</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={() => handleAction(req._id, "REJECTED")}
                    disabled={processingId === req._id}
                    className="flex-1 lg:flex-none px-6 py-4 rounded-xl border-2 border-gray-100 hover:border-red-200 hover:bg-red-50 text-gray-500 hover:text-red-700 font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(req._id, "APPROVED")}
                    disabled={processingId === req._id}
                    className="flex-[2] lg:flex-none px-10 py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-lg shadow-teal-900/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {processingId === req._id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Approve Access
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Directory Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" />
          Active Directory
        </h2>
        
        {activeUsers.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-gray-100 text-center text-gray-400 font-bold">
            No staff members currently have active warehouse assignments.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeUsers.map(user => (
              <div key={user._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-black text-lg">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">{user.name}</h3>
                    <p className="text-xs font-bold text-gray-400">{user.email}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mt-2">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Assigned Warehouses</p>
                  {(user.assignedWarehouses || [])
                    .filter((aw: any) => aw.warehouseId) // Only show valid warehouses
                    .map((aw: any) => (
                    <div key={aw.warehouseId?._id} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Warehouse className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-bold text-gray-700">{aw.warehouseId?.name}</p>
                          <p className="text-xs text-gray-500">Expires: {new Date(aw.expiresAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(user._id, aw.warehouseId?._id, user.name, aw.warehouseId?.name)}
                        disabled={processingId === `${user._id}-${aw.warehouseId?._id}`}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processingId === `${user._id}-${aw.warehouseId?._id}` ? "Revoking..." : "Revoke"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Requests Section */}
      <div className="space-y-6">
        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          Recent Activity
        </h2>
        
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Warehouse</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Processed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pastRequests.map((req) => (
                <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {req.userId.name.charAt(0)}
                      </div>
                      <span className="font-bold text-gray-900">{req.userId.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-600">{req.warehouseId?.name || "Deleted Warehouse"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter",
                      req.status === "APPROVED" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"
                    )}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-medium">
                    {new Date(req.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {pastRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 font-bold">No past activity to show.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
