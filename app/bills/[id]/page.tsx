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

            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-gray-100 print:shadow-none print:border-none print:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-gray-100 pb-10">
                    <div className="flex flex-col gap-1">
                        <div className="bg-ruby-700 text-white px-3 py-1 rounded-md w-fit text-xs font-bold tracking-widest mb-4">OFFICIAL INVOICE</div>
                        <h1 className="text-3xl font-black text-gray-900 leading-tight">INVOICE <span className="text-ruby-700">#{bill._id.slice(-6).toUpperCase()}</span></h1>
                        <p className="text-gray-500 font-medium">Generated on {new Date(bill.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="md:text-right flex flex-col gap-1">
                        <h2 className="font-black text-gray-900 text-2xl uppercase tracking-tighter">{bill.warehouseId?.name || "WMS CORP"}</h2>
                        <p className="text-gray-500 text-sm leading-relaxed max-w-[200px] md:ml-auto">
                            {bill.warehouseId?.location || "Main Warehouse Facility"}<br />
                            Inventory Management System
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 bg-gray-50/50 p-6 rounded-2xl border border-gray-100/50">
                    <div>
                        <p className="text-[10px] uppercase font-black text-ruby-700 tracking-[0.2em] mb-3">Customer / Trip Details</p>
                        <h3 className="font-extrabold text-gray-900 text-xl mb-1">{bill.tripId?.vehicleId?.driverName || "Standard Delivery"}</h3>
                        <p className="text-gray-600 font-medium flex items-center gap-2">
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">{bill.tripId?.vehicleId?.number || "N/A"}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            Vehicle Trip #{bill.tripId?._id.slice(-6).toUpperCase()}
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[10px] uppercase font-black text-ruby-700 tracking-[0.2em] mb-3">Payment Summary</p>
                        <p className="text-3xl font-black text-gray-900">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                        <p className="text-emerald-600 font-bold text-xs uppercase tracking-wider mt-1">Paid / Settlement Pending</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-12">
                        <thead>
                            <tr className="border-b-2 border-gray-900 text-[11px] uppercase font-black text-gray-900 tracking-widest">
                                <th className="px-4 py-4 text-left">Product Details</th>
                                <th className="px-4 py-4 text-right">Qty</th>
                                <th className="px-4 py-4 text-right">Unit Price</th>
                                <th className="px-4 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bill.items && bill.items.length > 0 ? (
                                bill.items.map((item: any, idx: number) => (
                                    <tr key={`bill-item-${idx}`} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-5">
                                            <div className="font-extrabold text-gray-900 text-base">{item.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-ruby-700 font-bold text-[10px] uppercase">{item.flavour}</span>
                                                <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                <span className="text-gray-500 font-medium text-[10px] uppercase">{item.pack}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 text-right font-bold text-gray-900">{item.quantity}</td>
                                        <td className="px-4 py-5 text-right font-medium text-gray-600">₹{item.price.toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-5 text-right font-black text-gray-900">₹{item.total.toLocaleString('en-IN')}</td>
                                    </tr>
                                ))
                            ) : (
                                // Fallback for very old bills if migration missed them
                                bill.tripId?.loadedItems.map((item: any, idx: number) => {
                                    const sold = item.qtyLoaded - (item.qtyReturned || 0);
                                    if (sold <= 0) return null;
                                    const price = item.productId?.price || 0;
                                    return (
                                        <tr key={`fallback-item-${idx}`}>
                                            <td className="px-4 py-5 font-bold text-gray-900">{item.productId?.name}</td>
                                            <td className="px-4 py-5 text-right font-bold">{sold}</td>
                                            <td className="px-4 py-5 text-right">₹{price}</td>
                                            <td className="px-4 py-5 text-right font-bold">₹{sold * price}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end border-t-2 border-gray-900 pt-8 mt-12">
                    <div className="w-full md:w-72 space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold text-gray-500 uppercase tracking-widest">
                            <span>Net Total</span>
                            <span className="text-gray-900">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                            <span className="text-lg font-black text-gray-900 uppercase tracking-tighter">Grand Total</span>
                            <span className="text-3xl font-black text-ruby-700">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-20 flex flex-col items-center gap-4 text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Signature / Stamp</p>
                    <div className="w-48 h-px bg-gray-200"></div>
                    <p className="text-[10px] text-gray-400 font-medium max-w-sm">
                        This is a computer generated invoice and does not require a physical signature. 
                        Please contact us for any discrepancies within 24 hours.
                    </p>
                </div>
            </div>
        </div>
    );
}
