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

async function getProducts() {
    await dbConnect();
    
    // Get active warehouse context
    const cookieStore = await cookies();
    let warehouseId = cookieStore.get("activeWarehouseId")?.value;
    
    if (!warehouseId) {
        const main = await Warehouse.findOne({ isMain: true });
        if (main) warehouseId = main._id.toString();
    }
    
    const filter = warehouseId ? { warehouseId } : {};

    const products = await Product.find(filter).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(products));
}

export default async function StockPage() {
    const session = await getServerSession(authOptions);
    const products = await getProducts();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                {isAdmin && (
                    <Link
                        href="/stock/add"
                        className="bg-ruby-700 hover:bg-ruby-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Add Product
                    </Link>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Product Name</th>
                            <th className="px-6 py-4">Invoice Cost</th>
                            <th className="px-6 py-4">Price</th>
                            <th className="px-6 py-4 text-right">Quantity</th>
                            {isAdmin && <th className="px-6 py-4 w-10"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {products.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No products found. Add some stock to get started.
                                </td>
                            </tr>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            products.map((product: any) => (
                                <tr key={product._id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4 text-gray-600">₹{product.invoiceCost || product.mrp || "-"}</td>
                                    <td className="px-6 py-4 text-gray-600">₹{product.price}</td>
                                    <td className="px-6 py-4 text-right">
                                        {isAdmin ? (
                                            <QuantityEditor productId={product._id} initialQuantity={product.quantity} />
                                        ) : (
                                            <span
                                                className={
                                                    product.quantity < 10
                                                        ? "text-red-600 font-bold"
                                                        : product.quantity < 50
                                                            ? "text-amber-600 font-bold"
                                                            : "text-emerald-600 font-bold"
                                                }
                                            >
                                                {product.quantity}
                                            </span>
                                        )}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-right">
                                            <DeleteProductButton productId={product._id} />
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
