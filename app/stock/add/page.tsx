"use client";

import { useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useWarehouse } from "@/components/WarehouseContext";
import Link from "next/link";
import {
    ArrowLeft,
    Save,
    Loader2,
    Plus,
    Box,
    PackagePlus,
    Check,
    Trash2,
    Printer,
    RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { parsePack, formatPacksAndBottles, PRODUCT_SORT_ORDER } from "@/lib/stock-utils";
import { formatIST } from "@/lib/dateUtils";

// ─── Pack ordering ─────────────────────────────────────────────────────────────
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

// ─── Input validation helpers ──────────────────────────────────────────────────
/** Blocks -, +, ., e, E from being typed into integer-only inputs */
function blockNonInteger(e: KeyboardEvent<HTMLInputElement>) {
    if (["-", "+", ".", "e", "E"].includes(e.key)) {
        e.preventDefault();
    }
}

/** Strips non-numeric characters on paste */
function handleIntPaste(
    e: ClipboardEvent<HTMLInputElement>,
    setter: (v: string) => void
) {
    e.preventDefault();
    const clean = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    setter(clean);
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface CartItem {
    productId: string;
    pack: string;
    flavour: string;
    bottlesPerPack: number;
    qtyAdded: number; // total bottles
    invoiceCost?: number;
}

interface ConfirmedRestock {
    restockId: string;
    userName: string;
    warehouseName: string;
    createdAt: string;
    items: CartItem[];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AddStockPage() {
    const router = useRouter();
    const { activeWarehouse } = useWarehouse();
    const [mode, setMode] = useState<"new" | "existing">("existing");

    // ── Existing (Restock) state ───────────────────────────────────────────────
    const [products, setProducts] = useState<any[]>([]);
    const [packGroups, setPackGroups] = useState<{ pack: string; flavours: string[] }[]>([]);
    const [selectedPack, setSelectedPack] = useState("");
    const [selectedFlavour, setSelectedFlavour] = useState("");
    const [targetProduct, setTargetProduct] = useState<any>(null);
    const [addPacks, setAddPacks] = useState("0");
    const [addBottles, setAddBottles] = useState("0");

    // Cart
    const [cart, setCart] = useState<CartItem[]>([]);
    const [saving, setSaving] = useState(false);

    // After confirmation — hold receipt data for print
    const [confirmedRestock, setConfirmedRestock] = useState<ConfirmedRestock | null>(null);

    // ── New Product state ──────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [newInvoiceCost, setNewInvoiceCost] = useState("");
    const [newSalePrice, setNewSalePrice] = useState("");
    const [newProfitMargin, setNewProfitMargin] = useState("");

    const handleInvoiceCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewInvoiceCost(val);
        const inv = parseFloat(val) || 0;
        const sale = parseFloat(newSalePrice) || 0;
        if (newSalePrice) {
            setNewProfitMargin((sale - inv).toFixed(2));
        }
    };

    const handleSalePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewSalePrice(val);
        const sale = parseFloat(val) || 0;
        const inv = parseFloat(newInvoiceCost) || 0;
        if (newInvoiceCost) {
            setNewProfitMargin((sale - inv).toFixed(2));
        }
    };

    const handleProfitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewProfitMargin(val);
        const profit = parseFloat(val) || 0;
        const inv = parseFloat(newInvoiceCost) || 0;
        if (newInvoiceCost) {
            setNewSalePrice((inv + profit).toFixed(2));
        }
    };


    // ── Fetch products when on existing tab ───────────────────────────────────
    useEffect(() => {
        if (mode !== "existing") return;

        // Reset inputs, selections, cart, and receipts when active warehouse changes
        setSelectedPack("");
        setSelectedFlavour("");
        setTargetProduct(null);
        setCart([]);
        setConfirmedRestock(null);
        setProducts([]);
        setPackGroups([]);

        fetch("/api/products")
            .then((r) => r.json())
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

                // Sort flavours using PRODUCT_SORT_ORDER
                packMap.forEach((flavours) => {
                    flavours.sort((a, b) => {
                        const ia = PRODUCT_SORT_ORDER.findIndex((s) =>
                            s.toLowerCase().includes(a.toLowerCase())
                        );
                        const ib = PRODUCT_SORT_ORDER.findIndex((s) =>
                            s.toLowerCase().includes(b.toLowerCase())
                        );
                        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
                    });
                });

                // Order packs by PACK_ORDER
                const ordered: { pack: string; flavours: string[] }[] = [];
                PACK_ORDER.forEach((orderedPack) => {
                    const norm = normalizeKey(orderedPack);
                    for (const [key, flavours] of packMap.entries()) {
                        if (normalizeKey(key) === norm) {
                            ordered.push({ pack: key, flavours });
                            packMap.delete(key);
                            break;
                        }
                    }
                });
                packMap.forEach((flavours, pack) => ordered.push({ pack, flavours }));
                setPackGroups(ordered);
            })
            .catch(console.error);
    }, [mode, activeWarehouse?.id]);

    // ── Resolve target product ─────────────────────────────────────────────────
    useEffect(() => {
        if (selectedPack && selectedFlavour) {
            const prod = products.find(
                (p) => p.pack === selectedPack && p.flavour === selectedFlavour
            );
            setTargetProduct(prod || null);
            if (prod) {
                setAddPacks("0");
                setAddBottles("0");
            }
        } else {
            setTargetProduct(null);
        }
    }, [selectedPack, selectedFlavour, products]);

    // ── Auto-convert excess bottles → packs ──────────────────────────────────
    useEffect(() => {
        if (!targetProduct) return;
        const bpp: number = targetProduct.bottlesPerPack;
        const b = parseInt(addBottles || "0", 10);
        if (b >= bpp) {
            const extraPacks = Math.floor(b / bpp);
            setAddPacks((prev) => (parseInt(prev || "0", 10) + extraPacks).toString());
            setAddBottles((b % bpp).toString());
        }
    }, [addBottles, targetProduct]);

    // ── Cart actions ───────────────────────────────────────────────────────────
    const addToCart = () => {
        if (!targetProduct) return;
        const bpp: number = targetProduct.bottlesPerPack;
        const totalBottles =
            parseInt(addPacks || "0", 10) * bpp + parseInt(addBottles || "0", 10);
        if (totalBottles <= 0) return;

        setCart((prev) => {
            const existingIdx = prev.findIndex(
                (c) => c.productId === targetProduct._id
            );
            if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    qtyAdded: updated[existingIdx].qtyAdded + totalBottles,
                };
                return updated;
            }
            return [
                ...prev,
                {
                    productId: targetProduct._id,
                    pack: targetProduct.pack,
                    flavour: targetProduct.flavour,
                    bottlesPerPack: bpp,
                    qtyAdded: totalBottles,
                    invoiceCost: targetProduct.invoiceCost || 0,
                },
            ];
        });

        setAddPacks("0");
        setAddBottles("0");
        setSelectedFlavour(""); // keep pack open for next flavour
    };

    const removeFromCart = (idx: number) =>
        setCart((prev) => prev.filter((_, i) => i !== idx));

    // ── Confirm restock ────────────────────────────────────────────────────────
    const handleConfirmRestock = async () => {
        if (cart.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch("/api/restocks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: cart.map((c) => ({
                        productId: c.productId,
                        qtyAdded: c.qtyAdded,
                        pack: c.pack,
                        flavour: c.flavour,
                        bottlesPerPack: c.bottlesPerPack,
                    })),
                }),
            });
            if (!res.ok) throw new Error((await res.json()).error || "Failed");
            const restock = await res.json();

            // Store for print receipt
            setConfirmedRestock({
                restockId: restock.restockId,
                userName: restock.userName,
                warehouseName: restock.warehouseName,
                createdAt: restock.createdAt,
                items: cart,
            });

            // Clear cart and refresh products (stock changed)
            setCart([]);
            fetch("/api/products")
                .then((r) => r.json())
                .then(setProducts)
                .catch(() => {});
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    // ── New Product form submit ────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const pack = formData.get("pack") as string;
        const flavour = formData.get("flavour") as string;
        const name = `${pack} ${flavour}`.trim();
        const bpp = Number(formData.get("bottlesPerPack") || parsePack(pack, name));

        const initialPacks = parseInt((formData.get("initialPacks") as string) || "0", 10);
        const initialBottles = parseInt((formData.get("initialBottles") as string) || "0", 10);
        const totalBottles = initialPacks * bpp + initialBottles;

        const data = {
            name,
            quantity: totalBottles,
            price: Number(formData.get("price")),
            invoiceCost: Number(formData.get("invoiceCost")),
            mrp: Number(formData.get("mrp")),
            salePrice: Number(formData.get("salePrice")),
            pack,
            flavour,
            bottlesPerPack: bpp,
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

    // ─── Derived ────────────────────────────────────────────────────────────────
    const isAddDisabled =
        !targetProduct ||
        parseInt(addPacks || "0", 10) * (targetProduct?.bottlesPerPack ?? 1) +
            parseInt(addBottles || "0", 10) <=
            0;

    const cartTotals = cart.reduce(
        (acc, item) => {
            acc.packs += Math.floor(item.qtyAdded / item.bottlesPerPack);
            acc.bottles += item.qtyAdded % item.bottlesPerPack;
            return acc;
        },
        { packs: 0, bottles: 0 }
    );

    // ─── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto pb-12">

            {/* ── Header ── */}
            <div className="flex items-center gap-4 mb-8 print:hidden">
                <Link
                    href="/stock"
                    className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-foreground">Manage Stock</h1>
                    <p className="text-sm text-muted-foreground">
                        Restock existing products or add new ones for <span className="font-bold text-primary">{activeWarehouse?.name || "Unit"}</span>
                    </p>
                </div>
            </div>

            {/* ── Mode Toggle ── */}
            <div className="bg-muted p-1 rounded-xl flex gap-1 mb-8 max-w-md mx-auto print:hidden">
                <button
                    onClick={() => setMode("existing")}
                    className={clsx(
                        "flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
                        {
                            "bg-white text-primary shadow-sm": mode === "existing",
                            "text-muted-foreground hover:text-foreground": mode !== "existing",
                        }
                    )}
                >
                    <Box className="w-4 h-4" />
                    Restock Existing
                </button>
                <button
                    onClick={() => setMode("new")}
                    className={clsx(
                        "flex-1 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all",
                        {
                            "bg-white text-primary shadow-sm": mode === "new",
                            "text-muted-foreground hover:text-foreground": mode !== "new",
                        }
                    )}
                >
                    <Plus className="w-4 h-4" />
                    Add New Product
                </button>
            </div>

            {mode === "existing" ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ══ LEFT: Product selector ══ */}
                    <div className="lg:col-span-2 space-y-6 print:hidden">
                        <div className="bg-card p-6 rounded-2xl shadow-erp-card border border-border">
                            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                                <PackagePlus className="w-4 h-4 text-primary" />
                                Select Products to Restock
                            </h2>

                            <label className="text-xs font-semibold text-muted-foreground uppercase mb-3 block">
                                Step 1 — Select Pack Size
                            </label>

                            <div className="space-y-3">
                                {packGroups.map((group) => (
                                    <div key={group.pack}>
                                        {/* Pack accordion header */}
                                        <button
                                            onClick={() => {
                                                setSelectedPack((prev) =>
                                                    prev === group.pack ? "" : group.pack
                                                );
                                                setSelectedFlavour("");
                                                setAddPacks("0");
                                                setAddBottles("0");
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-between",
                                                selectedPack === group.pack
                                                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                                    : "border-border bg-muted/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/10/40"
                                            )}
                                        >
                                            <span>{group.pack}</span>
                                            <span className="text-xs font-medium text-gray-400">
                                                {group.flavours.length} flavour
                                                {group.flavours.length !== 1 ? "s" : ""}
                                            </span>
                                        </button>

                                        {/* Flavour cards */}
                                        {selectedPack === group.pack && (
                                            <div className="mt-2 ml-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <label className="text-xs font-semibold text-muted-foreground uppercase mb-2 block">
                                                    Step 2 — Select Flavour &amp; Quantity
                                                </label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {group.flavours.map((flav) => {
                                                        const prod = products.find(
                                                            (p) =>
                                                                p.pack === group.pack &&
                                                                p.flavour === flav
                                                        );
                                                        return (
                                                            <div
                                                                key={flav}
                                                                className={clsx(
                                                                    "rounded-xl border transition-all overflow-hidden flex flex-col",
                                                                    selectedFlavour === flav
                                                                        ? "border-teal-500 bg-teal-50/50 ring-1 ring-teal-500"
                                                                        : "border-border bg-white hover:border-teal-300 hover:bg-teal-50/20"
                                                                )}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedFlavour((prev) =>
                                                                            prev === flav ? "" : flav
                                                                        );
                                                                        setAddPacks("0");
                                                                        setAddBottles("0");
                                                                    }}
                                                                    className={clsx(
                                                                        "p-3 w-full text-sm font-bold text-left flex justify-between items-center",
                                                                        selectedFlavour === flav
                                                                            ? "text-teal-900 bg-teal-100/50"
                                                                            : "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    <span>{flav}</span>
                                                                    {prod && (
                                                                        <span className="text-[10px] font-semibold text-gray-400">
                                                                            {formatPacksAndBottles(
                                                                                prod.quantity,
                                                                                prod.bottlesPerPack
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </button>

                                                                {selectedFlavour === flav &&
                                                                    targetProduct && (
                                                                        <div className="p-3 bg-white border-t border-teal-100 flex flex-col gap-3 animate-in slide-in-from-top-1">
                                                                            <div className="text-xs text-muted-foreground">
                                                                                In stock:{" "}
                                                                                <span className="font-bold text-foreground">
                                                                                    {formatPacksAndBottles(
                                                                                        targetProduct.quantity,
                                                                                        targetProduct.bottlesPerPack
                                                                                    )}
                                                                                </span>
                                                                                <span className="text-gray-400 ml-1">
                                                                                    ({targetProduct.bottlesPerPack} per pack)
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <div className="flex-1">
                                                                                    <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                                                                                        Packs
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        value={addPacks}
                                                                                        onChange={(e) =>
                                                                                            setAddPacks(
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        onKeyDown={blockNonInteger}
                                                                                        onPaste={(e) =>
                                                                                            handleIntPaste(
                                                                                                e,
                                                                                                setAddPacks
                                                                                            )
                                                                                        }
                                                                                        onBlur={(e) => {
                                                                                            if (
                                                                                                e.target.value === "" ||
                                                                                                e.target.value === "-"
                                                                                            )
                                                                                                setAddPacks("0");
                                                                                        }}
                                                                                        className="w-full px-2 py-1.5 text-center font-bold text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-foreground"
                                                                                    />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <label className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                                                                                        Bottles
                                                                                        <span className="ml-1 text-gray-400 normal-case">
                                                                                            (max{" "}
                                                                                            {targetProduct.bottlesPerPack -
                                                                                                1}
                                                                                            )
                                                                                        </span>
                                                                                    </label>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={
                                                                                            targetProduct.bottlesPerPack -
                                                                                            1
                                                                                        }
                                                                                        value={addBottles}
                                                                                        onChange={(e) =>
                                                                                            setAddBottles(
                                                                                                e.target.value
                                                                                            )
                                                                                        }
                                                                                        onKeyDown={blockNonInteger}
                                                                                        onPaste={(e) =>
                                                                                            handleIntPaste(
                                                                                                e,
                                                                                                setAddBottles
                                                                                            )
                                                                                        }
                                                                                        onBlur={(e) => {
                                                                                            if (
                                                                                                e.target.value === "" ||
                                                                                                e.target.value === "-"
                                                                                            )
                                                                                                setAddBottles("0");
                                                                                        }}
                                                                                        className="w-full px-2 py-1.5 text-center font-bold text-sm rounded-md border border-gray-300 focus:ring-2 focus:ring-teal-500 outline-none text-foreground"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <button
                                                                                onClick={addToCart}
                                                                                disabled={isAddDisabled}
                                                                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm uppercase tracking-widest"
                                                                            >
                                                                                <Plus className="w-4 h-4" />
                                                                                Add to Restock
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {!targetProduct && selectedPack && selectedFlavour && (
                                <div className="mt-4 text-amber-600 text-sm p-4 bg-amber-50 rounded-lg border border-amber-100">
                                    Product not found for this combination.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══ RIGHT: Restock cart ══ */}
                    <div className="lg:col-span-1 print:col-span-3">
                        <div className="bg-white rounded-xl shadow-lg border border-border sticky top-6 overflow-hidden flex flex-col print:shadow-none print:border-none print:relative print:top-0">

                            {/* ── Print-only receipt header ── */}
                            <div className="hidden print:block p-8 border-b-2 border-black mb-2">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h1 className="text-4xl font-black uppercase tracking-tighter text-black">
                                            Restock Receipt
                                        </h1>
                                        <p className="text-sm font-bold text-gray-600 mt-1">
                                            {confirmedRestock?.restockId ?? "—"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                            Warehouse
                                        </div>
                                        <div className="text-2xl font-black text-black">
                                            {confirmedRestock?.warehouseName ?? "—"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-8 text-sm mt-2">
                                    <div>
                                        <span className="font-bold text-gray-400 uppercase text-xs tracking-widest mr-2">
                                            By
                                        </span>
                                        <span className="font-bold text-black">
                                            {confirmedRestock?.userName ?? "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-bold text-gray-400 uppercase text-xs tracking-widest mr-2">
                                            Date
                                        </span>
                                        <span className="font-bold text-black">
                                            {confirmedRestock
                                                ? formatIST(new Date(confirmedRestock.createdAt), {
                                                      dateStyle: "long",
                                                      timeStyle: "short",
                                                  })
                                                : formatIST(new Date())}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Screen panel header ── */}
                            <div className="p-4 bg-muted/50 border-b border-border print:bg-white print:border-b-2 print:border-black">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="font-bold text-foreground flex items-center gap-2 print:text-2xl print:font-black">
                                        Restock Items
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full print:bg-black print:text-white">
                                            {confirmedRestock
                                                ? confirmedRestock.items.length
                                                : cart.length}{" "}
                                            Items
                                        </span>
                                    </h2>
                                    {(cart.length > 0 || confirmedRestock) && (
                                        <button
                                            onClick={() => window.print()}
                                            className="p-2 hover:bg-white rounded-lg text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-border print:hidden"
                                            title="Print Receipt"
                                        >
                                            <Printer className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>

                                {/* Cart / receipt totals */}
                                {(cart.length > 0 || confirmedRestock) && (
                                    <>
                                        <div className="flex justify-between text-sm print:mt-4">
                                            <span className="text-muted-foreground font-medium print:font-bold print:text-lg">
                                                Total Added
                                            </span>
                                            <span className="font-bold text-foreground print:text-2xl print:font-black">
                                                {(() => {
                                                    const items = confirmedRestock
                                                        ? confirmedRestock.items
                                                        : cart;
                                                    let p = 0,
                                                        b = 0;
                                                    items.forEach((i) => {
                                                        p += Math.floor(i.qtyAdded / i.bottlesPerPack);
                                                        b += i.qtyAdded % i.bottlesPerPack;
                                                    });
                                                    return `${p} Packs + ${b} Bottles`;
                                                })()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1 print:mt-2">
                                            <span className="text-muted-foreground font-medium print:font-bold print:text-lg">
                                                Total Price
                                            </span>
                                            <span className="font-bold text-foreground print:text-2xl print:font-black">
                                                {(() => {
                                                    const items = confirmedRestock
                                                        ? confirmedRestock.items
                                                        : cart;
                                                    let total = 0;
                                                    items.forEach((i) => {
                                                        const packs = Math.floor(i.qtyAdded / i.bottlesPerPack);
                                                        const bottles = i.qtyAdded % i.bottlesPerPack;
                                                        const invoiceCost = i.invoiceCost || 0;
                                                        total += (packs * invoiceCost) + (bottles * (invoiceCost / i.bottlesPerPack));
                                                    });
                                                    return new Intl.NumberFormat("en-IN", {
                                                        style: "currency",
                                                        currency: "INR",
                                                    }).format(total);
                                                })()}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Success banner after confirmation */}
                                {confirmedRestock && (
                                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 print:hidden">
                                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span>
                                            Restock confirmed!{" "}
                                            <span className="font-black">{confirmedRestock.restockId}</span>
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* ── Cart / confirmed items ── */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 print:overflow-visible print:p-0 print:mt-6">
                                {(() => {
                                    const displayItems = confirmedRestock
                                        ? confirmedRestock.items
                                        : cart;
                                    if (displayItems.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-gray-400 print:hidden">
                                                <div className="bg-muted/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                                    <PackagePlus className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <p className="text-sm">No items added yet.</p>
                                                <p className="text-xs mt-1">
                                                    Pick a pack size → flavour on the left.
                                                </p>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="space-y-3 print:space-y-0 print:border-t print:border-black">
                                            {displayItems.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-3 bg-white border border-border p-3 rounded-lg shadow-sm print:shadow-none print:border-b print:border-border print:rounded-none print:p-4"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-foreground truncate print:text-xl print:font-black">
                                                            {item.pack} — {item.flavour}
                                                        </div>
                                                        <div className="text-xs font-semibold text-teal-600 mt-0.5 print:hidden">
                                                            +{formatPacksAndBottles(
                                                                item.qtyAdded,
                                                                item.bottlesPerPack
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-foreground text-lg print:text-3xl">
                                                        {formatPacksAndBottles(
                                                            item.qtyAdded,
                                                            item.bottlesPerPack
                                                        )}
                                                    </div>
                                                    {/* Only show remove when in cart (not confirmed) */}
                                                    {!confirmedRestock && (
                                                        <button
                                                            onClick={() => removeFromCart(idx)}
                                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors print:hidden"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* ── Print footer signature lines ── */}
                            <div className="hidden print:block mt-12 pt-8 border-t-2 border-black">
                                <div className="flex justify-between px-4">
                                    <div className="text-center">
                                        <div className="w-48 border-b border-black mb-2" />
                                        <div className="text-xs font-black uppercase">
                                            Warehouse In-charge
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-48 border-b border-black mb-2" />
                                        <div className="text-xs font-black uppercase">Manager</div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Action buttons ── */}
                            <div className="p-4 border-t border-border bg-muted/50 print:hidden space-y-2">
                                {confirmedRestock ? (
                                    /* After confirmation: offer to start a new restock */
                                    <button
                                        onClick={() => {
                                            setConfirmedRestock(null);
                                            setCart([]);
                                            setSelectedPack("");
                                            setSelectedFlavour("");
                                        }}
                                        className="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        New Restock
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleConfirmRestock}
                                        disabled={cart.length === 0 || saving}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-sm uppercase tracking-widest"
                                    >
                                        {saving ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Save className="w-5 h-5" />
                                        )}
                                        Confirm Restock
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* ══ Add New Product form ══ */
                <div className="bg-card p-8 rounded-2xl shadow-erp-card border border-border min-h-[400px]">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleCreate} className="space-y-6">
                        {/* Row 1: Pack Description & Flavour */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-muted/50 p-6 rounded-xl">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Pack Description
                                </label>
                                <input
                                    name="pack"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="e.g. 12x1.5L, 250 ml PET"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Flavour</label>
                                <input
                                    name="flavour"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="e.g. Regular, Orange"
                                />
                            </div>
                        </div>

                        {/* Row 2: Bottles Per Pack & Invoice Cost */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Bottles Per Pack (BPP)
                                </label>
                                <input
                                    name="bottlesPerPack"
                                    type="number"
                                    min="1"
                                    defaultValue="24"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="24"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Invoice Cost (₹)
                                </label>
                                <input
                                    name="invoiceCost"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={newInvoiceCost}
                                    onChange={handleInvoiceCostChange}
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Row 3: MRP (Base) & Profit / Margin */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    MRP (Base) (₹)
                                </label>
                                <input
                                    name="mrp"
                                    type="number"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    Profit / Margin (₹)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newProfitMargin}
                                    onChange={handleProfitChange}
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-foreground font-bold bg-emerald-50"
                                    placeholder="Auto-calculated"
                                />
                            </div>
                        </div>

                        {/* Row 4: Sale Price & Initial Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Sale Price (₹)
                                    </label>
                                    <span className="text-[10px] text-primary font-bold uppercase">
                                        Required
                                    </span>
                                </div>
                                <input
                                    name="salePrice"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={newSalePrice}
                                    onChange={handleSalePriceChange}
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground font-bold"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-primary font-bold">
                                    Initial Quantity
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        name="initialPacks"
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-lg border-2 border-ruby-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                        placeholder="Packs"
                                    />
                                    <span className="text-gray-400 font-bold">+</span>
                                    <input
                                        name="initialBottles"
                                        type="number"
                                        min="0"
                                        className="w-full px-4 py-2 rounded-lg border-2 border-ruby-100 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                        placeholder="Bottles"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 5: Today's Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Today&apos;s Price (₹)
                                    </label>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                        Default: Sale Price
                                    </span>
                                </div>
                                <input
                                    name="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-foreground"
                                    placeholder="Leave empty for Sale Price"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Check className="w-5 h-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-emerald-800">
                                <span className="font-bold">Pro Tip:</span> Profit will be
                                calculated as{" "}
                                <span className="underline decoration-emerald-300 underline-offset-4 font-black">
                                    Today&apos;s Price - Invoice Cost
                                </span>{" "}
                                automatically.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl font-black flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 active:scale-95 text-sm uppercase tracking-widest"
                            >
                                {loading ? (
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                    <Save className="w-6 h-6" />
                                )}
                                Save New Product
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
