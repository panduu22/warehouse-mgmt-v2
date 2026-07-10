"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Package, Plus, Trash2 } from "lucide-react";
import { parsePack, toBottlesRaw, formatPacksAndBottles, toPacksAndBottles } from "@/lib/stock-utils";
import { useWarehouse } from "@/components/WarehouseContext";

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
    const { activeWarehouse } = useWarehouse();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [inputs, setInputs] = useState<Record<string, PackBottleInput>>({});
    const [productSchemes, setProductSchemes] = useState<Record<string, SchemeSlabInput[]>>({});
    const [allProducts, setAllProducts] = useState<any[]>([]); // For free item selection
    const [verifyDate, setVerifyDate] = useState(new Date().toISOString().split('T')[0]);
    // Per-product return validation messages (productId -> error string | null)
    const [returnErrors, setReturnErrors] = useState<Record<string, string | null>>({});

    // ── Payment collection state ─────────────────────────────────────────────
    // To add more payment methods (Card, Bank Transfer, etc.), append entries
    // to PAYMENT_METHODS and add a matching state key below.
    const PAYMENT_METHODS = [
        { key: "upi",      label: "UPI Amount",  icon: "📱", color: "violet" },
        { key: "cash",     label: "Cash Amount", icon: "💵", color: "emerald" },
        { key: "expenses", label: "Expenses",    icon: "💸", color: "amber" },
        // { key: "card",  label: "Card Amount",  icon: "💳", color: "blue" },
    ] as const;

    type PaymentKey = typeof PAYMENT_METHODS[number]["key"];
    const [paymentAmounts, setPaymentAmounts] = useState<Record<PaymentKey, string>>({ upi: "", cash: "", expenses: "" });

    const getAmount = (key: PaymentKey) => Math.max(0, parseFloat(paymentAmounts[key]) || 0);
    const receivedTotal = PAYMENT_METHODS.reduce((sum, m) => sum + getAmount(m.key), 0);
    // ─────────────────────────────────────────────────────────────────────────

    useEffect(() => {
        setLoading(true);
        setTrip(null);
        setInputs({});
        setProductSchemes({});

        fetch("/api/trips")
            .then(res => res.json())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((data: any[]) => {
                const found = (data || []).find(t => t._id === id);
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
            })
            .catch(() => {
                setLoading(false);
            });

        // Fetch products for free item selection
        fetch("/api/products")
            .then(res => res.json())
            .then(data => setAllProducts(data || []))
            .catch(() => {});
    }, [id, activeWarehouse?.id]);

    const isVerified = trip?.status === "VERIFIED";

    // ── Shared input guards ──────────────────────────────────────────────────
    // Blocks '-' key and common keyboard shortcuts that produce negative values.
    const blockNegativeKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === '-' || e.key === 'Subtract') e.preventDefault();
    };
    // Prevents mouse-wheel from decrementing below 0.
    const blockWheelNeg = (e: React.WheelEvent<HTMLInputElement>) => {
        (e.target as HTMLInputElement).blur(); // remove focus so wheel doesn't change value
    };
    // ──────────────────────────────────────────────────────────────────────

    const updateInput = (
        productId: string,
        field: 'packs' | 'bottles',
        value: string,
        type: 'returns' | 'scheme',
        bpp: number,
        schemeIndex?: number,
        maxBottles?: number   // loaded qty ceiling for returns
    ) => {
        // Clamp: empty string is fine (treated as 0); reject genuinely negative numbers
        const numVal = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(numVal) && numVal < 0) return;

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

            // Validate: returned + scheme must not exceed loaded
            if (maxBottles !== undefined) {
                const retTotal = toBottlesRaw(next.packs, next.bottles, bpp);
                if (retTotal > maxBottles) {
                    setReturnErrors(prev => ({ ...prev, [productId]: `Returns (${formatPacksAndBottles(retTotal, bpp, true)}) exceed loaded qty (${formatPacksAndBottles(maxBottles, bpp, true)})` }));
                } else {
                    setReturnErrors(prev => ({ ...prev, [productId]: null }));
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

    // Balance Amount: always = grandTotal - receivedTotal (read-only, shown in red)
    const balanceAmount = Math.max(0, totalSales - receivedTotal);
    // Validation: UPI + Cash must NOT exceed Grand Total
    const paymentExceedsTotal = receivedTotal > totalSales + 0.01;

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
                            let fbpp = parsePack(undefined, undefined); // Default to baseline from util if all other lookups fail
                            const fp = allProducts.find(p => p._id === f.productId);
                            if (fp) {
                                fbpp = fp.bottlesPerPack;
                            } else {
                                const prodInTrip = trip.loadedItems.find((i: any) => i.productId._id === f.productId);
                                if (prodInTrip) {
                                    fbpp = prodInTrip.productId.bottlesPerPack;
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

            // Guard: negative quantities are never valid
            if (retBottles < 0) {
                alert(`Error for ${item.productId.pack} - ${item.productId.flavour}: Returned quantity cannot be negative.`);
                return;
            }
            if (retBottles + totalSchBottles > item.qtyLoaded) {
                alert(`Error for ${item.productId.pack} - ${item.productId.flavour}: Returned + Scheme (${formatPacksAndBottles(retBottles + totalSchBottles, bpp)}) exceeds Loaded (${formatPacksAndBottles(item.qtyLoaded, bpp)})`);
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
                    verifiedAt: verifyDate,
                    upiAmount:      getAmount("upi"),
                    cashAmount:     getAmount("cash"),
                    expensesAmount: getAmount("expenses"),
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

    if (loading) return <div className="p-12 text-center text-muted-foreground">Loading trip details...</div>;
    if (!trip) return <div className="p-12 text-center text-destructive">Trip not found</div>;

    return (
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/trips" className="p-2 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-muted-foreground border border-transparent hover:border-border">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-foreground flex items-center gap-3">
                        Trip Verification
                        {isVerified && <span className="bg-emerald-500/10 text-emerald-600 text-[10px] uppercase font-black px-3 py-1 rounded-full tracking-wider">VERIFIED</span>}
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Vehicle: <span className="text-foreground font-bold">{trip.vehicleId?.number}</span></p>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-erp-card border border-border overflow-hidden text-card-foreground">
                <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h2 className="font-black text-muted-foreground uppercase text-xs tracking-widest">Loaded Cargo Details</h2>
                    <div className="text-xs font-bold text-muted-foreground bg-background px-3 py-1 rounded-full border border-border">
                        {trip.loadedItems.length} Products
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {trip.loadedItems.map((item: any, index: number) => {
                        const bpp = item.productId.bottlesPerPack;
                        return (
                            <div key={item._id || `${item.productId._id}-${index}`} className="p-6 hover:bg-gray-50/30 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="bg-primary/10 p-4 rounded-2xl text-primary shadow-sm">
                                            <Package className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-foreground text-lg leading-tight">{item.productId.pack} - {item.productId.flavour}</p>
                                            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                                                LOADED: <span className="text-foreground">{formatPacksAndBottles(item.qtyLoaded, bpp)}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-end gap-4 lg:gap-8 bg-muted rounded-2xl p-4 lg:p-0 lg:bg-transparent">
                                        {!isVerified ? (
                                            <>
                                                {/* Return Inputs */}
                                                <div className="flex flex-col gap-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Returns (P / B)</label>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="P"
                                                            value={inputs[item.productId._id]?.packs || "0"}
                                                            onKeyDown={blockNegativeKey}
                                                            onWheel={blockWheelNeg}
                                                            onChange={(e) => updateInput(item.productId._id, 'packs', e.target.value, 'returns', bpp, undefined, item.qtyLoaded)}
                                                            className={`w-14 px-2 py-2 rounded-xl border-2 focus:ring-0 text-foreground font-black text-center text-sm transition-all shadow-sm bg-background ${
                                                                returnErrors[item.productId._id] ? 'border-rose-500 focus:border-rose-600' : 'border-border focus:border-primary'
                                                            }`}
                                                        />
                                                        <span className="text-muted-foreground/50 font-bold">+</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="B"
                                                            value={inputs[item.productId._id]?.bottles || "0"}
                                                            onKeyDown={blockNegativeKey}
                                                            onWheel={blockWheelNeg}
                                                            onChange={(e) => updateInput(item.productId._id, 'bottles', e.target.value, 'returns', bpp, undefined, item.qtyLoaded)}
                                                            className={`w-14 px-2 py-2 rounded-xl border-2 focus:ring-0 text-foreground font-black text-center text-sm transition-all shadow-sm bg-background ${
                                                                returnErrors[item.productId._id] ? 'border-rose-500 focus:border-rose-600' : 'border-border focus:border-primary'
                                                            }`}
                                                        />
                                                    </div>
                                                    {returnErrors[item.productId._id] && (
                                                        <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-0.5">
                                                            <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                                            {returnErrors[item.productId._id]}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Scheme Inputs (Multi-Row) */}
                                                <div className="flex flex-col gap-2 bg-primary/5 p-3 rounded-2xl border border-primary/20">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="text-[10px] font-black text-primary/80 uppercase tracking-widest">Scheme Slabs</label>
                                                        <button
                                                            onClick={() => addSchemeRow(item.productId._id)}
                                                            className="text-primary hover:bg-primary/20 p-1 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                                                        >
                                                            <Plus className="w-3 h-3" /> Add
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {(productSchemes[item.productId._id] || []).map((slab, idx) => (
                                                            <React.Fragment key={`${item.productId._id}-scheme-${idx}`}>
                                                                <div className="flex flex-wrap items-center gap-3">
                                                                    <div className="flex items-center gap-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="P"
                                                                            value={slab.packs}
                                                                            onKeyDown={blockNegativeKey}
                                                                            onWheel={blockWheelNeg}
                                                                            onChange={(e) => updateInput(item.productId._id, 'packs', e.target.value, 'scheme', bpp, idx)}
                                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-primary/20 focus:border-primary focus:ring-0 text-foreground font-black text-center text-sm transition-all shadow-sm bg-card"
                                                                        />
                                                                        <span className="text-primary/50 font-bold">+</span>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            placeholder="B"
                                                                            value={slab.bottles}
                                                                            onKeyDown={blockNegativeKey}
                                                                            onWheel={blockWheelNeg}
                                                                            onChange={(e) => updateInput(item.productId._id, 'bottles', e.target.value, 'scheme', bpp, idx)}
                                                                            className="w-14 px-2 py-2 rounded-xl border-2 border-primary/20 focus:border-primary focus:ring-0 text-foreground font-black text-center text-sm transition-all shadow-sm bg-card"
                                                                        />
                                                                    </div>

                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-1.5 min-w-[100px]">
                                                                            <span className="text-[10px] font-bold text-primary/80">₹</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="Disc"
                                                                                value={slab.discount}
                                                                                onChange={(e) => updateDiscount(item.productId._id, idx, e.target.value)}
                                                                                className="w-20 px-3 py-2 rounded-xl border-2 border-amber-500/20 focus:border-amber-500 focus:ring-0 text-foreground font-black text-center text-sm transition-all shadow-sm bg-card"
                                                                            />
                                                                            {idx > 0 && (
                                                                                    <button
                                                                                        onClick={() => removeSchemeRow(item.productId._id, idx)}
                                                                                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                                                                    >
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Free Items Section */}
                                                                <div className="ml-4 pl-4 border-l-2 border-primary/5 space-y-2">
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
                                                                        <div key={`free-${idx}-${fIdx}`} className="flex flex-wrap items-center gap-2">
                                                                            <select
                                                                                value={free.productId}
                                                                                onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'productId', e.target.value)}
                                                                                className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-bold focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                            >
                                                                                <option value="">Select Product...</option>
                                                                                {allProducts.map(p => (
                                                                                    <option key={p._id} value={p._id}>{p.pack} - {p.flavour}</option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="flex items-center gap-1 w-28">
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    placeholder="P"
                                                                                    value={free.packs}
                                                                                    onKeyDown={blockNegativeKey}
                                                                                    onWheel={blockWheelNeg}
                                                                                    onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'packs', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-black text-center focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                                />
                                                                                <span className="text-gray-300 font-bold text-[10px]">+</span>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    placeholder="B"
                                                                                    value={free.bottles}
                                                                                    onKeyDown={blockNegativeKey}
                                                                                    onWheel={blockWheelNeg}
                                                                                    onChange={(e) => updateFreeItem(item.productId._id, idx, fIdx, 'bottles', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-[11px] font-black text-center focus:ring-0 focus:border-teal-500 bg-white text-gray-900"
                                                                                />
                                                                            </div>
                                                                            <button
                                                                                onClick={() => removeFreeItem(item.productId._id, idx, fIdx)}
                                                                                className="text-muted-foreground/50 hover:text-destructive p-1"
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
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Returned</p>
                                                    <p className="font-black text-foreground">{formatPacksAndBottles(item.qtyReturned, bpp, true)}</p>
                                                </div>
                                                {(() => {
                                                    const slabs = item.schemes || [];
                                                    if (slabs.length > 0) {
                                                        return slabs.map((s: any, idx: number) => (
                                                            <div key={idx} className="bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 mt-1">
                                                                <p className="text-[10px] text-primary/80 uppercase font-black tracking-widest leading-none mb-1">Scheme Slab {idx + 1}</p>
                                                                <p className="font-black text-primary text-sm leading-none">
                                                                    {formatPacksAndBottles(s.packs * bpp + s.bottles, bpp, true)} @ ₹{s.discountPerPack}
                                                                </p>
                                                            </div>
                                                        ));
                                                    } else if (item.qtyScheme > 0) {
                                                        return (
                                                            <div>
                                                                <p className="text-[10px] text-primary/80 uppercase font-black tracking-widest">Scheme</p>
                                                                <p className="font-black text-primary">{formatPacksAndBottles(item.qtyScheme, bpp, true)} @ ₹{item.discountPerPack}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}

                                        <div className="text-right min-w-[140px] lg:border-l lg:border-border lg:pl-8 self-center">
                                            <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest mb-1">Net Sold</p>
                                            <p className="font-black text-emerald-500 text-2xl leading-none tracking-tighter">
                                                {(() => {
                                                    const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
                                                    const ret = isVerified ? item.qtyReturned : toBottlesRaw(r.packs, r.bottles, bpp);
                                                    const sold = item.qtyLoaded - ret;
                                                    return formatPacksAndBottles(sold, bpp, true);
                                                })()}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground mt-2 font-bold italic uppercase tracking-tighter">
                                                Net Sold = Loads - Returns ({bpp} BPP)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="p-8 bg-muted/50 relative overflow-hidden mt-2">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

                    <div className="relative grid grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Normal Sales</p>
                            <p className="text-xl font-black text-foreground">₹{totalNormalSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border">
                            <p className="text-[10px] text-primary/80 font-black uppercase tracking-widest mb-1">Scheme Sales</p>
                            <p className="text-xl font-black text-primary">₹{totalSchemeSales.toLocaleString()}</p>
                        </div>
                        <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border">
                            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Total Discount</p>
                            <p className="text-xl font-black text-amber-500">₹{totalDiscount.toLocaleString()}</p>
                        </div>
                        <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border">
                            <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-1">Total Return Qty</p>
                            <p className="text-xl font-black text-rose-500">
                                {(() => {
                                    let totalRetP = 0;
                                    let totalRetB = 0;
                                    trip.loadedItems.forEach((item: any) => {
                                        const bpp = item.productId.bottlesPerPack;
                                        const r = inputs[item.productId._id] || { packs: "0", bottles: "0" };
                                        const retBottles = isVerified
                                            ? (item.qtyReturned || 0)
                                            : (parseInt(r.packs || "0") * bpp + parseInt(r.bottles || "0"));
                                        totalRetP += Math.floor(retBottles / bpp);
                                        totalRetB += retBottles % bpp;
                                    });
                                    return `${totalRetP} P + ${totalRetB} B`;
                                })()}
                            </p>
                        </div>
                        <div className="bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Total Loaded</p>
                            <p className="text-xl font-black text-foreground">
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
                        <div className="col-span-2 md:col-span-1 bg-emerald-500 p-4 rounded-2xl shadow-lg shadow-emerald-500/20">
                            <p className="text-[10px] text-emerald-900 font-black uppercase tracking-widest mb-1">Grand Total</p>
                            <p className="text-2xl font-black text-white">₹{totalSales.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* ── Payment Collection Section ─────────────────────────────── */}
                {!isVerified && (
                    <div className="mx-6 mb-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">💰</span>
                                <h3 className="font-black text-foreground text-sm uppercase tracking-widest">Payment Collection</h3>
                            </div>
                            {/* Real-time payment status chip */}
                            {paymentExceedsTotal ? (
                                <span className="flex items-center gap-1.5 bg-rose-500/15 text-rose-600 text-xs font-black px-3 py-1.5 rounded-full border border-rose-500/30">
                                    ⚠ Exceeds Grand Total
                                </span>
                            ) : balanceAmount < 0.01 ? (
                                <span className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-600 text-xs font-black px-3 py-1.5 rounded-full border border-emerald-500/30 animate-pulse">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    Fully Paid
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 bg-amber-500/15 text-amber-600 text-xs font-black px-3 py-1.5 rounded-full border border-amber-500/30">
                                    ⏳ Balance ₹{balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            )}
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
                            {/* Payment method inputs — rendered from PAYMENT_METHODS */}
                                {PAYMENT_METHODS.map((method) => (
                                    <div key={method.key} className="flex flex-col gap-2">
                                        <label
                                            htmlFor={`payment-${method.key}`}
                                            className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"
                                        >
                                            <span>{method.icon}</span>
                                            {method.label}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-sm">₹</span>
                                            <input
                                                id={`payment-${method.key}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={paymentAmounts[method.key]}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    // Prevent negative values
                                                    if (val !== "" && Number(val) < 0) return;
                                                    setPaymentAmounts(prev => ({ ...prev, [method.key]: val }));
                                                }}
                                                className={`w-full pl-8 pr-4 py-3 rounded-2xl border-2 focus:ring-0 text-foreground font-bold bg-background transition-all shadow-sm text-sm ${
                                                    paymentExceedsTotal
                                                        ? 'border-rose-500 focus:border-rose-600'
                                                        : 'border-border focus:border-primary'
                                                }`}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Received Total — read-only computed card */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                        <span>🧾</span>
                                        Received Total
                                    </label>
                                    <div className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-foreground font-black text-sm flex items-center justify-between">
                                        <span className="text-muted-foreground">₹</span>
                                        <span>{receivedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Balance Amount — always read-only, always red */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>💳</span>
                                        Balance Amount
                                    </label>
                                    <div className={`w-full px-4 py-3 rounded-2xl border-2 font-black text-sm flex items-center justify-between ${
                                        balanceAmount < 0.01
                                            ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600'
                                            : 'border-rose-500/40 bg-rose-500/5 text-rose-600'
                                    }`}>
                                        <span>₹</span>
                                        <span>{balanceAmount < 0.01 ? '0.00' : balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            {paymentExceedsTotal && (
                                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-5 py-3 mb-4">
                                    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                    <p className="text-rose-600 font-bold text-xs">UPI + Cash + Expenses (₹{receivedTotal.toFixed(2)}) exceeds Grand Total (₹{totalSales.toFixed(2)}). Please reduce the payment amount.</p>
                                </div>
                            )}

                            {/* Comparison bar */}
                            <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-5 py-3">
                                <div className="flex-1">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">Grand Total</p>
                                    <p className="font-black text-foreground text-base">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                                <div className="text-muted-foreground/40 font-black text-lg">→</div>
                                <div className="flex-1 text-center">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-0.5">Received (UPI + Cash + Expenses)</p>
                                    <p className="font-black text-base text-foreground">
                                        ₹{receivedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="text-muted-foreground/40 font-black text-lg">→</div>
                                <div className="flex-1 text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 text-rose-600">Balance</p>
                                    <p className={`font-black text-base ${ balanceAmount < 0.01 ? 'text-emerald-500' : 'text-rose-600'}`}>
                                        ₹{balanceAmount < 0.01 ? '0.00' : balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Verified Payment Summary (read-only) ───────────────────── */}
                {isVerified && (trip.upiAmount || trip.cashAmount || trip.expensesAmount || trip.balanceAmount) && (
                    <div className="mx-6 mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between">
                            <span className="text-lg">💰</span>
                            <h3 className="font-black text-emerald-700 text-sm uppercase tracking-widest">Payment Summary</h3>
                            <span className="ml-auto bg-emerald-500/15 text-emerald-600 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30">
                                {(trip.balanceAmount || 0) < 0.01 ? '✓ Fully Paid' : `⏳ Balance Pending`}
                            </span>
                        </div>
                        <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-4">
                            {trip.upiAmount > 0 && (
                                <div className="bg-card/60 p-4 rounded-2xl border border-border">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 flex items-center gap-1">📱 UPI</p>
                                    <p className="font-black text-foreground text-lg">₹{(trip.upiAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            )}
                            {trip.cashAmount > 0 && (
                                <div className="bg-card/60 p-4 rounded-2xl border border-border">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 flex items-center gap-1">💵 Cash</p>
                                    <p className="font-black text-foreground text-lg">₹{(trip.cashAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            )}
                            {(trip.expensesAmount || 0) > 0 && (
                                <div className="bg-card/60 p-4 rounded-2xl border border-border">
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1 flex items-center gap-1">💸 Expenses</p>
                                    <p className="font-black text-amber-600 text-lg">₹{(trip.expensesAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            )}
                            <div className="bg-emerald-500 p-4 rounded-2xl shadow-md shadow-emerald-500/20">
                                <p className="text-[10px] text-emerald-900 font-black uppercase tracking-widest mb-1">🧾 Total Received</p>
                                <p className="font-black text-white text-lg">₹{(trip.receivedTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            {/* Balance Amount — always shown in red if > 0 */}
                            <div className={`p-4 rounded-2xl border-2 ${
                                (trip.balanceAmount || 0) < 0.01
                                    ? 'bg-emerald-50/50 border-emerald-300/60'
                                    : 'bg-rose-50/50 border-rose-400/60'
                            }`}>
                                <p className="text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1 text-rose-600">💳 Balance Amt</p>
                                <p className={`font-black text-lg ${ (trip.balanceAmount || 0) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {(trip.balanceAmount || 0) < 0.01 ? '₹0 (Paid)' : `₹${(trip.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Footer: Verification Date + gated Complete Verification button ───── */}
                {!isVerified && (
                    <div className="p-8 bg-card border-t border-border flex flex-col md:flex-row items-end md:items-center justify-between gap-6">
                        <div className="flex flex-col gap-2 w-full md:w-auto">
                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Verification Date</label>
                            <input
                                type="date"
                                value={verifyDate}
                                onChange={(e) => setVerifyDate(e.target.value)}
                                className="px-5 py-3 rounded-2xl border-2 border-border focus:border-primary focus:ring-0 text-foreground font-bold bg-background transition-all shadow-sm"
                            />
                        </div>
                        {(() => {
                            // Allow verification when payments do NOT exceed grand total
                            const canVerify = !paymentExceedsTotal;
                            return (
                                <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                                    {paymentExceedsTotal && (
                                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">
                                            Payment exceeds grand total
                                        </p>
                                    )}
                                    {balanceAmount > 0.01 && !paymentExceedsTotal && (
                                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                                            Balance ₹{balanceAmount.toFixed(2)} will be recorded as outstanding
                                        </p>
                                    )}
                                    <button
                                        onClick={handleVerify}
                                        disabled={verifying || !canVerify}
                                        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 text-sm uppercase tracking-widest"
                                    >
                                        {verifying ? "Processing..." : (
                                            <>
                                                <CheckCircle className="w-5 h-5" />
                                                {balanceAmount > 0.01 ? 'Verify with Balance' : 'Complete Verification'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
