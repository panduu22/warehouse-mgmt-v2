import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Plus } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Warehouse from "@/models/Warehouse";
import { cookies } from "next/headers";
import DeleteProductButton from "./DeleteProductButton";
import { QuantityEditor } from "./QuantityEditor";
import { PriceEditor } from "./PriceEditor";
import mongoose from "mongoose";
import StockSearch from "@/components/StockSearch";
import StockExcelImport from "@/components/StockExcelImport";

async function getProducts() {
    await dbConnect();
    
    // Get active warehouse context
    const cookieStore = await cookies();
    let warehouseId = cookieStore.get("activeWarehouseId")?.value;
    
    if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
        const main = await Warehouse.findOne({ isMain: true });
        if (main) warehouseId = main._id.toString();
        else warehouseId = undefined;
    }
    
    const warehouse = warehouseId ? await Warehouse.findById(warehouseId) : null;
    const filter = warehouseId ? { warehouseId } : {};

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return {
        products: JSON.parse(JSON.stringify(products)),
        warehouseName: warehouse?.name || "Unit"
    };
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const { q: query } = await searchParams;
    const session = await getServerSession(authOptions);
    const { products: allProducts, warehouseName } = await getProducts();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    // Filtering
    const products = query ? allProducts.filter((p: any) => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.flavour?.toLowerCase().includes(query.toLowerCase()) ||
        p.pack?.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase())
    ) : allProducts;


    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return "₹0";
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                <div className="flex items-center gap-3">
                    {isAdmin && <StockExcelImport />}
                    <Link
                        href="/stock/add"
                        className="bg-ruby-700 hover:bg-ruby-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Add Stock
                    </Link>
                </div>
            </div>

            <div className="mb-6">
                <StockSearch />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold">
                        <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4">Invoice Cost</th>
                            <th className="px-6 py-4">MRP (Base)</th>
                            <th className="px-6 py-4">Today's Price</th>
                            <th className="px-6 py-4">Profit/Margin</th>
                            <th className="px-6 py-4">Sale Price</th>
                            <th className="px-6 py-4 text-right">Quantity</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                    No products found in {warehouseName}.
                                </td>
                            </tr>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            products.map((product: any) => {
                                const currentPrice = product.price || product.salePrice || 0;
                                const profit = currentPrice - (product.invoiceCost || 0);
                                return (
                                    <tr key={product._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{formatCurrency(product.invoiceCost)}</td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{formatCurrency(product.mrp)}</td>
                                        <td className="px-6 py-4">
                                            <PriceEditor productId={product._id} initialPrice={product.price || product.salePrice} />
                                        </td>
                                        <td className={`px-6 py-4 font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(profit)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-bold">{formatCurrency(product.salePrice)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <QuantityEditor productId={product._id} initialQuantity={product.quantity} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <DeleteProductButton productId={product._id} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
