"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, Plus, ArrowRight, Check, PackagePlus, ArrowLeft, Truck, Printer } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { parsePack, toBottles, formatPacksAndBottles } from "@/lib/stock-utils";

export default function NewTripPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [vehicles, setVehicles] = useState([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]);

    const [selectedVehicle, setSelectedVehicle] = useState("");

    // Manifest State (Items added to the "cart" to be loaded)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [manifest, setManifest] = useState<any[]>([]);

    // Guided Selection State
    const [selectedFlavour, setSelectedFlavour] = useState("");
    const [selectedPack, setSelectedPack] = useState("");
    const [addPacks, setAddPacks] = useState<string>("1");
    const [addBottles, setAddBottles] = useState<string>("0");

    // Derived Data
    const [availableFlavours, setAvailableFlavours] = useState<string[]>([]);
    const [availablePacks, setAvailablePacks] = useState<string[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [targetProduct, setTargetProduct] = useState<any>(null);

    // Auto-normalize bottles to packs
    useEffect(() => {
        if (!targetProduct) return;
        const bpp = parsePack(targetProduct.pack, targetProduct.name);
        const b = parseInt(addBottles || "0");
        if (b >= bpp) {
            const extraPacks = Math.floor(b / bpp);
            const remainingBottles = b % bpp;
            setAddPacks(prev => (parseInt(prev || "0") + extraPacks).toString());
            setAddBottles(remainingBottles.toString());
        }
    }, [addBottles, targetProduct]);

    useEffect(() => {
        // Fetch vehicles and products
        fetch("/api/vehicles").then(res => res.json()).then(setVehicles);
        fetch("/api/products")
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                // Extract unique flavours
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const flavs = Array.from(new Set(data.map((p: any) => p.flavour).filter(Boolean))) as string[];
                setAvailableFlavours(flavs.sort());
            })
            .catch(console.error);
    }, []);

    // Update Available Packs when Flavour Changes
    useEffect(() => {
        if (selectedFlavour) {
            const packs = products
                .filter(p => p.flavour === selectedFlavour)
                .map(p => p.pack)
                .filter(Boolean);

            const uniquePacks = Array.from(new Set(packs)) as string[];

            // Sort logic: ml first, then Ltr (Same as Stock Page)
            uniquePacks.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();

                const isAMl = aLower.includes("ml");
                const isBMl = bLower.includes("ml");
                if (isAMl && !isBMl) return -1;
                if (!isAMl && isBMl) return 1;
                const numA = parseFloat(a.replace(/[^0-9.]/g, ""));
                const numB = parseFloat(b.replace(/[^0-9.]/g, ""));
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
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
            if (prod) {
                setAddPacks("1");
                setAddBottles("0");
            }
        } else {
            setTargetProduct(null);
        }
    }, [selectedFlavour, selectedPack, products]);

    const addToManifest = () => {
        if (!targetProduct) return;
        const bpp = parsePack(targetProduct.pack, targetProduct.name);
        const bottlesTotal = (parseInt(addPacks || "0") * bpp) + parseInt(addBottles || "0");
        
        if (bottlesTotal <= 0) return;

        // Check if already in manifest
        const existingIndex = manifest.findIndex(item => item.productId === targetProduct._id);

        if (existingIndex >= 0) {
            // Update quantity
            const newManifest = [...manifest];
            newManifest[existingIndex].qtyLoaded += bottlesTotal;
            setManifest(newManifest);
        } else {
            // Add new line
            setManifest([...manifest, {
                productId: targetProduct._id,
                name: targetProduct.name,
                flavour: targetProduct.flavour,
                pack: targetProduct.pack,
                qtyLoaded: bottlesTotal,
                currentStock: targetProduct.quantity,
                price: targetProduct.price
            }]);
        }

        // Reset Selection
        setAddPacks("1");
        setAddBottles("0");
        setSelectedPack("");
        // Keep flavour selected as user might want to add another pack of same flavour
    };

    const removeFromManifest = (index: number) => {
        setManifest(manifest.filter((_, i) => i !== index));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSubmit = async () => {
        if (!selectedVehicle) return alert("Select a vehicle");
        if (manifest.length === 0) return alert("Add items to load");

        setLoading(true);
        try {
            const res = await fetch("/api/trips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: selectedVehicle,
                    items: manifest.map(m => ({
                        productId: m.productId,
                        qtyLoaded: m.qtyLoaded
                    })),
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed");
            }

            router.push("/trips");
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Find selected vehicle details
    const activeVehicle = vehicles.find((v: any) => v._id === selectedVehicle) as any;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="flex items-center gap-4 mb-8 print:hidden">
                <Link href="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">Load Vehicle</h1>
                    <p className="text-sm text-gray-500">Create a new trip manifest</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: Selection Area (Hidden when printing) */}
                <div className="lg:col-span-2 space-y-6 print:hidden">

                    {/* Vehicle Selector */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 text-ruby-600" />
                            1. Select Vehicle
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {vehicles.map((v: any) => (
                                <button
                                    key={v._id}
                                    onClick={() => setSelectedVehicle(v._id)}
                                    disabled={v.status !== 'AVAILABLE'}
                                    className={clsx("p-4 rounded-lg border text-left transition-all", {
                                        "border-ruby-500 bg-ruby-50 ring-1 ring-ruby-500": selectedVehicle === v._id,
                                        "border-gray-200 hover:border-ruby-200 bg-white": selectedVehicle !== v._id && v.status === 'AVAILABLE',
                                        "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100": v.status !== 'AVAILABLE'
                                    })}
                                >
                                    <div className="font-bold text-gray-900">{v.number}</div>
                                    <div className="text-sm text-gray-500">{v.driverName}</div>
                                    {v.status !== 'AVAILABLE' && <div className="text-xs text-amber-600 font-medium mt-1">Busy</div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <PackagePlus className="w-4 h-4 text-ruby-600" />
                            2. Add Products
                        </h2>

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
                                            setAddPacks("1");
                                            setAddBottles("0");
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
                                            onClick={() => {
                                                setSelectedPack(pack);
                                                setAddPacks("1");
                                                setAddBottles("0");
                                            }}
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
                                    <div className="text-sm text-gray-500">Available Stock: {formatPacksAndBottles(targetProduct.quantity, parsePack(targetProduct.pack, targetProduct.name))}</div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        <div className="w-20">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Packs</label>
                                            <input
                                                type="number"
                                                value={addPacks}
                                                onChange={(e) => setAddPacks(e.target.value)}
                                                className="w-full px-3 py-2 text-center font-bold text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 outline-none text-gray-900"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Bottles</label>
                                            <input
                                                type="number"
                                                value={addBottles}
                                                onChange={(e) => setAddBottles(e.target.value)}
                                                className="w-full px-3 py-2 text-center font-bold text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 outline-none text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={addToManifest}
                                        disabled={(parseInt(addPacks || "0") * parsePack(targetProduct.pack, targetProduct.name) + parseInt(addBottles || "0")) <= 0}
                                        className="bg-ruby-700 hover:bg-ruby-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm h-[46px] mt-5"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {!targetProduct && selectedFlavour && selectedPack && (
                            <div className="text-amber-600 text-sm p-4 bg-amber-50 rounded-lg border border-amber-100">
                                Product not found for this combination.
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Manifest / Current Load */}
                <div className="lg:col-span-1 print:col-span-3">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-6 overflow-hidden flex flex-col h-auto print:shadow-none print:border-none print:relative print:top-0">
                        
                        {/* Print Header (Visible only when printing) */}
                        <div className="hidden print:block p-8 border-b-2 border-black mb-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Load Manifest</h1>
                                    <p className="text-sm font-bold text-gray-600">Generated: {new Date().toLocaleString('en-IN')}</p>
                                </div>
                                {activeVehicle && (
                                    <div className="text-right">
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle Info</div>
                                        <div className="text-3xl font-black text-black">{activeVehicle.number}</div>
                                        <div className="text-lg font-bold text-gray-700">{activeVehicle.driverName}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Screen Header */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col justify-between print:bg-white print:border-b-2 print:border-black">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2 print:text-2xl print:font-black">
                                    Manifest Items
                                    <span className="text-xs bg-ruby-100 text-ruby-700 px-2 py-1 rounded-full print:bg-black print:text-white">
                                        {manifest.length} Items
                                    </span>
                                </h2>
                                {manifest.length > 0 && (
                                    <button 
                                        onClick={handlePrint}
                                        className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-ruby-600 transition-all border border-transparent hover:border-gray-200 print:hidden"
                                        title="Print Manifest"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {manifest.length > 0 && (
                                <div className="flex flex-col gap-1 print:mt-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium print:text-black print:font-bold print:text-lg">Total Loaded</span>
                                        <span className="font-bold text-gray-900 text-lg print:text-2xl print:font-black">
                                            {(() => {
                                                let totalP = 0;
                                                let totalB = 0;
                                                manifest.forEach(item => {
                                                    const bpp = parsePack(item.pack, item.name);
                                                    totalP += Math.floor(item.qtyLoaded / bpp);
                                                    totalB += item.qtyLoaded % bpp;
                                                });
                                                return `${totalP} Packs + ${totalB} Bottles`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium print:text-black print:font-bold print:text-lg">Grand Total</span>
                                        <span className="font-bold text-ruby-700 text-lg print:text-3xl print:font-black print:text-black">
                                            ₹{manifest.reduce((acc, item) => {
                                                const bottlesPerPack = parsePack(item.pack, item.name);
                                                return acc + (item.price * (item.qtyLoaded / bottlesPerPack));
                                            }, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 print:overflow-visible print:p-0 print:mt-6">
                            {manifest.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 print:hidden">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <PackagePlus className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm">No items added yet.</p>
                                    <p className="text-xs mt-1">Select items on the left to start loading.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 print:space-y-0 print:border-t print:border-black">
                                    {manifest.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white border border-gray-100 p-3 rounded-lg shadow-sm group print:shadow-none print:border-b print:border-gray-200 print:rounded-none print:p-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate print:text-xl print:font-black print:text-black">{item.name}</div>
                                                <div className="text-xs text-gray-500 print:text-gray-700 print:font-bold">{item.flavour} • {item.pack}</div>
                                                <div className="text-xs font-bold text-teal-600 mt-0.5 print:text-gray-900 print:text-sm">₹{(item.price * (item.qtyLoaded / parsePack(item.pack, item.name))).toLocaleString()} (₹{item.price} per pack)</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-gray-900 text-lg print:text-3xl print:text-black">{formatPacksAndBottles(item.qtyLoaded, parsePack(item.pack, item.name))}</div>
                                            </div>
                                            <button
                                                onClick={() => removeFromManifest(idx)}
                                                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Print Footer */}
                        <div className="hidden print:block mt-12 pt-8 border-t-2 border-black">
                            <div className="flex justify-between items-center px-4">
                                <div className="text-center">
                                    <div className="w-48 border-b border-black mb-2"></div>
                                    <div className="text-xs font-black uppercase text-black">Warehouse In-charge</div>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 border-b border-black mb-2"></div>
                                    <div className="text-xs font-black uppercase text-black">Driver Signature</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 print:hidden">
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
