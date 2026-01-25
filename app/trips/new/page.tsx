"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, Plus, ArrowLeft, Truck, PackagePlus, Check } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import axios from "axios";
import { useGodown } from "@/components/GodownProvider";

export default function NewTripPage() {
    const router = useRouter();
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();

    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [vehicles, setVehicles] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]);

    const [selectedVehicle, setSelectedVehicle] = useState("");

    // Manifest State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [manifest, setManifest] = useState<any[]>([]);

    // Guided Selection State
    const [selectedFlavour, setSelectedFlavour] = useState("");
    const [selectedPack, setSelectedPack] = useState("");
    const [addQuantity, setAddQuantity] = useState(1);

    // Derived Data
    const [availableFlavours, setAvailableFlavours] = useState<string[]>([]);
    const [availablePacks, setAvailablePacks] = useState<string[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [targetProduct, setTargetProduct] = useState<any>(null);

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchData();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    const fetchData = async () => {
        if (!selectedWarehouse) return;
        try {
            const [vRes, pRes] = await Promise.all([
                axios.get(`/api/vehicles?warehouseId=${selectedWarehouse.id}`),
                axios.get(`/api/products?warehouseId=${selectedWarehouse.id}`)
            ]);
            setVehicles(Array.isArray(vRes.data) ? vRes.data : []);

            const prodData = Array.isArray(pRes.data) ? pRes.data : [];
            setProducts(prodData);

            // Extract unique flavours
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const flavs = Array.from(new Set(prodData.map((p: any) => p.flavour).filter(Boolean))) as string[];
            setAvailableFlavours(flavs.sort());
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    // Update Available Packs when Flavour Changes
    useEffect(() => {
        if (selectedFlavour) {
            const packs = products
                .filter(p => p.flavour === selectedFlavour)
                .map(p => p.pack)
                .filter(Boolean);

            const uniquePacks = Array.from(new Set(packs)) as string[];

            // Sort logic: ml first, then Ltr
            uniquePacks.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();

                const isAMl = aLower.includes("ml");
                const isBMl = bLower.includes("ml");
                const isALtr = aLower.includes("ltr") || aLower.includes("liter");
                const isBLtr = bLower.includes("ltr") || bLower.includes("liter");

                if (isAMl && !isBMl) return -1;
                if (!isAMl && isBMl) return 1;
                if ((isAMl && isBMl) || (isALtr && isBLtr)) {
                    const numA = parseFloat(a.replace(/[^0-9.]/g, ""));
                    const numB = parseFloat(b.replace(/[^0-9.]/g, ""));
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                }
                return a.localeCompare(b);
            });

            setAvailablePacks(uniquePacks);
        } else {
            setAvailablePacks([]);
        }
    }, [selectedFlavour, products]);

    // Determine Target Product when Flavour & Pack are selected
    useEffect(() => {
        if (selectedFlavour && selectedPack) {
            const prod = products.find(p => p.flavour === selectedFlavour && p.pack === selectedPack);
            setTargetProduct(prod || null);
            if (prod) setAddQuantity(1);
        } else {
            setTargetProduct(null);
        }
    }, [selectedFlavour, selectedPack, products]);

    const addToManifest = () => {
        if (!targetProduct || addQuantity <= 0) return;

        // Check stock locally
        if (addQuantity > targetProduct.quantity) {
            alert(`Insufficient stock! Available: ${targetProduct.quantity}`);
            return;
        }

        // Check if already in manifest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingIndex = manifest.findIndex((item: any) => item.productId === targetProduct.id);

        if (existingIndex >= 0) {
            // Update quantity
            const newManifest = [...manifest];
            const newQty = newManifest[existingIndex].qtyLoaded + addQuantity;
            if (newQty > targetProduct.quantity) {
                alert(`Cannot add more. Total would exceed stock.`);
                return;
            }
            newManifest[existingIndex].qtyLoaded = newQty;
            setManifest(newManifest);
        } else {
            setManifest([...manifest, {
                productId: targetProduct.id,
                name: targetProduct.name,
                flavour: targetProduct.flavour,
                pack: targetProduct.pack,
                qtyLoaded: addQuantity,
                currentStock: targetProduct.quantity
            }]);
        }

        setAddQuantity(1);
        setSelectedPack("");
    };

    const removeFromManifest = (index: number) => {
        setManifest(manifest.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedVehicle) return alert("Select a vehicle");
        if (manifest.length === 0) return alert("Add items to load");
        if (!selectedWarehouse) return;

        setLoading(true);
        try {
            await axios.post("/api/trips", {
                vehicleId: selectedVehicle,
                warehouseId: selectedWarehouse.id,
                items: manifest.map(m => ({
                    productId: m.productId,
                    qtyLoaded: m.qtyLoaded
                })),
            });

            router.push("/trips");
            router.refresh(); // Refresh (though Next.js refresh sometimes tricky with client route)
        } catch (err: any) {
            alert(err.response?.data?.error || err.message || "Failed to create trip");
        } finally {
            setLoading(false);
        }
    };

    if (isWarehouseLoading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!selectedWarehouse) return <div className="p-12 text-center">Select a warehouse first.</div>;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Load Vehicle</h1>
                    <p className="text-sm text-gray-500">{selectedWarehouse.name} • Create Manifest</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT: Selection Area */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Vehicle Selector */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-ruby-600" />
                            1. Select Vehicle
                        </h2>
                        {vehicles.length === 0 ? (
                            <p className="text-gray-500 text-sm">No vehicles found. Add one in Vehicles tab.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {vehicles.map((v: any) => (
                                    <button
                                        key={v.id}
                                        onClick={() => setSelectedVehicle(v.id)}
                                        disabled={v.status !== 'AVAILABLE'}
                                        className={clsx("p-4 rounded-lg border text-left transition-all", {
                                            "border-ruby-500 bg-ruby-50 ring-1 ring-ruby-500": selectedVehicle === v.id,
                                            "border-gray-200 hover:border-ruby-200 bg-white": selectedVehicle !== v.id && v.status === 'AVAILABLE',
                                            "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100": v.status !== 'AVAILABLE'
                                        })}
                                    >
                                        <div className="font-bold text-gray-900">{v.number}</div>
                                        <div className="text-sm text-gray-500">{v.driverName}</div>
                                        {v.status !== 'AVAILABLE' && <div className="text-xs text-amber-600 font-medium mt-1">Busy</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Selection */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <PackagePlus className="w-4 h-4 text-ruby-600" />
                            2. Add Products
                        </h2>

                        {products.length === 0 ? <p className="text-gray-500 text-sm">No products found.</p> : (
                            <>
                                {/* Flavour Grid */}
                                <div className="mb-6">
                                    <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">Select Flavour</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {availableFlavours.map(flav => (
                                            <button
                                                key={flav}
                                                onClick={() => {
                                                    setSelectedFlavour(flav);
                                                    setSelectedPack("");
                                                }}
                                                className={clsx("p-3 rounded-lg border text-sm font-medium transition-all text-center", {
                                                    "border-ruby-500 bg-ruby-50 text-ruby-900 ring-1 ring-ruby-500": selectedFlavour === flav,
                                                    "border-gray-200 bg-white text-gray-600 hover:border-ruby-200": selectedFlavour !== flav
                                                })}
                                            >
                                                {flav}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pack List */}
                                {selectedFlavour && (
                                    <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">Select Pack</label>
                                        <div className="flex flex-wrap gap-2">
                                            {availablePacks.map(pack => (
                                                <button
                                                    key={pack}
                                                    onClick={() => setSelectedPack(pack)}
                                                    className={clsx("px-4 py-2 rounded-full border text-sm font-bold transition-all flex items-center gap-2", {
                                                        "border-teal-500 bg-teal-50 text-teal-800 ring-1 ring-teal-500": selectedPack === pack,
                                                        "border-gray-200 bg-white text-gray-600 hover:border-teal-200": selectedPack !== pack
                                                    })}
                                                >
                                                    {pack}
                                                    {selectedPack === pack && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Add Action */}
                                {targetProduct && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row items-center gap-6">
                                        <div className="flex-1 text-center sm:text-left">
                                            <div className="text-xs text-gray-500 font-bold uppercase">Selected</div>
                                            <div className="font-bold text-gray-900 text-lg">{targetProduct.name}</div>
                                            <div className="text-sm text-gray-500">Available Stock: {targetProduct.quantity}</div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-24">
                                                <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Load Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={addQuantity || ""}
                                                    onChange={(e) => setAddQuantity(Number(e.target.value))}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 text-center font-bold text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 outline-none text-gray-900 bg-white placeholder-gray-400"
                                                    autoFocus
                                                />
                                            </div>
                                            <button
                                                onClick={addToManifest}
                                                disabled={addQuantity <= 0}
                                                className="bg-ruby-700 hover:bg-ruby-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                            >
                                                <Plus className="w-5 h-5" />
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* RIGHT: Manifest / Current Load */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-6 overflow-hidden flex flex-col h-[calc(100vh-100px)]">
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900 flex items-center justify-between">
                                Load Manifest
                                <span className="text-xs bg-ruby-100 text-ruby-700 px-2 py-1 rounded-full">
                                    {manifest.length} Items
                                </span>
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {manifest.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <PackagePlus className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm">No items added yet.</p>
                                    <p className="text-xs mt-1">Select items on the left to start loading.</p>
                                </div>
                            ) : (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                manifest.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white border border-gray-100 p-3 rounded-lg shadow-sm group">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-gray-900 truncate">{item.name}</div>
                                            <div className="text-xs text-gray-500">{item.flavour} • {item.pack}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-gray-900 text-lg">{item.qtyLoaded}</div>
                                        </div>
                                        <button
                                            onClick={() => removeFromManifest(idx)}
                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={handleSubmit}
                                disabled={manifest.length === 0 || !selectedVehicle || loading}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Confirm Vehicle Load
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
