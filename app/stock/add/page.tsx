"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Plus, Box, PackagePlus, ArrowRight, Check } from "lucide-react";
import clsx from "clsx";
import { parsePack, formatPacksAndBottles } from "@/lib/stock-utils";

export default function AddStockPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [mode, setMode] = useState<"new" | "existing">("existing");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [products, setProducts] = useState<any[]>([]);

    // Selection State
    const [selectedFlavour, setSelectedFlavour] = useState("");
    const [selectedPack, setSelectedPack] = useState("");

    // Derived/Data State
    const [availableFlavours, setAvailableFlavours] = useState<string[]>([]);
    const [availablePacks, setAvailablePacks] = useState<string[]>([]);
    const [targetProduct, setTargetProduct] = useState<any>(null);

    const [addPacks, setAddPacks] = useState("0");
    const [addBottles, setAddBottles] = useState("0");

    useEffect(() => {
        if (mode === "existing") {
            fetch("/api/products")
                .then(res => res.json())
                .then(data => {
                    setProducts(data);
                    // Extract unique flavours
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const flavs = Array.from(new Set(data.map((p: any) => p.flavour).filter(Boolean))) as string[];
                    // Sort alphabetically
                    setAvailableFlavours(flavs.sort());
                })
                .catch(console.error);
        }
    }, [mode]);

    useEffect(() => {
        if (selectedFlavour) {
            // Filter packs for this flavour
            const packs = products
                .filter(p => p.flavour === selectedFlavour)
                .map(p => p.pack)
                .filter(Boolean);

            // Unique packs
            const uniquePacks = Array.from(new Set(packs)) as string[];

            // Sort logic: ml first, then Ltr
            uniquePacks.sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();

                const isAMl = aLower.includes("ml");
                const isBMl = bLower.includes("ml");
                const isALtr = aLower.includes("ltr") || aLower.includes("liter");
                const isBLtr = bLower.includes("ltr") || bLower.includes("liter");

                // If one is ml and other isn't, ml comes first
                if (isAMl && !isBMl) return -1;
                if (!isAMl && isBMl) return 1;

                // If both are same type (both ml or both ltr), try to sort by number
                if ((isAMl && isBMl) || (isALtr && isBLtr)) {
                    const numA = parseFloat(a.replace(/[^0-9.]/g, ""));
                    const numB = parseFloat(b.replace(/[^0-9.]/g, ""));
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                }

                // Default string sort
                return a.localeCompare(b);
            });

            setAvailablePacks(uniquePacks);
        } else {
            setAvailablePacks([]);
        }
    }, [selectedFlavour, products]);

    useEffect(() => {
        if (selectedFlavour && selectedPack) {
            const prod = products.find(p => p.flavour === selectedFlavour && p.pack === selectedPack);
            setTargetProduct(prod || null);
        } else {
            setTargetProduct(null);
        }
    }, [selectedFlavour, selectedPack, products]);

    const handleAddBottleChange = (val: string, bpp: number) => {
        const b = parseInt(val, 10);
        if (!isNaN(b) && b >= bpp) {
            const extraPacks = Math.floor(b / bpp);
            const remBottles = b % bpp;
            setAddPacks(prev => String(parseInt(prev || "0", 10) + extraPacks));
            setAddBottles(String(remBottles));
        } else {
            setAddBottles(val);
        }
    };

    const handleRestock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!targetProduct) return;

        const bpp = parsePack(targetProduct.pack, targetProduct.name);
        const bottlesAdded = (parseInt(addPacks || "0", 10) * bpp) + parseInt(addBottles || "0", 10);

        try {
            const res = await fetch(`/api/products/${targetProduct._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    quantityToAdd: bottlesAdded
                }),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to update stock");
            }

            router.push("/stock");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const pack = formData.get("pack") as string;
        const bpp = parsePack(pack, name);

        const initialPacks = parseInt(formData.get("initialPacks") as string || "0", 10);
        const initialBottles = parseInt(formData.get("initialBottles") as string || "0", 10);
        const totalBottles = (initialPacks * bpp) + initialBottles;

        const data = {
            name: name,
            quantity: totalBottles,
            price: Number(formData.get("price")),
            invoiceCost: Number(formData.get("invoiceCost")),
            mrp: Number(formData.get("mrp")),
            salePrice: Number(formData.get("salePrice")),
            pack: pack,
            flavour: formData.get("flavour")
        };

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to add product");
            }

            router.push("/stock");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/stock"
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Manage Stock</h1>
            </div>

            {/* Mode Toggle */}
            <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-8 max-w-md mx-auto">
                <button
                    onClick={() => setMode("existing")}
                    className={clsx("flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all", {
                        "bg-white text-ruby-700 shadow-sm": mode === "existing",
                        "text-gray-500 hover:text-gray-900": mode !== "existing"
                    })}
                >
                    <Box className="w-4 h-4" />
                    Restock Existing
                </button>
                <button
                    onClick={() => setMode("new")}
                    className={clsx("flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all", {
                        "bg-white text-ruby-700 shadow-sm": mode === "new",
                        "text-gray-500 hover:text-gray-900": mode !== "new"
                    })}
                >
                    <Plus className="w-4 h-4" />
                    Add New Product
                </button>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                {mode === "existing" ? (
                    <form onSubmit={handleRestock} className="space-y-8">

                        {/* 1. Flavour Selection */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="bg-ruby-100 text-ruby-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Select Flavour
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {availableFlavours.map(flav => (
                                    <button
                                        key={flav}
                                        type="button"
                                        onClick={() => {
                                            setSelectedFlavour(flav);
                                            setSelectedPack(""); // Reset pack when flavour changes
                                        }}
                                        className={clsx("p-4 rounded-xl border text-sm font-medium transition-all text-center hover:shadow-md", {
                                            "border-ruby-500 bg-ruby-50 text-ruby-900 ring-2 ring-ruby-100": selectedFlavour === flav,
                                            "border-gray-200 bg-white text-gray-600 hover:border-ruby-200": selectedFlavour !== flav
                                        })}
                                    >
                                        {flav}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Pack Selection */}
                        {selectedFlavour && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="bg-ruby-100 text-ruby-700 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                    Select Pack
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {availablePacks.map(pack => (
                                        <button
                                            key={pack}
                                            type="button"
                                            onClick={() => setSelectedPack(pack)}
                                            className={clsx("px-6 py-3 rounded-full border text-sm font-bold transition-all hover:shadow-md flex items-center gap-2", {
                                                "border-teal-500 bg-teal-50 text-teal-800 ring-2 ring-teal-100": selectedPack === pack,
                                                "border-gray-200 bg-white text-gray-600 hover:border-teal-200": selectedPack !== pack
                                            })}
                                        >
                                            {pack}
                                            {selectedPack === pack && <Check className="w-4 h-4" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Confirmation & Quantity */}
                        {targetProduct && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-300 pt-6 border-t border-gray-100">
                                <div className="bg-gradient-to-r from-gray-50 to-white p-6 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-8 items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Selected Product</p>
                                        <div className="flex flex-col gap-1 mb-2">
                                            <p className="text-xl font-bold text-gray-900">{targetProduct.name}</p>
                                            <div className="flex gap-4 text-sm text-gray-500">
                                                <span>Cost: ₹{targetProduct.invoiceCost || "-"}</span>
                                                <span>Price: ₹{targetProduct.price}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <p className="text-xs text-ruby-600 font-bold uppercase tracking-wider">Current</p>
                                            <p className="text-2xl font-bold text-ruby-900">{Math.floor(targetProduct.quantity / parsePack(targetProduct.pack, targetProduct.name))}P + {targetProduct.quantity % parsePack(targetProduct.pack, targetProduct.name)}B</p>
                                        </div>
                                        <div className="text-gray-300">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <div className="w-48 flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={addPacks}
                                                onChange={(e) => setAddPacks(e.target.value)}
                                                placeholder="Packs"
                                                className="w-full px-3 py-3 rounded-lg border border-ruby-200 text-center font-bold text-xl text-ruby-900 focus:ring-2 focus:ring-ruby-500 outline-none placeholder:text-gray-300"
                                                autoFocus
                                            />
                                            <span className="text-gray-300 font-bold">+</span>
                                            <input
                                                type="number"
                                                value={addBottles}
                                                onChange={(e) => handleAddBottleChange(e.target.value, parsePack(targetProduct.pack, targetProduct.name))}
                                                placeholder="Bottles"
                                                className="w-full px-3 py-3 rounded-lg border border-ruby-200 text-center font-bold text-xl text-ruby-900 focus:ring-2 focus:ring-ruby-500 outline-none placeholder:text-gray-300"
                                            />
                                        </div>
                                        <div className="text-gray-300">
                                            <ArrowRight className="w-6 h-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-teal-600 font-bold uppercase tracking-wider">New Total</p>
                                            <p className="text-3xl font-bold text-teal-700">
                                                {(() => {
                                                    const bpp = parsePack(targetProduct.pack, targetProduct.name);
                                                    const added = (parseInt(addPacks || "0", 10) * bpp) + parseInt(addBottles || "0", 10);
                                                    const totalVal = targetProduct.quantity + added;
                                                    return `${Math.floor(totalVal / bpp)}P + ${totalVal % bpp}B`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
 
                                <div className="pt-8 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading || ((parseInt(addPacks || "0", 10) * parsePack(targetProduct.pack, targetProduct.name)) + parseInt(addBottles || "0", 10)) <= 0}
                                        className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-900/10"
                                    >
                                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <PackagePlus className="w-6 h-6" />}
                                        Confirm Restock
                                    </button>
                                </div>
                            </div>
                        )}
 
                        {!targetProduct && selectedFlavour && selectedPack && (
                            <div className="p-4 bg-amber-50 text-amber-700 rounded-lg text-sm border border-amber-100 flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                                Product not found for this specific combination.
                            </div>
                        )}
 
                    </form>
                ) : (
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Product Name</label>
                            <input
                                name="name"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                placeholder="e.g. Sprite 1.5 Ltr PET"
                            />
                        </div>
 
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Invoice Cost (₹)</label>
                                <input
                                    name="invoiceCost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
 
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50 p-6 rounded-xl">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Flavour</label>
                                <input
                                    name="flavour"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="e.g. Regular"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Pack Description</label>
                                <input
                                    name="pack"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="e.g. 12x1.5L"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">MRP (Base) (₹)</label>
                                <input
                                    name="mrp"
                                    type="number"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
 
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 text-ruby-700 font-bold">Initial Quantity</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        name="initialPacks"
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-lg border-2 border-ruby-100 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                        placeholder="Packs"
                                    />
                                    <span className="text-gray-400 font-bold">+</span>
                                    <input
                                        name="initialBottles"
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-lg border-2 border-ruby-100 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                        placeholder="Bottles"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700">Sale Price (₹)</label>
                                    <span className="text-[10px] text-ruby-600 font-bold uppercase">Required</span>
                                </div>
                                <input
                                    name="salePrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900 font-bold"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700">Today's Price (₹)</label>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Default: Sale Price</span>
                                </div>
                                <input
                                    name="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-ruby-500 focus:border-transparent transition-all text-gray-900"
                                    placeholder="Leave empty for Sale Price"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Check className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-emerald-800">
                                <span className="font-bold">Pro Tip:</span> Profit will be calculated as <span className="underline decoration-emerald-300 underline-offset-4 font-black">Today's Price - Invoice Cost</span> automatically.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-ruby-700 hover:bg-ruby-800 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-ruby-900/10 active:scale-95"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                                Save New Product
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
