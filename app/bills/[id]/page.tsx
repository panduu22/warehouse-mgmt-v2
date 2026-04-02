"use client";

import React, { useState, useEffect, use } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatPacksAndBottles } from "@/lib/stock-utils";
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
                        <p className="text-[10px] uppercase font-black text-ruby-700 tracking-[0.2em] mb-3">Customer / Delivery Partner</p>
                        <h3 className="font-black text-black text-2xl mb-1">{bill.tripId?.vehicleId?.driverName || "N/A"}</h3>
                        <p className="text-gray-700 font-bold flex items-center gap-2">
                            <span className="bg-ruby-50 text-ruby-700 px-2 py-0.5 rounded text-xs font-black ring-1 ring-ruby-200">VEHICLE {bill.tripId?.vehicleId?.number || "N/A"}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            Trip Ref #{bill.tripId?._id.slice(-6).toUpperCase()}
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[10px] uppercase font-black text-ruby-700 tracking-[0.2em] mb-3">Payment Summary</p>
                        <p className="text-3xl font-black text-black">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                        <p className="text-emerald-700 font-black text-xs uppercase tracking-wider mt-1 flex items-center md:justify-end gap-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Payment Settled
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-12">
                        <thead>
                            <tr className="border-b-4 border-black text-[10px] uppercase font-black text-black tracking-widest bg-gray-50/50">
                                <th className="px-3 py-4 text-left">Description</th>
                                <th className="px-3 py-4 text-center">Type</th>
                                <th className="px-3 py-4 text-right">Qty (P.B)</th>
                                <th className="px-3 py-4 text-right">Price/P</th>
                                <th className="px-3 py-4 text-right">Row Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bill.items && bill.items.length > 0 ? (
                                bill.items.map((item: any, idx: number) => {
                                    const schemeSlabs = item.schemes && item.schemes.length > 0 ? item.schemes : [];
                                    const hasLegacyScheme = !item.schemes && item.schemeQty > 0;
                                    const totalSchemeRows = schemeSlabs.length + (hasLegacyScheme ? 1 : 0);

                                    return (
                                        <React.Fragment key={`group-${idx}`}>
                                            <tr key={`bill-item-${idx}-normal`} className="group hover:bg-gray-50/50">
                                                <td className="px-3 py-4 border-b border-gray-100" rowSpan={1 + totalSchemeRows}>
                                                    <div className="font-black text-black text-base leading-tight">{item.name}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-ruby-700 font-bold text-[10px] uppercase">{item.flavour}</span>
                                                        <span className="text-gray-300 text-[10px]">•</span>
                                                        <span className="text-gray-500 font-bold text-[10px] uppercase">{item.pack}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-center border-b border-gray-50">
                                                    <span className="text-[10px] font-black uppercase text-gray-500 px-1.5 py-0.5 bg-gray-100 rounded">Normal</span>
                                                </td>
                                                <td className="px-3 py-4 text-right font-bold text-gray-900">{formatPacksAndBottles(item.normalQty, item.bottlesPerPack, true)}</td>
                                                <td className="px-3 py-4 text-right font-bold text-gray-600">₹{item.normalPrice.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-4 text-right font-black text-black">₹{((item.normalQty / item.bottlesPerPack) * item.normalPrice).toLocaleString('en-IN')}</td>
                                            </tr>

                                            {/* Render each scheme slab */}
                                            {schemeSlabs.map((slab: any, sIdx: number) => (
                                                <tr key={`bill-item-${idx}-scheme-${sIdx}`} className="bg-ruby-50/20 group">
                                                    <td className="px-3 py-4 text-center border-b border-ruby-100/50">
                                                        <span className="text-[10px] font-black uppercase text-ruby-600 px-1.5 py-0.5 bg-ruby-100/50 rounded">Scheme</span>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-ruby-800">{formatPacksAndBottles(slab.qty, item.bottlesPerPack, true)}</td>
                                                    <td className="px-3 py-4 text-right font-bold text-ruby-700">₹{(slab.price).toLocaleString('en-IN')}</td>
                                                    <td className="px-3 py-4 text-right font-black text-ruby-900 italic">₹{((slab.qty / item.bottlesPerPack) * slab.price).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}

                                            {/* Legacy Fallback for older bills */}
                                            {hasLegacyScheme && (
                                                <tr key={`bill-item-${idx}-scheme-legacy`} className="bg-ruby-50/20 group">
                                                    <td className="px-3 py-4 text-center border-b border-ruby-100/50">
                                                        <span className="text-[10px] font-black uppercase text-ruby-600 px-1.5 py-0.5 bg-ruby-100/50 rounded">Scheme</span>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-ruby-800">{formatPacksAndBottles(item.schemeQty, item.bottlesPerPack, true)}</td>
                                                    <td className="px-3 py-4 text-right font-bold text-ruby-700">₹{item.schemePrice.toLocaleString('en-IN')}</td>
                                                    <td className="px-3 py-4 text-right font-black text-ruby-900 italic">₹{((item.schemeQty / item.bottlesPerPack) * item.schemePrice).toLocaleString('en-IN')}</td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                bill.tripId?.loadedItems && bill.tripId.loadedItems.map((item: any, idx: number) => {
                                    const sold = item.qtyLoaded - (item.qtyReturned || 0);
                                    if (sold <= 0) return null;
                                    const price = item.productId?.price || item.productId?.salePrice || 0;
                                    return (
                                        <tr key={`fallback-${idx}`} className="hover:bg-gray-50/30">
                                            <td className="px-4 py-6 font-black text-black text-lg">{item.productId?.name || "Product"}</td>
                                            <td className="px-4 py-6 text-right font-black text-black text-lg">{sold}</td>
                                            <td className="px-4 py-6 text-right font-black text-gray-700 text-lg">₹{price.toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-6 text-right font-black text-black text-lg">₹{(sold * price).toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end border-t-4 border-black pt-10 mt-12">
                    <div className="w-full md:w-80 space-y-6">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <span>Gross Value (Excl. Disc)</span>
                                <span className="text-gray-900">₹{(bill.totalAmount + (bill.items?.reduce((acc: number, item: any) => acc + (item.discount || 0), 0) || 0)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-ruby-600 uppercase tracking-widest">
                                <span>Total Scheme Discount</span>
                                <span>- ₹{(bill.items?.reduce((acc: number, item: any) => acc + (item.discount || 0), 0) || 0).toLocaleString('en-IN')}</span>
                            </div>
                        <div className="flex justify-between items-center pt-8 border-t border-gray-100">
                            <span className="text-xl font-black text-black uppercase tracking-tighter">Net Total Amount</span>
                            <span className="text-4xl font-black text-ruby-700">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
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
