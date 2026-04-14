"use client";

import { useState, useEffect } from "react";
import { Plus, Truck, User, Trash2, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

export default function VehiclesPage() {
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [number, setNumber] = useState("");
    const [driver, setDriver] = useState("");

    async function fetchVehicles() {
        try {
            const res = await fetch("/api/vehicles");
            if (res.ok) {
                const data = await res.json();
                setVehicles(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchVehicles();
    }, []);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        setAdding(true);
        try {
            const res = await fetch("/api/vehicles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number, driverName: driver }),
            });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to add vehicle");
            }
            setNumber("");
            setDriver("");
            fetchVehicles();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Failed to add vehicle");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string, vehicleNumber: string) {
        if (!confirm(`Delete vehicle ${vehicleNumber}? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to delete vehicle");
            }
            fetchVehicles();
        } catch (e: any) {
            alert(e.message || "Failed to delete vehicle");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="max-w-[1200px] mx-auto animate-in fade-in duration-500 pb-10">
            <h1 className="text-3xl font-black text-foreground mb-8 tracking-tight flex items-center gap-3">
                <Truck className="w-8 h-8 text-primary" />
                Vehicle Management
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-12 bg-card rounded-2xl border border-border">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border">
                            <p className="text-muted-foreground font-medium">No vehicles found in the fleet.</p>
                        </div>
                    ) : (
                        vehicles.map((v: any) => (
                            <div
                                key={v._id}
                                className="bg-card p-6 rounded-2xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-4 rounded-xl text-primary border border-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground text-lg">{v.number}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 font-medium italic">
                                            <User className="w-4 h-4" />
                                            {v.driverName}
                                        </div>
                                    </div>
                                </div>

                                {/* Admin-only delete button */}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(v._id, v.number)}
                                        disabled={deletingId === v._id}
                                        title="Delete vehicle"
                                        className="p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:opacity-50 active:scale-90"
                                    >
                                        {deletingId === v._id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Add Form */}
                <div className="bg-card p-8 rounded-2xl shadow-sm border border-border h-fit sticky top-24">
                    <h2 className="text-lg font-black text-foreground mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add New Vehicle
                    </h2>
                    <form onSubmit={handleAdd} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block px-1">Vehicle Number</label>
                            <input
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/50"
                                placeholder="KA-05-AB-1234"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block px-1">Driver Name</label>
                            <input
                                value={driver}
                                onChange={(e) => setDriver(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground transition-all placeholder:text-muted-foreground/50"
                                placeholder="John Doe"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3.5 rounded-xl font-black transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            {adding ? "Registering..." : "Add to Fleet"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
