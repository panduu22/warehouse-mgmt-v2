"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "@/components/WarehouseContext";
import { Loader2, Save, Trash2, Plus, PackagePlus, ArrowLeft, Truck, Printer, AlertCircle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { formatPacksAndBottles, PRODUCT_SORT_ORDER } from "@/lib/stock-utils";
import { formatIST } from "@/lib/dateUtils";

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
    const { activeWarehouse } = useWarehouse();
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
        setSelectedVehicle("");
        setManifest([]);
        setSelectedPack("");
        setSelectedFlavour("");
        setTargetProduct(null);
        setVehicles([]);
        setProducts([]);
        setPackGroups([]);

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
    }, [activeWarehouse?.id]);

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

    const selectedVehicleObj = vehicles.find(v => v.id === selectedVehicle);

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 bg-card border border-border px-6 py-5 rounded-2xl shadow-erp-card mb-8 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/trips" className="p-2 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-muted-foreground border border-transparent hover:border-border">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Load Vehicle</h1>
                        <p className="text-sm text-muted-foreground mt-1">Create a new trip manifest</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT: Selection ── */}
                <div className="lg:col-span-2 space-y-6 print:hidden">

                    {/* Step 1: Vehicle */}
                    <div className="bg-card p-6 rounded-2xl shadow-erp-card border border-border">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/60">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                            <h2 className="text-base font-bold text-foreground tracking-tight">Select Vehicle</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {vehicles.map((v: any) => (
                                <button
                                    key={v._id}
                                    onClick={() => setSelectedVehicle(v._id)}
                                    disabled={v.status !== "AVAILABLE"}
                                    className={clsx("p-4 rounded-xl border text-left transition-all duration-200", {
                                        "border-primary bg-primary/5 ring-1 ring-primary shadow-sm": selectedVehicle === v._id,
                                        "border-border hover:border-primary/40 bg-card hover:bg-muted/30": selectedVehicle !== v._id && v.status === "AVAILABLE",
                                        "opacity-50 cursor-not-allowed bg-muted/50 border-border": v.status !== "AVAILABLE",
                                    })}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-foreground text-lg">{v.number}</div>
                                        {v.status !== "AVAILABLE" && <span className="badge badge-amber">Busy</span>}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                                        <Truck className="w-3.5 h-3.5" /> {v.driverName}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Add Products */}
                    <div className="bg-card p-6 rounded-2xl shadow-erp-card border border-border">
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/60">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
                            <h2 className="text-base font-bold text-foreground tracking-tight">Add Products</h2>
                        </div>

                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                            Select Pack Size
                        </label>

                        <div className="space-y-3">
                            {packGroups.map(group => (
                                <div key={group.pack} className="border border-border/60 rounded-xl overflow-hidden bg-card">
                                    <button
                                        onClick={() => {
                                            setSelectedPack(prev => prev === group.pack ? "" : group.pack);
                                            setSelectedFlavour("");
                                            setAddPacks("1");
                                            setAddBottles("0");
                                        }}
                                        className={clsx(
                                            "w-full text-left px-5 py-3.5 font-bold text-sm transition-all flex items-center justify-between",
                                            selectedPack === group.pack
                                                ? "bg-primary/5 text-primary border-b border-primary/10"
                                                : "bg-muted/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <span>{group.pack}</span>
                                        <span className="badge badge-slate">
                                            {group.flavours.length} variant{group.flavours.length !== 1 ? "s" : ""}
                                        </span>
                                    </button>

                                    {selectedPack === group.pack && (
                                        <div className="p-4 bg-background">
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 block">
                                                Select Flavour & Quantity
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {group.flavours.map(flav => (
                                                    <div key={flav} className={clsx("rounded-xl border transition-all overflow-hidden flex flex-col shadow-sm",
                                                        selectedFlavour === flav
                                                            ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500"
                                                            : "border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/20"
                                                    )}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedFlavour(prev => prev === flav ? "" : flav);
                                                                setAddPacks("1");
                                                                setAddBottles("0");
                                                            }}
                                                            className={clsx(
                                                                "px-3 py-2.5 w-full text-sm font-bold text-left flex justify-between items-center transition-colors",
                                                                selectedFlavour === flav ? "text-emerald-900 bg-emerald-100/50" : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {flav}
                                                        </button>

                                                        {selectedFlavour === flav && targetProduct && (
                                                            <div className="p-3 bg-card border-t border-emerald-100/50 flex flex-col gap-3">
                                                                <div className="text-xs text-muted-foreground font-medium flex justify-between items-center">
                                                                    <span>Stock:</span>
                                                                    <span className="font-bold text-foreground">{formatPacksAndBottles(targetProduct.quantity, targetProduct.bottlesPerPack)}</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <div className="flex-1">
                                                                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Packs</label>
                                                                        <input
                                                                            type="number" min="0"
                                                                            value={addPacks}
                                                                            onChange={e => setAddPacks(e.target.value)}
                                                                            className="w-full h-8 px-2 text-center font-bold text-sm rounded-lg border border-border focus:ring-2 focus:ring-emerald-500 outline-none text-foreground bg-background shadow-sm"
                                                                        />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Bottles</label>
                                                                        <input
                                                                            type="number" min="0"
                                                                            value={addBottles}
                                                                            onChange={e => setAddBottles(e.target.value)}
                                                                            className="w-full h-8 px-2 text-center font-bold text-sm rounded-lg border border-border focus:ring-2 focus:ring-emerald-500 outline-none text-foreground bg-background shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={addToManifest}
                                                                    disabled={(parseInt(addPacks || "0") * targetProduct.bottlesPerPack + parseInt(addBottles || "0")) <= 0}
                                                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shadow-sm"
                                                                >
                                                                    <Plus className="w-4 h-4" /> Add
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!targetProduct && selectedPack && selectedFlavour && (
                            <div className="mt-4 text-amber-600 text-sm p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 font-medium">
                                <AlertCircle className="w-4 h-4" /> Product not found for this combination.
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Manifest ── */}
                <div className="lg:col-span-1 print:col-span-3">
                    <div className="bg-card rounded-2xl shadow-erp-card border border-border sticky top-24 overflow-hidden flex flex-col print:shadow-none print:border-none print:relative print:top-0">

                        {/* Print-only header */}
                        <div className="hidden print:block p-8 border-b-2 border-black mb-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Load Manifest</h1>
                                    <p className="text-sm font-bold text-gray-600">Generated: {formatIST(new Date())}</p>
                                </div>
                                {activeVehicle && (
                                    <div className="text-right">
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">Vehicle</div>
                                        <div className="text-3xl font-black text-black">{activeVehicle.number}</div>
                                        <div className="text-lg font-bold text-muted-foreground">{activeVehicle.driverName}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Screen header */}
                        <div className="p-5 bg-muted/30 border-b border-border print:bg-card print:border-b-2 print:border-black">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="font-bold text-foreground text-lg print:text-2xl print:font-black">
                                    Manifest
                                </h2>
                                {manifest.length > 0 && (
                                    <button
                                        onClick={() => window.print()}
                                        className="h-8 px-3 bg-card hover:bg-muted border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 shadow-sm print:hidden"
                                    >
                                        <Printer className="w-3.5 h-3.5" /> Print
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-2 print:mt-4 bg-background border border-border/60 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground font-medium print:font-bold print:text-lg">Total Loaded</span>
                                    <span className="font-bold text-foreground print:text-xl print:font-black">
                                        {(() => {
                                            let p = 0, b = 0;
                                            manifest.forEach(item => { p += Math.floor(item.qtyLoaded / item.bottlesPerPack); b += item.qtyLoaded % item.bottlesPerPack; });
                                            return `${p} Packs + ${b} Btls`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-border/60 pt-2 mt-1">
                                    <span className="text-muted-foreground font-medium print:font-bold print:text-lg">Est. Value</span>
                                    <span className="font-black text-primary print:text-2xl print:text-black">
                                        ₹{manifest.reduce((acc, i) => acc + i.price * (i.qtyLoaded / i.bottlesPerPack), 0).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Manifest items */}
                        <div className="flex-1 max-h-[500px] overflow-y-auto p-4 space-y-2.5 custom-scrollbar print:overflow-visible print:max-h-none print:p-0 print:mt-6">
                            {manifest.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground print:hidden">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <PackagePlus className="w-8 h-8 text-muted-foreground/30" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground mb-1">Empty Manifest</p>
                                    <p className="text-xs">Add products from the left.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 print:space-y-0 print:border-t print:border-black">
                                    {manifest.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-background border border-border/60 p-3.5 rounded-xl shadow-sm hover:border-primary/30 transition-colors group print:shadow-none print:border-b print:border-border print:rounded-none print:p-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-foreground truncate print:text-xl print:font-black">{item.pack} - {item.flavour}</div>
                                                <div className="text-[11px] font-semibold text-muted-foreground mt-0.5 print:text-foreground print:text-sm">
                                                    <span className="text-emerald-600">₹{(item.price * (item.qtyLoaded / item.bottlesPerPack)).toLocaleString('en-IN')}</span> <span className="opacity-50">•</span> ₹{item.price}/pk
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-foreground text-sm bg-muted px-2 py-1 rounded-md print:bg-transparent print:text-2xl">
                                                    {formatPacksAndBottles(item.qtyLoaded, item.bottlesPerPack)}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromManifest(idx)}
                                                className="p-1.5 text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 print:hidden"
                                                title="Remove"
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
                        <div className="p-4 border-t border-border bg-background print:hidden">
                            <button
                                onClick={handleSubmit}
                                disabled={manifest.length === 0 || !selectedVehicle || saving}
                                className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Confirm Vehicle Load
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
