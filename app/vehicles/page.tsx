"use client";

import { useState, useEffect } from "react";
import { Plus, Truck, User, Loader2 } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import axios from "axios";

interface Vehicle {
    id: string;
    number: string;
    driverName: string;
    status: string;
}

export default function VehiclesPage() {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(false);

    // Form State
    const [number, setNumber] = useState("");
    const [driver, setDriver] = useState("");

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchVehicles();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    async function fetchVehicles() {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const res = await axios.get(`/api/vehicles?warehouseId=${selectedWarehouse.id}`);
            setVehicles(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error(e);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedWarehouse) return;

        setAdding(true);
        try {
            await axios.post("/api/vehicles", {
                number,
                driverName: driver,
                warehouseId: selectedWarehouse.id
            });

            setNumber("");
            setDriver("");
            fetchVehicles();
        } catch (e: any) {
            console.error(e);
            alert("Failed to add vehicle");
        } finally {
            setAdding(false);
        }
    }

    if (isWarehouseLoading) return <div className="p-8"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-8">Please select a warehouse.</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Vehicle Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-ruby-700" /></div>
                    ) : !Array.isArray(vehicles) || vehicles.length === 0 ? (
                        <p className="text-gray-500">No vehicles found in {selectedWarehouse.name}.</p>
                    ) : (
                        Array.isArray(vehicles) && vehicles.map((v) => (
                            <div key={v.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
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
                                <div className="text-xs uppercase font-bold tracking-wider text-gray-400 bg-gray-50 px-2 py-1 rounded">
                                    {v.status}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit sticky top-4">
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
