"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Package, Plus, ArrowRight, Building2, CheckCircle, LogOut, Users, Trash2, Pencil } from "lucide-react";
import clsx from "clsx";
import axios from "axios";
import { useGodown } from "@/components/GodownProvider";

interface Warehouse {
    id: string;
    name: string;
    location: string;
}

interface AccessRequest {
    id: string;
    warehouseId: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
    user: {
        id: string;
        name: string;
        email: string;
        image?: string;
    };
    warehouse: {
        id: string;
        name: string;
    };
}

export default function WarehouseSelectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { setSelectedWarehouse } = useGodown();

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
    const [staffList, setStaffList] = useState<AccessRequest[]>([]);
    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [view, setView] = useState<"SELECT" | "CREATE" | "REQUESTS" | "STAFF">("SELECT");
    const [searchQuery, setSearchQuery] = useState("");

    // Form States
    const [newName, setNewName] = useState("");
    const [newLocation, setNewLocation] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Staff States
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editStaffEmail, setEditStaffEmail] = useState("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session?.user as any)?.role;

    // Redirect to login if unauthenticated
    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/api/auth/signin?callbackUrl=/select-org");
        }
    }, [status, router]);

    // Initial Fetch
    useEffect(() => {
        if (status === "authenticated") {
            fetchWarehouses();
            if (userRole === "ADMIN") {
                fetchRequests();
                fetchStaff();
            } else {
                fetchMyRequests();
            }
        }
    }, [status, userRole]);

    const fetchMyRequests = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/my-requests");
            setMyRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch my requests", error);
            setMyRequests([]);
        }
    }

    const fetchWarehouses = async () => {
        try {
            const res = await axios.get("/api/warehouses");
            const data = Array.isArray(res.data) ? res.data : [];
            setWarehouses(data);
            if (data.length === 0 && userRole === "ADMIN") {
                setView("CREATE");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/requests");
            setPendingRequests(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await axios.get("/api/warehouse-access/staff");
            setStaffList(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch staff", error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await axios.post("/api/warehouses", { name: newName, location: newLocation });
            await fetchWarehouses();
            setView("SELECT");
            setSelectedWarehouse({ ...res.data });
            // Set cookie
            document.cookie = `warehouseId=${res.data.id}; path=/; max-age=31536000`;
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to create warehouse", error);
            alert("Failed to create warehouse");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequest = async (warehouseId: string) => {
        setIsSubmitting(true);
        try {
            await axios.post("/api/warehouse-access/request", { warehouseId });
            alert("Access requested! Please wait for admin approval.");
            fetchMyRequests(); // Refresh status
        } catch (error: any) {
            console.error("Failed to request access", error);
            const msg = error.response?.data?.error || "Failed to request access.";
            alert(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async (requestId: string, status: "APPROVED" | "REJECTED") => {
        try {
            await axios.put("/api/warehouse-access/approve", { requestId, status, role: "STAFF" });
            fetchRequests(); // Refresh list
            fetchStaff(); // Refresh staff list if approved/rejected
        } catch (error) {
            console.error("Failed to update request", error);
            alert("Failed to update request");
        }
    }

    const handleRemoveStaff = async (requestId: string) => {
        if (!confirm("Are you sure you want to remove this staff member?")) return;
        handleApprove(requestId, "REJECTED");
    };

    const handleSelect = (warehouse: Warehouse) => {
        setSelectedWarehouse(warehouse);
        // Set cookie for server-side access (Dashboard)
        document.cookie = `warehouseId=${warehouse.id}; path=/; max-age=31536000`; // 1 year
        router.push("/dashboard");
    };

    // Helper to get my access info for a warehouse
    const getMyAccess = (warehouseId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return myRequests.find((r: any) => r.warehouseId === warehouseId) || null;
    };

    // Filter warehouses based on search
    const filteredWarehouses = warehouses.filter(wh =>
        wh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wh.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
    }

    if (status === "unauthenticated") {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center relative">
            <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="absolute top-4 right-4 text-gray-500 hover:text-red-600 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium"
            >
                <LogOut className="w-4 h-4" />
                Sign Out
            </button>
            <div className="max-w-4xl w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto w-16 h-16 bg-ruby-100 rounded-2xl flex items-center justify-center text-ruby-600 mb-6">
                        <Package className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        {view === "CREATE" ? "Setup New Warehouse" : "Select Warehouse"}
                    </h2>

                    {/* Admin Tabs */}
                    {userRole === "ADMIN" && view !== "CREATE" && (
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={() => setView("SELECT")}
                                className={clsx(
                                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                                    view === "SELECT" ? "bg-ruby-600 text-white" : "text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                Warehouses
                            </button>
                            <button
                                onClick={() => setView("REQUESTS")}
                                className={clsx(
                                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
                                    view === "REQUESTS" ? "bg-ruby-600 text-white" : "text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                Requests
                                {pendingRequests.length > 0 && (
                                    <span className="bg-white text-ruby-600 text-xs px-2 py-0.5 rounded-full font-bold">
                                        {pendingRequests.length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setView("STAFF")}
                                className={clsx(
                                    "px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2",
                                    view === "STAFF" ? "bg-ruby-600 text-white" : "text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                <Users className="w-4 h-4" />
                                Manage Staff
                            </button>
                        </div>
                    )}
                </div>

                {/* View Switcher/Content */}
                {view === "CREATE" && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md mx-auto">
                        <form onSubmit={handleCreate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Warehouse Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-ruby-500 focus:border-ruby-500"
                                    placeholder="e.g. Hyderabad Central"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Location / City</label>
                                <input
                                    type="text"
                                    required
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-ruby-500 focus:border-ruby-500"
                                    placeholder="e.g. Hyderabad"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-ruby-600 hover:bg-ruby-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ruby-500 disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : "Create Godown"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setView("SELECT")}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                        </form>
                    </div>
                )}

                {view === "SELECT" && (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            {/* Search Bar */}
                            <div className="relative w-full md:w-96">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-ruby-500 focus:border-ruby-500 sm:text-sm transition duration-150 ease-in-out"
                                    placeholder="Search warehouses..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {userRole === "ADMIN" && (
                                <button
                                    onClick={() => setView("CREATE")}
                                    className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm font-medium w-full md:w-auto justify-center"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Warehouse
                                </button>
                            )}
                        </div>

                        {Array.isArray(filteredWarehouses) && filteredWarehouses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredWarehouses.map((wh) => {
                                    const access = getMyAccess(wh.id);
                                    const status = access?.status;
                                    const isExpired = access?.isExpired;

                                    return (
                                        <div key={wh.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-ruby-500 hover:ring-1 hover:ring-ruby-500 transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-ruby-700 transition-colors">{wh.name}</h3>
                                                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                                                        <Building2 className="w-3 h-3" /> {wh.location}
                                                    </p>
                                                </div>

                                                {/* Button Logic */}
                                                {userRole === "ADMIN" ? (
                                                    <button
                                                        onClick={() => handleSelect(wh)}
                                                        className="bg-ruby-50 text-ruby-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-ruby-100"
                                                    >
                                                        Enter Warehouse <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <>
                                                        {status === "APPROVED" && !isExpired && (
                                                            <button
                                                                onClick={() => handleSelect(wh)}
                                                                className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-100"
                                                            >
                                                                Enter Warehouse <ArrowRight className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {status === "APPROVED" && isExpired && (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Access Expired</span>
                                                                <button
                                                                    onClick={() => handleRequest(wh.id)}
                                                                    className="bg-gray-50 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200"
                                                                >
                                                                    Renew Access
                                                                </button>
                                                            </div>
                                                        )}
                                                        {status === "PENDING" && (
                                                            <button
                                                                disabled
                                                                className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg text-sm font-bold opacity-75 cursor-not-allowed"
                                                            >
                                                                Pending Approval
                                                            </button>
                                                        )}
                                                        {status === "REJECTED" && (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Rejected</span>
                                                                <button
                                                                    onClick={() => handleRequest(wh.id)}
                                                                    className="bg-gray-50 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200"
                                                                >
                                                                    Request Again
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!status && (
                                                            <button
                                                                onClick={() => handleRequest(wh.id)}
                                                                className="bg-gray-50 text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200"
                                                            >
                                                                Request Access
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No warehouses found</h3>
                                <p className="text-gray-500 mt-1 mb-6">Create your first warehouse to get started.</p>
                                <button
                                    onClick={() => setView("CREATE")}
                                    className="inline-flex items-center gap-2 bg-ruby-600 text-white px-5 py-2.5 rounded-xl hover:bg-ruby-700 font-medium"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Now
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {view === "REQUESTS" && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {Array.isArray(pendingRequests) && pendingRequests.length === 0 ? (
                            <div className="text-center py-12">
                                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No pending requests</h3>
                                <p className="text-gray-500">All caught up!</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {Array.isArray(pendingRequests) && pendingRequests.map((req) => (
                                    <li key={req.id} className="p-6 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900">{req.user.name}</h4>
                                            <p className="text-sm text-gray-500">{req.user.email}</p>
                                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Requested:</span> {req.warehouse.name}
                                                <span className="text-xs text-gray-400">• {new Date(req.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApprove(req.id, "APPROVED")}
                                                className="bg-green-50 text-green-700 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleApprove(req.id, "REJECTED")}
                                                className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {view === "STAFF" && (
                    <div className="space-y-6">
                        {/* Add Staff Form */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Staff Member</h3>
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
                                    const warehouseId = (form.elements.namedItem("warehouseId") as HTMLSelectElement).value;

                                    if (!email || !warehouseId) return;
                                    setIsSubmitting(true);
                                    try {
                                        await axios.post("/api/warehouse-access/invite", { email, warehouseId });
                                        alert("Staff member added successfully!");
                                        form.reset();
                                        fetchStaff();
                                    } catch (err) {
                                        console.error(err);
                                        alert("Failed to add staff member.");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="staff@example.com"
                                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-ruby-500 focus:border-ruby-500"
                                />
                                <select
                                    name="warehouseId"
                                    required
                                    className="px-4 py-2 border rounded-lg bg-white focus:ring-ruby-500 focus:border-ruby-500"
                                >
                                    <option value="">Select Warehouse</option>
                                    {warehouses.map(wh => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-ruby-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-ruby-700 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? "Adding..." : "Add Staff"}
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            {!Array.isArray(staffList) || staffList.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900">No active staff found</h3>
                                    <p className="text-gray-500">Approve requests to add staff.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-200">
                                    {staffList.map((req: any) => (
                                        <li key={req.id} className="p-6 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                                    {req.user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-lg font-bold text-gray-900">{req.user.name}</h4>
                                                        {req.isExpired && (
                                                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold uppercase">Expired</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">{req.user.email}</p>
                                                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                                                        <span className="font-medium">Access to:</span> {req.warehouse.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {editingStaffId === req.user.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            className="px-2 py-1 border rounded text-sm w-48"
                                                            value={editStaffEmail}
                                                            onChange={(e) => setEditStaffEmail(e.target.value)}
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await axios.patch(`/api/users/${req.user.id}`, { email: editStaffEmail });
                                                                    setEditingStaffId(null);
                                                                    fetchStaff();
                                                                } catch (err) {
                                                                    alert("Update failed");
                                                                }
                                                            }}
                                                            className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold"
                                                        >
                                                            Save
                                                        </button>
                                                        <button onClick={() => setEditingStaffId(null)} className="text-gray-400 text-xs">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingStaffId(req.user.id);
                                                            setEditStaffEmail(req.user.email);
                                                        }}
                                                        className="text-gray-400 hover:text-ruby-600 p-2 rounded-lg transition-colors"
                                                        title="Edit Email"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveStaff(req.id)}
                                                    className="text-gray-400 hover:text-red-600 p-2 rounded-lg transition-colors"
                                                    title="Remove Staff"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
