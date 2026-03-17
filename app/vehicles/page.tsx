"use client";

import { useState, useEffect } from "react";
import { Plus, Truck, User } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

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
                body: JSON.stringify({
                    number,
                    driverName: driver
                }),
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

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Vehicle Management</h1>

            {/* Check Sidebar links if this page is accessible. I didn't add it to Sidebar.tsx yet. I should. */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-ruby-700" /></div>
                    ) : vehicles.length === 0 ? (
                        <p className="text-gray-500">No vehicles found.</p>
                    ) : (
                        vehicles.map((v: any) => (
                            <div key={v._id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-ruby-50 p-3 rounded-full text-ruby-700">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{v.number}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                            <User className="w-4 h-4" />
                                            {v.driverName}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ))
                    )}
                </div>

                {/* Add Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-ruby-700" />
                        Add New Vehicle
                    </h2>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Vehicle Number</label>
                            <input
                                value={number}
                                onChange={(e) => setNumber(e.target.value)}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900"
                                placeholder="KA-05-AB-1234"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Driver Name</label>
                            <input
                                value={driver}
                                onChange={(e) => setDriver(e.target.value)}
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 text-gray-900"
                                placeholder="John Doe"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={adding}
                            className="w-full bg-ruby-700 hover:bg-ruby-800 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            {adding ? "Adding..." : "Add Vehicle"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
