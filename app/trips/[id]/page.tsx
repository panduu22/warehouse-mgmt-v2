"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Package, Plus, Trash2 } from "lucide-react";
import { parsePack, toBottlesRaw, formatPacksAndBottles, toPacksAndBottles } from "@/lib/stock-utils";

interface PackBottleInput {
    packs: string;
    bottles: string;
}

interface SchemeSlabInput extends PackBottleInput {
    discount: string;
    freeItems: { productId: string; packs: string; bottles: string; qty: string }[];
}

export default function VerifyTripPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [inputs, setInputs] = useState<Record<string, PackBottleInput>>({});
    const [productSchemes, setProductSchemes] = useState<Record<string, SchemeSlabInput[]>>({});
    const [allProducts, setAllProducts] = useState<any[]>([]); // For free item selection
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
                    const initialScheme: Record<string, SchemeSlabInput[]> = {};

                    found.loadedItems.forEach((item: any) => {
                        const bpp = item.productId.bottlesPerPack;

                        if (found.status === "VERIFIED") {
                            initial[item.productId._id] = {
                                packs: String(Math.floor((item.qtyReturned || 0) / bpp)),
                                bottles: String((item.qtyReturned || 0) % bpp)
                            };

                            // Load existing schemes
                            if (item.schemes && item.schemes.length > 0) {
                                initialScheme[item.productId._id] = item.schemes.map((s: any) => ({
                                    packs: String(s.packs),
                                    bottles: String(s.bottles),
                                    discount: String(s.discountPerPack),
                                    freeItems: (s.freeItems || []).map((f: any) => ({
                                        productId: f.productId.toString(),
                                        packs: String(f.packs || "0"),
                                        bottles: String(f.bottles || "0"),
                                        qty: String(f.qty || "0")
                                    }))
                                }));
                            } else {
                                // Fallback for legacy data
                                initialScheme[item.productId._id] = [{
                                    packs: String(Math.floor((item.qtyScheme || 0) / bpp)),
                                    bottles: String((item.qtyScheme || 0) % bpp),
                                    discount: String(item.discountPerPack || "0"),
                                    freeItems: []
                                }];
                            }
                        } else {
                            initial[item.productId._id] = { packs: "0", bottles: "0" };
                            initialScheme[item.productId._id] = [{ packs: "0", bottles: "0", discount: "0", freeItems: [] }];
                        }
                    });
                    setInputs(initial);
                    setProductSchemes(initialScheme);
                }
                setLoading(false);
            });

        // Fetch products for free item selection
        fetch("/api/products")
            .then(res => res.json())
            .then(data => setAllProducts(data));
    }, [id]);

    const isVerified = trip?.status === "VERIFIED";

    const updateInput = (
        productId: string,
        field: 'packs' | 'bottles',
        value: string,
        type: 'returns' | 'scheme',
        bpp: number,
        schemeIndex?: number
    ) => {
        if (type === 'returns') {
            const current = inputs[productId];
            const next = { ...current, [field]: value };

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
            setInputs({ ...inputs, [productId]: next });
        } else if (type === 'scheme' && schemeIndex !== undefined) {
            const currentSlabs = [...(productSchemes[productId] || [])];
            const next = { ...currentSlabs[schemeIndex], [field]: value };

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
            currentSlabs[schemeIndex] = next;
            setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
        }
    };

    const updateDiscount = (productId: string, index: number, value: string) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        currentSlabs[index] = { ...currentSlabs[index], discount: value };
        setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
    };

    const addSchemeRow = (productId: string) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        currentSlabs.push({ packs: "0", bottles: "0", discount: "0", freeItems: [] });
        setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
    };

    const removeSchemeRow = (productId: string, index: number) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        if (currentSlabs.length > 1) {
            currentSlabs.splice(index, 1);
            setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
        }
    };

    const addFreeItem = (productId: string, schemeIndex: number) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        const slab = { ...currentSlabs[schemeIndex] };
        slab.freeItems = [...(slab.freeItems || []), { productId: "", packs: "0", bottles: "0", qty: "0" }];
        currentSlabs[schemeIndex] = slab;
        setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
    };

    const removeFreeItem = (productId: string, schemeIndex: number, freeIndex: number) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        const slab = { ...currentSlabs[schemeIndex] };
        slab.freeItems = (slab.freeItems || []).filter((_, i) => i !== freeIndex);
        currentSlabs[schemeIndex] = slab;
        setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
    };

    const updateFreeItem = (productId: string, schemeIndex: number, freeIndex: number, field: 'productId' | 'qty' | 'packs' | 'bottles', value: string) => {
        const currentSlabs = [...(productSchemes[productId] || [])];
        const slab = { ...currentSlabs[schemeIndex] };
        const freeItems = [...(slab.freeItems || [])];

        const next = { ...freeItems[freeIndex], [field]: value };

        let freeProdBpp = 1;
        if (next.productId) {
            const prod = allProducts.find(p => p._id === next.productId);
            if (prod) {
                freeProdBpp = prod.bottlesPerPack;
            } else {
                const prodInTrip = trip.loadedItems.find((i: any) => i.productId._id === next.productId);
                if (prodInTrip) {
                    freeProdBpp = prodInTrip.productId.bottlesPerPack;
                } else {
                    // Ultimate fallback using parsePack logic if product found but no BPP data
                    const p = allProducts.find(p => p._id === next.productId);
                    freeProdBpp = parsePack(p?.pack, p?.name);
                }
            }
        }

        if ((field === 'bottles' || field === 'productId') && next.bottles) {
            const b = parseInt(next.bottles, 10);
            if (!isNaN(b) && b >= freeProdBpp) {
                const extraPacks = Math.floor(b / freeProdBpp);
                const remBottles = b % freeProdBpp;
                const prevPacks = parseInt(next.packs || "0", 10);
                next.packs = String(prevPacks + extraPacks);
                next.bottles = String(remBottles);
            }
        }

        freeItems[freeIndex] = next;
        slab.freeItems = freeItems;
        currentSlabs[schemeIndex] = slab;
        setProductSchemes({ ...productSchemes, [productId]: currentSlabs });
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
            const bpp = item.productId.bottlesPerPack;
            const loadedBottles = Math.round(Number(item.qtyLoaded || 0));
            totalPacksLoaded += (loadedBottles / bpp);

            const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
            const returnedBottles = isVerified
                ? Math.round(Number(item.qtyReturned || 0))
                : toBottlesRaw(r.packs, r.bottles, bpp);

            const totalSoldBottles = loadedBottles - returnedBottles;

            // Calculate total scheme bottles and total scheme discount
            let itemSchemeBottles = 0;
            let itemSchemeSalesValue = 0;
            let itemSchemeDiscountValue = 0;

            const packPrice = item.productId.price || item.productId.salePrice || 0;
            const bottlePrice = packPrice / bpp;

            if (isVerified) {
                // If verified, use stored schemes if available, otherwise legacy fields
                if (item.schemes && item.schemes.length > 0) {
                    item.schemes.forEach((s: any) => {
                        const sBottles = s.packs * bpp + s.bottles;
                        itemSchemeBottles += sBottles;
                        const sPrice = packPrice - s.discountPerPack;
                        itemSchemeSalesValue += (s.packs * sPrice) + (s.bottles * (sPrice / bpp));
                        itemSchemeDiscountValue += (sBottles / bpp) * s.discountPerPack;

                        // Add free items value
                        if (s.freeItems && Array.isArray(s.freeItems)) {
                            s.freeItems.forEach((f: any) => {
                                if (f.productId && typeof f.productId === 'object' && f.productId._id) {
                                    // if populated
                                    const fp = f.productId;
                                    const fbpp = fp.bottlesPerPack;
                                    let fBottles = 0;
                                    if (f.packs !== undefined && f.bottles !== undefined) {
                                        fBottles = f.packs * fbpp + f.bottles;
                                    } else {
                                        fBottles = f.qty || 0;
                                    }
                                    const fPackPrice = fp.price || fp.salePrice || 0;
                                    const fBottlePrice = fPackPrice / fbpp;
                                    itemSchemeDiscountValue += fBottles * fBottlePrice;
                                } else if (f.productId) {
                                    const fp = allProducts.find(p => p._id === f.productId.toString() || p._id === f.productId);
                                    if (fp) {
                                        const fbpp = fp.bottlesPerPack;
                                        let fBottles = 0;
                                        if (f.packs !== undefined && f.bottles !== undefined) {
                                            fBottles = f.packs * fbpp + f.bottles;
                                        } else {
                                            fBottles = f.qty || 0;
                                        }
                                        const fPackPrice = fp.price || fp.salePrice || 0;
                                        const fBottlePrice = fPackPrice / fbpp;
                                        itemSchemeDiscountValue += fBottles * fBottlePrice;
                                    }
                                }
                            });
                        }
                    });
                } else {
                    const sBottles = Math.round(Number(item.qtyScheme || 0));
                    itemSchemeBottles = sBottles;
                    const discountPerPack = item.discountPerPack || 0;
                    const sPrice = packPrice - discountPerPack;
                    const schemeP = toPacksAndBottles(sBottles, bpp);
                    itemSchemeSalesValue = (schemeP.packs * sPrice) + (schemeP.bottles * (sPrice / bpp));
                    itemSchemeDiscountValue = (sBottles / bpp) * discountPerPack;
                }
            } else {
                const slabs = productSchemes[item.productId._id] || [];
                slabs.forEach((s) => {
                    const sBottles = toBottlesRaw(s.packs, s.bottles, bpp);
                    itemSchemeBottles += sBottles;
                    const discountPerPack = Number(s.discount || "0");
                    const sPrice = packPrice - discountPerPack;

                    const p = parseInt(s.packs || "0", 10);
                    const b = parseInt(s.bottles || "0", 10);
                    itemSchemeSalesValue += (p * sPrice) + (b * (sPrice / bpp));
                    itemSchemeDiscountValue += (sBottles / bpp) * discountPerPack;

                    if (s.freeItems && Array.isArray(s.freeItems)) {
                        s.freeItems.forEach((f) => {
                            if (f.productId) {
                                const fp = allProducts.find(prod => prod._id === f.productId);
                                if (fp) {
                                    const fbpp = fp.bottlesPerPack;
                                    const fPacks = parseInt(f.packs || "0", 10);
                                    const fBottles = parseInt(f.bottles || "0", 10);
                                    const totalFBottles = fPacks * fbpp + fBottles;
                                    const fPackPrice = fp.price || fp.salePrice || 0;
                                    const fBottlePrice = fPackPrice / fbpp;
                                    itemSchemeDiscountValue += totalFBottles * fBottlePrice;
                                }
                            }
                        });
                    }
                });
            }

            const normalSoldBottles = totalSoldBottles - itemSchemeBottles;
            const normalP = toPacksAndBottles(normalSoldBottles, bpp);
            totalNormalSales += (normalP.packs * packPrice) + (normalP.bottles * bottlePrice);

            totalSchemeSales += itemSchemeSalesValue;
            totalDiscount += itemSchemeDiscountValue;
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
            const bpp = item.productId.bottlesPerPack;
            const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
            const slabs = productSchemes[item.productId._id] || [];

            const retBottles = toBottlesRaw(r.packs, r.bottles, bpp);
            let totalSchBottles = 0;
            const schemes = slabs.map(s => {
                const b = toBottlesRaw(s.packs, s.bottles, bpp);
                totalSchBottles += b;
                return {
                    packs: parseInt(s.packs || "0", 10),
                    bottles: parseInt(s.bottles || "0", 10),
                    discountPerPack: Number(s.discount || "0"),
                    freeItems: (s.freeItems || [])
                        .filter(f => f.productId && (parseInt(f.packs || "0", 10) > 0 || parseInt(f.bottles || "0", 10) > 0))
                        .map(f => {
                            let fbpp = 24; // Default to 24 only if all other lookups fail
                            const fp = allProducts.find(p => p._id === f.productId);
                            if (fp) {
                                fbpp = fp.bottlesPerPack;
                            } else {
                                const prodInTrip = trip.loadedItems.find((i: any) => i.productId._id === f.productId);
                                if (prodInTrip) {
                                    fbpp = prodInTrip.productId.bottlesPerPack;
                                } else {
                                    fbpp = parsePack(undefined, undefined); // baseline from util
                                }
                            }
                            const p = parseInt(f.packs || "0", 10);
                            const b = parseInt(f.bottles || "0", 10);
                            return {
                                productId: f.productId,
                                packs: p,
                                bottles: b,
                                qty: p * fbpp + b // store total bottles for legacy compatibility
                            };
                        })
                };
            });

            if (retBottles + totalSchBottles > item.qtyLoaded) {
                alert(`Error for ${item.productId.name}: Returned + Scheme (${formatPacksAndBottles(retBottles + totalSchBottles, bpp)}) exceeds Loaded (${formatPacksAndBottles(item.qtyLoaded, bpp)})`);
                return;
            }

            returnedItems.push({
                productId: item.productId._id,
                qtyReturned: retBottles,
                qtyScheme: totalSchBottles, // Legacy support
                discountPerPack: schemes.length > 0 ? schemes[0].discountPerPack : 0, // Legacy support (first slab)
                schemes: schemes
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
                        const bpp = item.productId.bottlesPerPack;
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

                                                {/* Scheme Inputs (Multi-Row) */}
                                                <div className="flex flex-col gap-2 bg-ruby-50/50 p-3 rounded-2xl border border-ruby-100">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-[10px] font-black text-ruby-500 uppercase tracking-widest">Scheme Slabs</label>
                                                        <button
                                                            onClick={() => addSchemeRow(item.productId._id)}
                                                            className="text-ruby-600 hover:bg-ruby-100 p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {(productSchemes[item.productId._id] || []).map((slab, idx) => (
                                                            <React.Fragment key={`${item.productId._id}-scheme-${idx}`}>
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            placeholder="P"
                                                                            value={slab.packs}
                                                                            onChange={(e) => updateInput(item.productId._id, 'packs', e.target.value, 'scheme', bpp, idx)}
                                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-ruby-100 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm bg-white"
                                                                        />
                                                                        <span className="text-ruby-200 font-bold">+</span>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="B"
                                                                            value={slab.bottles}
                                                                            onChange={(e) => updateInput(item.productId._id, 'bottles', e.target.value, 'scheme', bpp, idx)}
                                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-ruby-100 focus:border-ruby-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm bg-white"
                                                                        />
                                                                    </div>

                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-1.5 min-w-[100px]">
                                                                            <span className="text-[10px] font-bold text-ruby-400">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Disc"
                                                                                value={slab.discount}
                                                                                onChange={(e) => updateDiscount(item.productId._id, idx, e.target.value)}
                                                                                className="w-20 px-3 py-2 rounded-xl border-2 border-amber-100 focus:border-amber-500 focus:ring-0 text-gray-900 font-black text-center text-sm transition-all shadow-sm bg-white"
                                                                            />
                                                                            {idx > 0 && (
                                                                                <button
                                                                                    onClick={() => removeSchemeRow(item.productId._id, idx)}
                                                                                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Free Items Section */}
                                                                <div className="ml-4 pl-4 border-l-2 border-ruby-50 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest">Free Stock Rewards</p>
                                                                        <button
                                                                            onClick={() => addFreeItem(item.productId._id, idx)}
                                                                            className="text-teal-600 hover:bg-teal-50 px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-colors"
                                                                        >
                                                                            + Add Free Item
                                                                        </button>
                                                                    </div>
                                                                    {slab.freeItems && slab.freeItems.map((free, fIdx) => (
                                                                        <div key={`free-${idx}-${fIdx}`} className="flex items-center gap-2">
                                                                            <select
                                                                                value={free.productId}
                                                                                onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'productId', e.target.value)}
                                                                                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                            >
                                                                                <option value="">Select Product...</option>
                                                                                {allProducts.map(p => (
                                                                                    <option key={p._id} value={p._id}>{p.name} ({p.pack})</option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="flex items-center gap-1 w-28">
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="P"
                                                                                    value={free.packs}
                                                                                    onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'packs', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-black text-center focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                                />
                                                                                <span className="text-gray-300 font-bold text-[10px]">+</span>
                                                                                <input
                                                                                    type="number"
                                                                                    placeholder="B"
                                                                                    value={free.bottles}
                                                                                    onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'bottles', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-black text-center focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                                />
                                                                            </div>
                                                                            <button
                                                                                onClick={() => removeFreeItem(item.productId._id, idx, fIdx)}
                                                                                className="text-gray-300 hover:text-red-400 p-1"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                {slab.freeItems && slab.freeItems.length > 0 && <div className="h-2" />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-2 text-right pr-4">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Returned</p>
                                                    <p className="font-black text-gray-900">{formatPacksAndBottles(item.qtyReturned, bpp, true)}</p>
                                                </div>
                                                {(() => {
                                                    const slabs = item.schemes || [];
                                                    if (slabs.length > 0) {
                                                        return slabs.map((s: any, idx: number) => (
                                                            <div key={idx} className="bg-ruby-50/50 px-3 py-1 rounded-lg border border-ruby-100 mt-1">
                                                                <p className="text-[10px] text-ruby-400 uppercase font-black tracking-widest leading-none mb-1">Scheme Slab {idx + 1}</p>
                                                                <p className="font-black text-ruby-600 text-sm leading-none">
                                                                    {formatPacksAndBottles(s.packs * bpp + s.bottles, bpp, true)} @ ₹{s.discountPerPack}
                                                                </p>
                                                            </div>
                                                        ));
                                                    } else if (item.qtyScheme > 0) {
                                                        return (
                                                            <div>
                                                                <p className="text-[10px] text-ruby-400 uppercase font-black tracking-widest">Scheme</p>
                                                                <p className="font-black text-ruby-600">{formatPacksAndBottles(item.qtyScheme, bpp, true)} @ ₹{item.discountPerPack}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        <div className="text-right min-w-[140px] lg:border-l lg:border-gray-100 lg:pl-8 self-center">
                                            <p className="text-[10px] text-teal-600 uppercase font-black tracking-widest mb-1">Net Sold</p>
                                            <p className="font-black text-teal-600 text-2xl leading-none tracking-tighter">
                                                {(() => {
                                                    const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
                                                    const ret = isVerified ? item.qtyReturned : toBottlesRaw(r.packs, r.bottles, bpp);
                                                    const sold = item.qtyLoaded - ret;
                                                    return formatPacksAndBottles(sold, bpp, true);
                                                })()}
                                            </p>
                                            <p className="text-[9px] text-gray-400 mt-2 font-bold italic uppercase tracking-tighter">
                                                Net Sold = Loads - Returns ({bpp} BPP)
                                            </p>
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
                                        const bpp = item.productId.bottlesPerPack;
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
