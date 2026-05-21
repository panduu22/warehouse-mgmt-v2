"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, Plus, PackagePlus, ArrowLeft, Truck, Printer } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { formatPacksAndBottles, PRODUCT_SORT_ORDER } from "@/lib/stock-utils";

// Canonical pack order as requested
const PACK_ORDER = [
    "150 ml Tetra",
    "200 ml RGB",
    "250 ml PET",
    "300 ml RGB",
    "330 ml CAN",
    "300 ml CAN",
    "300 ml",
    "350 ml CAN",
    "400 ml CSD",
    "400 mlcsd",
    "500 ml",
    "600 ml PET",
    "740 ml",
    "750 ml",
    "850 ml",
    "1 ltr PET",
    "1 ltr",
    "1.2 ltr",
    "1.25 Ltr PET",
    "1.5 ltr PET",
    "1.75 ltr",
    "2 ltr",
    "2.25 Ltr PET",
];

const normalizeKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export default function NewTripPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState("");
    const [manifest, setManifest] = useState<any[]>([]);

    // Pack-first selection state
    const [selectedPack, setSelectedPack] = useState("");
    const [selectedFlavour, setSelectedFlavour] = useState("");
    const [addPacks, setAddPacks] = useState("1");
    const [addBottles, setAddBottles] = useState("0");

    // Grouped data: [{ pack, flavours[] }]
    const [packGroups, setPackGroups] = useState<{ pack: string; flavours: string[] }[]>([]);
    const [targetProduct, setTargetProduct] = useState<any>(null);

    // Auto-normalise bottles → packs
    useEffect(() => {
        if (!targetProduct) return;
        const bpp = targetProduct.bottlesPerPack;
        const b = parseInt(addBottles || "0");
        if (b >= bpp) {
            const extraPacks = Math.floor(b / bpp);
            setAddPacks(prev => (parseInt(prev || "0") + extraPacks).toString());
            setAddBottles((b % bpp).toString());
        }
    }, [addBottles, targetProduct]);

    // Initial data fetch
    useEffect(() => {
        fetch("/api/vehicles").then(r => r.json()).then(setVehicles).catch(console.error);

        fetch("/api/products")
            .then(r => r.json())
            .then((data: any[]) => {
                setProducts(data);

                // Build pack → flavours map
                const packMap = new Map<string, string[]>();
                data.forEach((p: any) => {
                    if (!p.pack || !p.flavour) return;
                    if (!packMap.has(p.pack)) packMap.set(p.pack, []);
                    const list = packMap.get(p.pack)!;
                    if (!list.includes(p.flavour)) list.push(p.flavour);
                });

                // Sort flavours within each pack using PRODUCT_SORT_ORDER
                packMap.forEach((flavours, pack) => {
                    flavours.sort((a, b) => {
                        const ia = PRODUCT_SORT_ORDER.findIndex(s => s.toLowerCase().includes(a.toLowerCase()));
                        const ib = PRODUCT_SORT_ORDER.findIndex(s => s.toLowerCase().includes(b.toLowerCase()));
                        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                    });
                });

                // Order packs according to PACK_ORDER
                const ordered: { pack: string; flavours: string[] }[] = [];
                PACK_ORDER.forEach(orderedPack => {
                    const normOrdered = normalizeKey(orderedPack);
                    for (const [key, flavours] of packMap.entries()) {
                        if (normalizeKey(key) === normOrdered) {
                            ordered.push({ pack: key, flavours });
                            packMap.delete(key);
                            break;
                        }
                    }
                });
                // Append any leftover packs not in PACK_ORDER
                packMap.forEach((flavours, pack) => ordered.push({ pack, flavours }));

                setPackGroups(ordered);
            })
            .catch(console.error);
    }, []);

    // Resolve target product when both pack + flavour are chosen
    useEffect(() => {
        if (selectedPack && selectedFlavour) {
            const prod = products.find(p => p.pack === selectedPack && p.flavour === selectedFlavour);
            setTargetProduct(prod || null);
            if (prod) { setAddPacks("1"); setAddBottles("0"); }
        } else {
            setTargetProduct(null);
        }
    }, [selectedPack, selectedFlavour, products]);

    const addToManifest = () => {
        if (!targetProduct) return;
        const bpp = targetProduct.bottlesPerPack;
        const bottlesTotal = (parseInt(addPacks || "0") * bpp) + parseInt(addBottles || "0");
        if (bottlesTotal <= 0) return;

        const existingIdx = manifest.findIndex(m => m.productId === targetProduct._id);
        if (existingIdx >= 0) {
            const updated = [...manifest];
            updated[existingIdx].qtyLoaded += bottlesTotal;
            setManifest(updated);
        } else {
            setManifest(prev => [...prev, {
                productId: targetProduct._id,
                name: targetProduct.name,
                flavour: targetProduct.flavour,
                pack: targetProduct.pack,
                qtyLoaded: bottlesTotal,
                currentStock: targetProduct.quantity,
                price: targetProduct.price,
                bottlesPerPack: targetProduct.bottlesPerPack,
            }]);
        }

        setAddPacks("1");
        setAddBottles("0");
        setSelectedFlavour(""); // keep pack open so user can add another flavour
    };

    const removeFromManifest = (idx: number) => setManifest(manifest.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!selectedVehicle) return alert("Select a vehicle");
        if (manifest.length === 0) return alert("Add items to load");
        setSaving(true);
        try {
            const res = await fetch("/api/trips", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    vehicleId: selectedVehicle,
                    items: manifest.map(m => ({ productId: m.productId, qtyLoaded: m.qtyLoaded })),
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed");
            router.push("/trips");
            router.refresh();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const activeVehicle = vehicles.find((v: any) => v._id === selectedVehicle) as any;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
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

                {/* ── LEFT: Selection ── */}
                <div className="lg:col-span-2 space-y-6 print:hidden">

                    {/* Step 1: Vehicle */}
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
                                    disabled={v.status !== "AVAILABLE"}
                                    className={clsx("p-4 rounded-lg border text-left transition-all", {
                                        "border-ruby-500 bg-ruby-50 ring-1 ring-ruby-500": selectedVehicle === v._id,
                                        "border-gray-200 hover:border-ruby-200 bg-white": selectedVehicle !== v._id && v.status === "AVAILABLE",
                                        "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100": v.status !== "AVAILABLE",
                                    })}
                                >
                                    <div className="font-bold text-gray-900">{v.number}</div>
                                    <div className="text-sm text-gray-500">{v.driverName}</div>
                                    {v.status !== "AVAILABLE" && <div className="text-xs text-amber-600 font-medium mt-1">Busy</div>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Add Products — Pack Size first */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <PackagePlus className="w-4 h-4 text-ruby-600" />
                            2. Add Products
                        </h2>

                        <label className="text-xs font-semibold text-gray-500 uppercase mb-3 block">
                            Step 1 — Select Pack Size
                        </label>

                        <div className="space-y-3">
                            {packGroups.map(group => (
                                <div key={group.pack}>
                                    {/* Pack heading button */}
                                    <button
                                        onClick={() => {
                                            setSelectedPack(prev => prev === group.pack ? "" : group.pack);
                                            setSelectedFlavour("");
                                            setAddPacks("1");
                                            setAddBottles("0");
                                        }}
                                        className={clsx(
                                            "w-full text-left px-4 py-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-between",
                                            selectedPack === group.pack
                                                ? "border-ruby-500 bg-ruby-50 text-ruby-900 ring-1 ring-ruby-500"
                                                : "border-gray-200 bg-gray-50 text-gray-700 hover:border-ruby-300 hover:bg-ruby-50/40"
                                        )}
                                    >
                                        <span>{group.pack}</span>
                                        <span className="text-xs font-medium text-gray-400">
                                            {group.flavours.length} flavour{group.flavours.length !== 1 ? "s" : ""}
                                        </span>
                                    </button>

                                    {/* Flavour cards — shown when pack is expanded */}
                                    {selectedPack === group.pack && (
                                        <div className="mt-2 ml-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="text-xs font-semibold text-gray-500 uppercase mb-2 block">
                                                Step 2 — Select Flavour
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {group.flavours.map(flav => (
                                                    <button
                                                        key={flav}
                                                        onClick={() => {
                                                            setSelectedFlavour(flav);
                                                            setAddPacks("1");
                                                            setAddBottles("0");
                                                        }}
                                                        className={clsx(
                                                            "p-3 rounded-lg border text-sm font-medium transition-all text-center",
                                                            selectedFlavour === flav
                                                                ? "border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500"
                                                                : "border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/40"
                                                        )}
                                                    >
                                                        {flav}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 3: Quantity + Add */}
                        {targetProduct && (
                            <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 flex flex-col sm:flex-row items-center gap-6">
                                <div className="flex-1 text-center sm:text-left">
                                    <div className="text-xs text-gray-500 font-bold uppercase">Selected</div>
                                    <div className="font-bold text-gray-900 text-lg">{targetProduct.name}</div>
                                    <div className="text-sm text-gray-500">
                                        Available: {formatPacksAndBottles(targetProduct.quantity, targetProduct.bottlesPerPack)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-2">
                                        <div className="w-20">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Packs</label>
                                            <input
                                                type="number" min="0"
                                                value={addPacks}
                                                onChange={e => setAddPacks(e.target.value)}
                                                className="w-full px-3 py-2 text-center font-bold text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 outline-none text-gray-900"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Bottles</label>
                                            <input
                                                type="number" min="0"
                                                value={addBottles}
                                                onChange={e => setAddBottles(e.target.value)}
                                                className="w-full px-3 py-2 text-center font-bold text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-ruby-500 outline-none text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={addToManifest}
                                        disabled={(parseInt(addPacks || "0") * targetProduct.bottlesPerPack + parseInt(addBottles || "0")) <= 0}
                                        className="bg-ruby-700 hover:bg-ruby-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm h-[46px] mt-5"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {!targetProduct && selectedPack && selectedFlavour && (
                            <div className="mt-4 text-amber-600 text-sm p-4 bg-amber-50 rounded-lg border border-amber-100">
                                Product not found for this combination.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Manifest ── */}
                <div className="lg:col-span-1 print:col-span-3">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 sticky top-6 overflow-hidden flex flex-col print:shadow-none print:border-none print:relative print:top-0">

                        {/* Print-only header */}
                        <div className="hidden print:block p-8 border-b-2 border-black mb-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Load Manifest</h1>
                                    <p className="text-sm font-bold text-gray-600">Generated: {new Date().toLocaleString("en-IN")}</p>
                                </div>
                                {activeVehicle && (
                                    <div className="text-right">
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle</div>
                                        <div className="text-3xl font-black text-black">{activeVehicle.number}</div>
                                        <div className="text-lg font-bold text-gray-700">{activeVehicle.driverName}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Screen header */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100 print:bg-white print:border-b-2 print:border-black">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2 print:text-2xl print:font-black">
                                    Manifest Items
                                    <span className="text-xs bg-ruby-100 text-ruby-700 px-2 py-1 rounded-full print:bg-black print:text-white">
                                        {manifest.length} Items
                                    </span>
                                </h2>
                                {manifest.length > 0 && (
                                    <button
                                        onClick={() => window.print()}
                                        className="p-2 hover:bg-white rounded-lg text-gray-500 hover:text-ruby-600 transition-all border border-transparent hover:border-gray-200 print:hidden"
                                        title="Print Manifest"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                            {manifest.length > 0 && (
                                <div className="flex flex-col gap-1 print:mt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium print:font-bold print:text-lg">Total Loaded</span>
                                        <span className="font-bold text-gray-900 print:text-2xl print:font-black">
                                            {(() => {
                                                let p = 0, b = 0;
                                                manifest.forEach(item => { p += Math.floor(item.qtyLoaded / item.bottlesPerPack); b += item.qtyLoaded % item.bottlesPerPack; });
                                                return `${p} Packs + ${b} Bottles`;
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium print:font-bold print:text-lg">Grand Total</span>
                                        <span className="font-bold text-ruby-700 print:text-3xl print:font-black print:text-black">
                                            ₹{manifest.reduce((acc, i) => acc + i.price * (i.qtyLoaded / i.bottlesPerPack), 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Manifest items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 print:overflow-visible print:p-0 print:mt-6">
                            {manifest.length === 0 ? (
                                <div className="text-center py-12 text-gray-400 print:hidden">
                                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <PackagePlus className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm">No items added yet.</p>
                                    <p className="text-xs mt-1">Pick a pack size → flavour on the left.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 print:space-y-0 print:border-t print:border-black">
                                    {manifest.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white border border-gray-100 p-3 rounded-lg shadow-sm print:shadow-none print:border-b print:border-gray-200 print:rounded-none print:p-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-gray-900 truncate print:text-xl print:font-black">{item.name}</div>
                                                <div className="text-xs text-gray-500 print:font-bold">{item.pack} • {item.flavour}</div>
                                                <div className="text-xs font-bold text-teal-600 mt-0.5 print:text-gray-900 print:text-sm">
                                                    ₹{(item.price * (item.qtyLoaded / item.bottlesPerPack)).toLocaleString()} (₹{item.price}/pack)
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-gray-900 text-lg print:text-3xl">
                                                    {formatPacksAndBottles(item.qtyLoaded, item.bottlesPerPack)}
                                                </div>
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

                        {/* Print footer signatures */}
                        <div className="hidden print:block mt-12 pt-8 border-t-2 border-black">
                            <div className="flex justify-between px-4">
                                <div className="text-center">
                                    <div className="w-48 border-b border-black mb-2" />
                                    <div className="text-xs font-black uppercase">Warehouse In-charge</div>
                                </div>
                                <div className="text-center">
                                    <div className="w-48 border-b border-black mb-2" />
                                    <div className="text-xs font-black uppercase">Driver Signature</div>
                                </div>
                            </div>
                        </div>

                        {/* Confirm button */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 print:hidden">
                            <button
                                onClick={handleSubmit}
                                disabled={manifest.length === 0 || !selectedVehicle || saving}
                                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Confirm Vehicle Load
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
