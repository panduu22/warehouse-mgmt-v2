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
        setEditForm(product);
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

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg text-gray-900">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">Add New Stock</h2>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Product Name</label>
                                <input required className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Quantity</label>
                                    <input required type="number" className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">MRP</label>
                                    <input required type="number" className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Invoice Cost</label>
                                    <input required type="number" className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.invoiceCost} onChange={e => setNewProduct({ ...newProduct, invoiceCost: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Sale Price</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.salePrice} onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Location</label>
                                    <input className="w-full border rounded-lg px-3 py-2 text-gray-900 bg-white" value={newProduct.location} onChange={e => setNewProduct({ ...newProduct, location: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-ruby-600 text-white rounded-lg hover:bg-ruby-700 disabled:opacity-50">
                                    {isSubmitting ? "Adding..." : "Add Stock"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
