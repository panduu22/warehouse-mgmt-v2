"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Pencil, Trash2, X, Check, Save, Loader2 } from "lucide-react";
import { useGodown } from "@/components/GodownProvider";
import clsx from "clsx";

interface Product {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number; // MRP
    dailyPrice: number; // Effective today's price
    isDailyPriceOverridden: boolean;
    location?: string;
    invoiceCost?: number;
    salePrice?: number;
    pack?: string;
    flavour?: string;
}

export function StockTable({ isAdmin }: { isAdmin: boolean }) {
    const { selectedWarehouse, isLoading: isWarehouseLoading } = useGodown();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Daily Pricing State
    const [updatingPricingId, setUpdatingPricingId] = useState<string | null>(null);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Product>>({});

    // Add State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<"EXISTING" | "NEW">("EXISTING");
    const [selectedExistingId, setSelectedExistingId] = useState("");
    const [addQuantity, setAddQuantity] = useState("");

    const [newProduct, setNewProduct] = useState({
        name: "",
        quantity: "",
        price: "",
        invoiceCost: "",
        salePrice: "",
        location: "",
        pack: "",
        flavour: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (selectedWarehouse && !isWarehouseLoading) {
            fetchProducts();
        }
    }, [selectedWarehouse, isWarehouseLoading]);

    const fetchProducts = async () => {
        if (!selectedWarehouse) return;
        setIsLoading(true);
        try {
            const res = await axios.get(`/api/products?warehouseId=${selectedWarehouse.id}`);
            setProducts(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDailyPriceChange = async (productId: string, price: string) => {
        if (!selectedWarehouse || !price) return;
        setUpdatingPricingId(productId);
        try {
            await axios.post("/api/daily-pricing", {
                productId,
                warehouseId: selectedWarehouse.id,
                price: Number(price),
                date: new Date().toISOString()
            });
            fetchProducts();
        } catch (error) {
            alert("Failed to update daily price");
        } finally {
            setUpdatingPricingId(null);
        }
    };

    const handleEditClick = (product: Product) => {
        setEditingId(product.id);
        const { ...form } = product;
        setEditForm(form);
    };

    const handleSave = async (id: string) => {
        try {
            await axios.patch(`/api/products/${id}`, editForm);
            setEditingId(null);
            fetchProducts(); // Refresh to be safe
        } catch (error) {
            alert("Failed to update product");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await axios.delete(`/api/products/${id}`);
            fetchProducts();
        } catch (error) {
            alert("Failed to delete product");
        }
    };

    const handleAddExisting = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExistingId || !addQuantity) return;
        setIsSubmitting(true);
        try {
            const product = products.find(p => p.id === selectedExistingId);
            if (!product) return;

            const newQty = (product.quantity || 0) + Number(addQuantity);
            await axios.patch(`/api/products/${selectedExistingId}`, { quantity: newQty });

            setIsAddModalOpen(false);
            setSelectedExistingId("");
            setAddQuantity("");
            fetchProducts();
        } catch (error) {
            alert("Failed to add stock");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWarehouse) return;
        setIsSubmitting(true);
        try {
            await axios.post("/api/products", {
                ...newProduct,
                warehouseId: selectedWarehouse.id
            });
            setIsAddModalOpen(false);
            setNewProduct({ name: "", quantity: "", price: "", invoiceCost: "", salePrice: "", location: "", pack: "", flavour: "" });
            fetchProducts();
        } catch (error) {
            alert("Failed to add product");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isWarehouseLoading) return <div>Loading...</div>;
    if (!selectedWarehouse) return <div>Please select a warehouse first.</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                {/* Add Stock visible to everyone (Staff & Admin) */}
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-ruby-700 hover:bg-ruby-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                    <Loader2 className={clsx("w-5 h-5", !isLoading && "hidden")} />
                    {!isLoading && <Plus className="w-5 h-5" />}
                    Add Stock
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4">Invoice Cost</th>
                            <th className="px-6 py-4">MRP (Base)</th>
                            <th className="px-6 py-4">Today's Price</th>
                            <th className="px-6 py-4 text-center">Profit/Margin</th>
                            <th className="px-6 py-4">Sale Price</th>
                            <th className="px-6 py-4 text-right">Quantity</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading && products.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center">Loading stock...</td></tr>
                        ) : !Array.isArray(products) || products.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    No products found in {selectedWarehouse.name}.
                                </td>
                            </tr>
                        ) : (
                            products.map((product) => {
                                const profit = product.dailyPrice - (product.invoiceCost || product.dailyPrice);

                                return (
                                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                                        {editingId === product.id ? (
                                            <>
                                                <td className="px-6 py-4">
                                                    <input
                                                        className="border rounded px-2 py-1 w-full"
                                                        value={editForm.name}
                                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editForm.invoiceCost}
                                                        onChange={e => setEditForm({ ...editForm, invoiceCost: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editForm.price}
                                                        onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-gray-400 text-xs italic">Set Daily Price in Main View</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    -
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editForm.salePrice}
                                                        onChange={e => setEditForm({ ...editForm, salePrice: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24 text-right"
                                                        value={editForm.quantity}
                                                        onChange={e => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    <button onClick={() => handleSave(product.id)} className="text-green-600 hover:text-green-800"><Save className="w-5 h-5" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {product.name}
                                                    <div className="text-xs text-gray-400">{product.pack} {product.flavour}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">₹{product.invoiceCost || "-"}</td>
                                                <td className="px-6 py-4 text-gray-600 font-medium">₹{product.price || "-"}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {isAdmin ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                placeholder={(product.salePrice || product.price).toString()}
                                                                className={clsx(
                                                                    "border rounded px-2 py-1 w-24 text-sm font-bold",
                                                                    product.isDailyPriceOverridden ? "border-ruby-200 bg-ruby-50 text-ruby-700 shadow-sm" : "border-gray-200 bg-gray-50/50"
                                                                )}
                                                                defaultValue={product.isDailyPriceOverridden ? product.dailyPrice : ""}
                                                                onBlur={(e) => {
                                                                    if (e.target.value && Number(e.target.value) !== product.dailyPrice) {
                                                                        handleDailyPriceChange(product.id, e.target.value);
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        handleDailyPriceChange(product.id, (e.target as HTMLInputElement).value);
                                                                    }
                                                                }}
                                                            />
                                                            {updatingPricingId === product.id && <Loader2 className="w-4 h-4 animate-spin text-ruby-600" />}
                                                        </div>
                                                    ) : (
                                                        <span className={clsx("font-bold", product.isDailyPriceOverridden ? "text-ruby-700" : "text-gray-900")}>
                                                            ₹{product.dailyPrice}
                                                            {!product.isDailyPriceOverridden && <span className="ml-1 text-[10px] text-gray-400 font-normal">(Sale Price)</span>}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={clsx(
                                                        "px-2 py-1 rounded text-xs font-bold",
                                                        profit > 0 ? "bg-emerald-50 text-emerald-700" :
                                                            profit < 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"
                                                    )}>
                                                        {profit > 0 ? "+" : ""}{profit.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">₹{product.salePrice || "-"}</td>
                                                <td className="px-6 py-4 text-right font-medium">
                                                    <span className={clsx(
                                                        product.quantity < 10 ? "text-red-600" :
                                                            product.quantity < 50 ? "text-amber-600" : "text-emerald-600"
                                                    )}>
                                                        {product.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {/* Edit visible to everyone */}
                                                    <button onClick={() => handleEditClick(product)} className="text-gray-400 hover:text-ruby-600"><Pencil className="w-4 h-4" /></button>
                                                    {/* Delete restricted to Admin */}
                                                    {isAdmin && (
                                                        <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Redesigned Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px]">
                        {/* Panel 1: Existing Stock */}
                        <div className={clsx("flex-1 p-8 transition-all flex flex-col", addMode === "EXISTING" ? "bg-white" : "bg-gray-50/50 opacity-60")}>
                            <button
                                onClick={() => setAddMode("EXISTING")}
                                className="text-left w-full mb-8 group"
                            >
                                <span className={clsx("text-xs font-bold uppercase tracking-widest block mb-1 transition-colors", addMode === "EXISTING" ? "text-ruby-600" : "text-gray-400 group-hover:text-gray-600")}>Section A</span>
                                <h2 className={clsx("text-2xl font-black transition-colors", addMode === "EXISTING" ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")}>Add Existing Stock</h2>
                                <p className="text-sm text-gray-500 mt-1">Update quantity of items already in inventory.</p>
                            </button>

                            {addMode === "EXISTING" ? (
                                <form onSubmit={handleAddExisting} className="space-y-6 flex-1 flex flex-col animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">1. Select Product</label>
                                            <select
                                                required
                                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-medium focus:ring-2 focus:ring-ruby-500 transition-all outline-none appearance-none cursor-pointer"
                                                value={selectedExistingId}
                                                onChange={e => setSelectedExistingId(e.target.value)}
                                            >
                                                <option value="">Search by flavour/pack...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.flavour} — {p.pack} ({p.name})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">2. Quantity to Add</label>
                                            <input
                                                required
                                                type="number"
                                                placeholder="Enter amount..."
                                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 text-gray-900 font-mono text-2xl font-bold focus:ring-2 focus:ring-ruby-500 transition-all outline-none"
                                                value={addQuantity}
                                                onChange={e => setAddQuantity(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-6">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full bg-ruby-700 text-white font-black py-5 rounded-2xl hover:bg-ruby-800 shadow-xl shadow-ruby-900/20 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
                                        >
                                            {isSubmitting ? "Updating..." : "Increase Stock"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <button onClick={() => setAddMode("EXISTING")} className="text-ruby-600 font-bold hover:underline">Click to use this section</button>
                                </div>
                            )}
                        </div>

                        {/* Middle Divider */}
                        <div className="w-px bg-gray-100 hidden md:block"></div>
                        <div className="h-px bg-gray-100 md:hidden"></div>

                        {/* Panel 2: New Stock */}
                        <div className={clsx("flex-1 p-8 transition-all flex flex-col", addMode === "NEW" ? "bg-white" : "bg-gray-50/50 opacity-60")}>
                            <button
                                onClick={() => setAddMode("NEW")}
                                className="text-left w-full mb-8 group"
                            >
                                <span className={clsx("text-xs font-bold uppercase tracking-widest block mb-1 transition-colors", addMode === "NEW" ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600")}>Section B</span>
                                <h2 className={clsx("text-2xl font-black transition-colors", addMode === "NEW" ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600")}>Register New Stock</h2>
                                <p className="text-sm text-gray-500 mt-1">Add a completely new product to the system.</p>
                            </button>

                            {addMode === "NEW" ? (
                                <form onSubmit={handleAdd} className="space-y-4 flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="space-y-3">
                                        <input required placeholder="Product Name (e.g. Sprite 2.25L)" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input required placeholder="Flavour" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500" value={newProduct.flavour} onChange={e => setNewProduct({ ...newProduct, flavour: e.target.value })} />
                                            <input required placeholder="Pack Size" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500" value={newProduct.pack} onChange={e => setNewProduct({ ...newProduct, pack: e.target.value })} />
                                            <input required type="number" placeholder="Quantity" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} />
                                            <input required type="number" placeholder="MRP" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                                            <input required type="number" placeholder="Inv. Cost" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono" value={newProduct.invoiceCost} onChange={e => setNewProduct({ ...newProduct, invoiceCost: e.target.value })} />
                                            <input type="number" placeholder="Sale Price" className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500 font-mono" value={newProduct.salePrice} onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-6">
                                        <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl hover:bg-emerald-700 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest">
                                            {isSubmitting ? "Registering..." : "Create Product"}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex-1 flex items-center justify-center p-8">
                                    <button onClick={() => setAddMode("NEW")} className="text-emerald-600 font-bold hover:underline">Click to use this section</button>
                                </div>
                            )}

                            <div className="mt-6 text-center">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-xs font-black text-gray-400 hover:text-red-500 uppercase tracking-tighter transition-colors flex items-center justify-center gap-1 mx-auto">
                                    <X className="w-3 h-3" /> Dismiss Window
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
