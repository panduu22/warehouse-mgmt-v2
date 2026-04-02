"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Package } from "lucide-react";
import { parsePack, toBottlesRaw, formatPacksAndBottles, toPacksAndBottles } from "@/lib/stock-utils";

interface PackBottleInput {
    packs: string;
    bottles: string;
}

export default function VerifyTripPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [inputs, setInputs] = useState<Record<string, PackBottleInput>>({});
    const [schemeInputs, setSchemeInputs] = useState<Record<string, PackBottleInput>>({});
    const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
    const [verifyDate, setVerifyDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetch("/api/trips")
            .then(res => res.json())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((data: any[]) => {
                const found = data.find(t => t._id === id);
                if (found) {
                    setTrip(found);
                    const initial: Record<string, PackBottleInput> = {};
                    const initialScheme: Record<string, PackBottleInput> = {};
                    const initialDiscount: Record<string, string> = {};
                    
                    found.loadedItems.forEach((item: any) => {
                        const bpp = parsePack(item.productId.pack, item.productId.name);
                        
                        if (found.status === "VERIFIED") {
                            initial[item.productId._id] = {
                                packs: String(Math.floor((item.qtyReturned || 0) / bpp)),
                                bottles: String((item.qtyReturned || 0) % bpp)
                            };
                            initialScheme[item.productId._id] = {
                                packs: String(Math.floor((item.qtyScheme || 0) / bpp)),
                                bottles: String((item.qtyScheme || 0) % bpp)
                            };
                        } else {
                            initial[item.productId._id] = { packs: "0", bottles: "0" };
                            initialScheme[item.productId._id] = { packs: "0", bottles: "0" };
                        }
                        initialDiscount[item.productId._id] = String(item.discountPerPack || "0");
                    });
                    setInputs(initial);
                    setSchemeInputs(initialScheme);
                    setDiscountInputs(initialDiscount);
                }
                setLoading(false);
            });
    }, [id]);

    const isVerified = trip?.status === "VERIFIED";

    const updateInput = (
        productId: string, 
        field: 'packs' | 'bottles', 
        value: string, 
        type: 'returns' | 'scheme',
        bpp: number
    ) => {
        const current = type === 'returns' ? inputs[productId] : schemeInputs[productId];
        const next = { ...current, [field]: value };
        
        // Auto-normalization: If bottles >= bpp, carry over to packs
        if (field === 'bottles' && value) {
            const b = parseInt(value, 10);
            if (!isNaN(b) && b >= bpp) {
                const extraPacks = Math.floor(b / bpp);
                const remBottles = b % bpp;
                const prevPacks = parseInt(next.packs || "0", 10);
                next.packs = String(prevPacks + extraPacks);
                next.bottles = String(remBottles);
            }
        }

        if (type === 'returns') {
            setInputs({ ...inputs, [productId]: next });
        } else {
            setSchemeInputs({ ...schemeInputs, [productId]: next });
        }
    };

    const calculateSales = () => {
        let totalNormalSales = 0;
        let totalSchemeSales = 0;
        let totalDiscount = 0;
        let totalPacksLoaded = 0;

        if (!trip || !trip.loadedItems) {
            return { totalNormalSales, totalSchemeSales, totalSales: 0, totalDiscount, totalPacksLoaded: 0 };
        }

        trip.loadedItems.forEach((item: any) => {
            const bpp = parsePack(item.productId.pack, item.productId.name);
            const loadedBottles = Math.round(Number(item.qtyLoaded || 0));
            totalPacksLoaded += (loadedBottles / bpp);
            
            const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
            const returnedBottles = isVerified 
                ? Math.round(Number(item.qtyReturned || 0)) 
                : toBottlesRaw(r.packs, r.bottles, bpp);

            const s = schemeInputs[item.productId._id] || { packs: "0", bottles: "0" };
            const schemeBottles = isVerified 
                ? Math.round(Number(item.qtyScheme || 0)) 
                : toBottlesRaw(s.packs, s.bottles, bpp);
            
            const discountPerPack = isVerified ? (item.discountPerPack || 0) : Number(discountInputs[item.productId._id] || "0");
            
            const totalSoldBottles = loadedBottles - returnedBottles;
            const normalSoldBottles = totalSoldBottles - schemeBottles;

            const packPrice = item.productId.price || item.productId.salePrice || 0;
            const bottlePrice = packPrice / bpp;
            
            // Proportional pricing
            const normalP = toPacksAndBottles(normalSoldBottles, bpp);
            totalNormalSales += (normalP.packs * packPrice) + (normalP.bottles * bottlePrice);

            const schemeP = toPacksAndBottles(schemeBottles, bpp);
            totalSchemeSales += (schemeP.packs * (packPrice - discountPerPack)) + (schemeP.bottles * ((packPrice - discountPerPack) / bpp));
            
            totalDiscount += (schemeBottles / bpp) * discountPerPack;
        });

        return {
            totalNormalSales,
            totalSchemeSales,
            totalSales: totalNormalSales + totalSchemeSales,
            totalDiscount,
            totalPacksLoaded
        };
    };

    const { totalNormalSales, totalSchemeSales, totalSales, totalDiscount, totalPacksLoaded } = calculateSales();

    const handleVerify = async () => {
        const returnedItems = [];
        for (const item of trip.loadedItems) {
            const bpp = parsePack(item.productId.pack, item.productId.name);
            const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
            const s = schemeInputs[item.productId._id] || { packs: "0", bottles: "0" };
            
            const retBottles = toBottlesRaw(r.packs, r.bottles, bpp);
            const schBottles = toBottlesRaw(s.packs, s.bottles, bpp);
            
            if (retBottles + schBottles > item.qtyLoaded) {
                alert(`Error for ${item.productId.name}: Returned + Scheme (${formatPacksAndBottles(retBottles + schBottles, bpp)}) exceeds Loaded (${formatPacksAndBottles(item.qtyLoaded, bpp)})`);
                return;
            }

            returnedItems.push({
                productId: item.productId._id,
                qtyReturned: retBottles,
                qtyScheme: schBottles,
                discountPerPack: Number(discountInputs[item.productId._id] || "0")
            });
        }

        if (!confirm("Confirm and close this trip? This action cannot be undone.")) return;
        setVerifying(true);

        try {
            const res = await fetch(`/api/trips/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "VERIFIED",
                    returnedItems,
                    verifiedAt: verifyDate
                })
            });

            if (res.ok) {
                router.push("/trips");
                router.refresh();
            } else {
                const json = await res.json();
                alert(json.error);
            }
        } catch (e) {
            alert("Error verifying trip");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Loading trip details...</div>;
    if (!trip) return <div className="p-12 text-center text-red-500">Trip not found</div>;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/trips" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        Trip Verification
                        {isVerified && <span className="bg-teal-100 text-teal-700 text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider">VERIFIED</span>}
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Vehicle: <span className="text-gray-900 font-bold">{trip.vehicleId?.number}</span></p>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <h2 className="font-black text-gray-400 uppercase text-xs tracking-widest">Loaded Cargo Details</h2>
                    <div className="text-xs font-bold text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                        {trip.loadedItems.length} Products
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {trip.loadedItems.map((item: any) => {
                        const bpp = parsePack(item.productId.pack, item.productId.name);
                        return (
                            <div key={item.productId._id} className="p-6 hover:bg-gray-50/30 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="bg-ruby-50 p-4 rounded-2xl text-ruby-600 shadow-sm">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-gray-900 text-lg leading-tight">{item.productId.name}</p>
                                            <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-tight">
                                                LOADED: <span className="text-gray-900">{formatPacksAndBottles(item.qtyLoaded, bpp)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-end gap-4 lg:gap-8 bg-gray-50 rounded-2xl p-4 lg:p-0 lg:bg-transparent">
                                        {!isVerified ? (
                                            <>
                                                {/* Return Inputs */}
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Returns (P / B)</label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            placeholder="P"
                                                            value={inputs[item.productId._id]?.packs || "0"}
                                                            onChange={(e) => updateInput(item.productId._id, 'packs', e.target.value, 'returns', bpp)}
                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-gray-200 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm"
                                                        />
                                                        <span className="text-gray-300 font-bold">+</span>
                                                        <input
                                                            type="number"
                                                            placeholder="B"
                                                            value={inputs[item.productId._id]?.bottles || "0"}
                                                            onChange={(e) => updateInput(item.productId._id, 'bottles', e.target.value, 'returns', bpp)}
                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-gray-200 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Scheme Inputs */}
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-ruby-500 uppercase tracking-widest">Scheme (P / B)</label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            placeholder="P"
                                                            value={schemeInputs[item.productId._id]?.packs || "0"}
                                                            onChange={(e) => updateInput(item.productId._id, 'packs', e.target.value, 'scheme', bpp)}
                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-ruby-100 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm"
                                                        />
                                                        <span className="text-ruby-200 font-bold">+</span>
                                                        <input
                                                            type="number"
                                                            placeholder="B"
                                                            value={schemeInputs[item.productId._id]?.bottles || "0"}
                                                            onChange={(e) => updateInput(item.productId._id, 'bottles', e.target.value, 'scheme', bpp)}
                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-ruby-100 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Discount Input */}
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Disc / P (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={discountInputs[item.productId._id] || "0"}
                                                        onChange={(e) => setDiscountInputs({ ...discountInputs, [item.productId._id]: e.target.value })}
                                                        className="w-20 px-3 py-2 rounded-xl border-2 border-amber-100 focus:border-amber-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex gap-6 text-right pr-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Returned</p>
                                                    <p className="font-black text-gray-900">{formatPacksAndBottles(item.qtyReturned, bpp, true)}</p>
                                                </div>
                                                {item.qtyScheme > 0 && (
                                                    <div>
                                                        <p className="text-[10px] text-ruby-400 uppercase font-black tracking-widest">Scheme</p>
                                                        <p className="font-black text-ruby-600">{formatPacksAndBottles(item.qtyScheme, bpp, true)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="text-right min-w-[140px] lg:border-l lg:border-gray-100 lg:pl-8">
                                            <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest mb-1">Net Sold</p>
                                            <p className="font-black text-teal-600 text-2xl leading-none tracking-tighter">
                                                {(() => {
                                                    const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
                                                    const s = schemeInputs[item.productId._id] || { packs: "0", bottles: "0" };
                                                    const ret = isVerified ? item.qtyReturned : toBottlesRaw(r.packs, r.bottles, bpp);
                                                    const sch = isVerified ? item.qtyScheme : toBottlesRaw(s.packs, s.bottles, bpp);
                                                    const sold = item.qtyLoaded - ret;
                                                    return formatPacksAndBottles(sold, bpp, true);
                                                })()}
                                            </p>
                                            <p className="text-[9px] text-gray-300 mt-2 font-bold italic uppercase tracking-tighter">inc. schemes</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-8 bg-gray-900 relative overflow-hidden mt-2">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-ruby-500/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
                    
                    <div className="relative grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Normal Sales</p>
                            <p className="text-xl font-black text-white">₹{totalNormalSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-ruby-400 font-black uppercase tracking-widest mb-1">Scheme Sales</p>
                            <p className="text-xl font-black text-ruby-400">₹{totalSchemeSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">Total Discount</p>
                            <p className="text-xl font-black text-amber-400">₹{totalDiscount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Loaded</p>
                            <p className="text-xl font-black text-white">
                                {(() => {
                                    let totalP = 0;
                                    let totalB = 0;
                                    trip.loadedItems.forEach((item: any) => {
                                        const bpp = parsePack(item.productId.pack, item.productId.name);
                                        totalP += Math.floor(item.qtyLoaded / bpp);
                                        totalB += item.qtyLoaded % bpp;
                                    });
                                    return `${totalP} P + ${totalB} B`;
                                })()}
                            </p>
                        </div>
                        <div className="col-span-2 md:col-span-1 bg-teal-500 p-4 rounded-2xl shadow-lg shadow-teal-500/20">
                            <p className="text-[10px] text-teal-900 font-black uppercase tracking-widest mb-1">Grand Total</p>
                            <p className="text-2xl font-black text-white">₹{totalSales.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {!isVerified && (
                    <div className="p-8 bg-white border-t border-gray-100 flex flex-col md:flex-row items-end md:items-center justify-between gap-6">
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Verification Date</label>
                            <input
                                type="date"
                                value={verifyDate}
                                onChange={(e) => setVerifyDate(e.target.value)}
                                className="px-5 py-3 rounded-2xl border-2 border-gray-100 focus:border-teal-500 focus:ring-0 text-gray-900 font-bold bg-white transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-teal-600/20 disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest"
                        >
                            {verifying ? "Processing..." : (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    Complete Verification
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
