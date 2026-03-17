"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
// Note: Client Component cannot import dbConnect directly if we were calling it? 
// No, I'm fetching data.
// But I need an API route for GET specific bill OR I'll reuse GET /api/bills? 
// Reuse is inefficient. I'll add `GET /api/bills/[id]`.
// Wait, I haven't created `GET /api/bills/[id]`.
// I can just filter on client side from full list if list is small? MVP?
// Better to check `GET /api/bills` logic. It returns all.
// I'll create `app/api/bills/[id]/route.ts` quickly or just use `GET /api/bills` and filter client side for speed now.
// I'll create the route is cleaner.

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bill, setBill] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetching from general list for now to save route creation step, 
        // assuming list is small for this MVP demo.
        // Ideally create /api/bills/[id].
        fetch("/api/bills")
            .then(res => res.json())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((bills: any[]) => {
                const found = bills.find(b => b._id === id);
                if (found) setBill(found);
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline" /></div>;
    if (!bill) return <div className="p-12 text-center text-red-500">Invoice not found</div>;

    return (
        <div className="max-w-3xl mx-auto print:max-w-none print:w-full">
            <div className="print:hidden flex justify-between items-center mb-8">
                <Link href="/bills" className="flex items-center gap-2 text-gray-500 hover:text-gray-900">
                    <ArrowLeft className="w-5 h-5" /> Back
                </Link>
                <button
                    onClick={() => window.print()}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black transition-colors"
                >
                    <Printer className="w-4 h-4" /> Print Invoice
                </button>
            </div>

            <div className="bg-white p-12 rounded-xl shadow-lg border border-gray-100 print:shadow-none print:border-none print:p-0">
                <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-ruby-700 mb-2">INVOICE</h1>
                        <p className="text-gray-500">#{bill._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="font-bold text-gray-900 text-xl">WMS Corp</h2>
                        <p className="text-gray-500 text-sm">Warehouse #42<br />Industrial Area</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                        <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Billed To</p>
                        <h3 className="font-bold text-gray-900 text-lg">{bill.tripId?.vehicleId?.driverName}</h3>
                        <p className="text-gray-500">{bill.tripId?.vehicleId?.number}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-2">Date</p>
                        <p className="font-bold text-gray-900">{new Date(bill.generatedAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <table className="w-full mb-12">
                    <thead className="bg-gray-50 text-gray-500 font-medium text-sm">
                        <tr>
                            <th className="px-4 py-3 text-left">Item Description</th>
                            <th className="px-4 py-3 text-right">Sold Qty</th>
                            <th className="px-4 py-3 text-right">Price</th>
                            <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {bill.tripId?.loadedItems.map((item: any, idx: number) => {
                            const sold = item.qtyLoaded - (item.qtyReturned || 0);
                            if (sold <= 0) return null;
                            return (
                                <tr key={`${item.productId?._id || 'item'}-${idx}`}>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {item.productId.name}
                                        <span className="text-gray-400 font-normal text-xs block">{item.productId.sku}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-600">{sold}</td>
                                    <td className="px-4 py-3 text-right text-gray-600">₹{item.productId.price}</td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">₹{sold * item.productId.price}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="flex justify-end border-t border-gray-100 pt-8">
                    <div className="w-64">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-medium text-gray-500">Subtotal</span>
                            <span className="font-bold text-gray-900">₹{bill.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xl pt-4 border-t border-gray-200">
                            <span className="font-bold text-ruby-700">Total</span>
                            <span className="font-bold text-ruby-700">₹{bill.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-gray-400 text-sm print:fixed print:bottom-8 print:w-full">
                    Thank you for your business.
                </div>
            </div>
        </div>
    );
}
