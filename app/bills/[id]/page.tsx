"use client";

import React, { useState, useEffect, use } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatPacksAndBottles, parsePack } from "@/lib/stock-utils";
import { formatIST } from "@/lib/dateUtils";
// Note: Client Component cannot import dbConnect directly if we were calling it? 
import { useWarehouse } from "@/components/WarehouseContext";

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { activeWarehouse } = useWarehouse();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bill, setBill] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setBill(null);
        
        fetch("/api/bills")
            .then(res => res.json())
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((bills: any[]) => {
                const found = (bills || []).find(b => b._id === id);
                if (found) setBill(found);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    }, [id, activeWarehouse?.id]);

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

            <div className="bg-card p-8 md:p-12 rounded-2xl shadow-erp-card border border-border print:shadow-none print:border-none print:p-0">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-border pb-10">
                    <div className="flex flex-col gap-1">
                        <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md w-fit text-xs font-bold tracking-widest mb-4">OFFICIAL INVOICE</div>
                        <h1 className="text-3xl font-black text-foreground leading-tight">INVOICE <span className="text-primary">#{bill._id.slice(-6).toUpperCase()}</span></h1>
                        <p className="text-muted-foreground font-medium">Generated on {formatIST(bill.generatedAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                    <div className="md:text-right flex flex-col gap-1">
                        <h2 className="font-black text-foreground text-2xl uppercase tracking-tighter">{bill.warehouseId?.name || "WMS CORP"}</h2>
                        <p className="text-muted-foreground text-sm leading-relaxed max-w-[200px] md:ml-auto">
                            {bill.warehouseId?.location || "Main Warehouse Facility"}<br />
                            Inventory Management System
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 bg-muted/50 p-6 rounded-2xl border border-border">
                    <div>
                        <p className="text-[10px] uppercase font-black text-primary tracking-[0.2em] mb-3">Customer / Delivery Partner</p>
                        <h3 className="font-black text-foreground text-2xl mb-1">{bill.tripId?.vehicleId?.driverName || "N/A"}</h3>
                        <p className="text-muted-foreground font-bold flex items-center gap-2">
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-black ring-1 ring-primary/20">VEHICLE {bill.tripId?.vehicleId?.number || "N/A"}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            Trip Ref #{bill.tripId?._id.slice(-6).toUpperCase()}
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[10px] uppercase font-black text-primary tracking-[0.2em] mb-3">Payment Summary</p>
                        <p className="text-3xl font-black text-foreground">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
                        {(bill.tripId?.balanceAmount || 0) > 0.01 ? (
                            <p className="text-rose-600 font-black text-xs uppercase tracking-wider mt-1 flex items-center md:justify-end gap-1">
                                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                                Balance Pending ₹{(bill.tripId.balanceAmount || 0).toLocaleString('en-IN')}
                            </p>
                        ) : (
                            <p className="text-emerald-700 font-black text-xs uppercase tracking-wider mt-1 flex items-center md:justify-end gap-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                Payment Settled
                            </p>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-12 min-w-[800px]">
                        <thead>
                            <tr className="border-b-2 border-primary text-[10px] uppercase font-black text-foreground tracking-widest bg-muted/50">
                                <th className="px-3 py-4 text-left">Description</th>
                                <th className="px-3 py-4 text-center">Type</th>
                                <th className="px-3 py-4 text-right">Qty (P.B)</th>
                                <th className="px-3 py-4 text-right">Price/P</th>
                                <th className="px-3 py-4 text-right">Row Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {bill.items && bill.items.length > 0 ? (
                                bill.items.map((item: any, idx: number) => {
                                    const schemeSlabs = item.schemes && item.schemes.length > 0 ? item.schemes : [];
                                    const hasLegacyScheme = !item.schemes && item.schemeQty > 0;
                                    const totalSchemeRows = schemeSlabs.length + (hasLegacyScheme ? 1 : 0);

                                    return (
                                        <React.Fragment key={`group-${idx}`}>
                                            <tr key={`bill-item-${idx}-normal`} className="group hover:bg-muted/50">
                                                <td className="px-3 py-4 border-b border-border" rowSpan={1 + totalSchemeRows}>
                                                    <div className="font-black text-foreground text-base leading-tight">{item.pack} - {item.flavour}</div>
                                                </td>
                                                <td className="px-3 py-4 text-center border-b border-border">
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground px-1.5 py-0.5 bg-muted rounded">Normal</span>
                                                </td>
                                                <td className="px-3 py-4 text-right font-bold text-foreground">{formatPacksAndBottles(item.normalQty, item.bottlesPerPack, true)}</td>
                                                <td className="px-3 py-4 text-right font-bold text-muted-foreground">₹{item.normalPrice.toLocaleString('en-IN')}</td>
                                                <td className="px-3 py-4 text-right font-black text-foreground">₹{((item.normalQty / item.bottlesPerPack) * item.normalPrice).toLocaleString('en-IN')}</td>
                                            </tr>

                                            {/* Render each scheme slab */}
                                            {schemeSlabs.map((slab: any, sIdx: number) => (
                                                <tr key={`bill-item-${idx}-scheme-${sIdx}`} className="bg-primary/5 group hover:bg-primary/10">
                                                    <td className="px-3 py-4 text-center border-b border-primary/10">
                                                        <span className="text-[10px] font-black uppercase text-primary px-1.5 py-0.5 bg-primary/10 rounded">Scheme</span>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-primary">{formatPacksAndBottles(slab.qty, item.bottlesPerPack, true)}</td>
                                                    <td className="px-3 py-4 text-right font-bold text-primary">₹{(slab.price).toLocaleString('en-IN')}</td>
                                                    <td className="px-3 py-4 text-right font-black text-primary italic">₹{((slab.qty / item.bottlesPerPack) * slab.price).toLocaleString('en-IN')}</td>
                                                </tr>
                                            ))}

                                            {/* Legacy Fallback for older bills */}
                                            {hasLegacyScheme && (
                                                <tr key={`bill-item-${idx}-scheme-legacy`} className="bg-primary/5 group hover:bg-primary/10">
                                                    <td className="px-3 py-4 text-center border-b border-primary/10">
                                                        <span className="text-[10px] font-black uppercase text-primary px-1.5 py-0.5 bg-primary/10 rounded">Scheme</span>
                                                    </td>
                                                    <td className="px-3 py-4 text-right font-bold text-primary">{formatPacksAndBottles(item.schemeQty, item.bottlesPerPack, true)}</td>
                                                    <td className="px-3 py-4 text-right font-bold text-primary">₹{item.schemePrice.toLocaleString('en-IN')}</td>
                                                    <td className="px-3 py-4 text-right font-black text-primary italic">₹{((item.schemeQty / item.bottlesPerPack) * item.schemePrice).toLocaleString('en-IN')}</td>
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
                                            <td className="px-4 py-6 font-black text-black text-lg">
                                                {item.productId ? `${item.productId.pack} - ${item.productId.flavour}` : "Product"}
                                            </td>
                                            <td className="px-4 py-6 text-right font-black text-black text-lg">{sold}</td>
                                            <td className="px-4 py-6 text-right font-black text-gray-700 text-lg">₹{price.toLocaleString('en-IN')}</td>
                                            <td className="px-4 py-6 text-right font-black text-black text-lg">₹{((sold / (item.productId?.bottlesPerPack || parsePack(item.productId?.pack, item.productId?.name || ""))) * price).toLocaleString('en-IN')}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-10 mt-12">
                    {/* Left Column: Payment Details Block */}
                    <div className="space-y-4 bg-muted/50 p-6 rounded-2xl border border-border print:bg-transparent print:border-none print:p-0">
                        <h4 className="text-xs font-black text-foreground uppercase tracking-widest border-b border-border pb-3 flex items-center gap-2 print:border-black">
                            <span>💰</span> Payment Details
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <span>UPI Amount</span>
                                <span className="text-gray-900">
                                    {bill.tripId?.status === "VERIFIED" 
                                        ? `₹${(bill.tripId.upiAmount || 0).toLocaleString('en-IN')}` 
                                        : "₹0 (Not Verified)"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <span>Cash Amount</span>
                                <span className="text-gray-900">
                                    {bill.tripId?.status === "VERIFIED" 
                                        ? `₹${(bill.tripId.cashAmount || 0).toLocaleString('en-IN')}` 
                                        : "₹0 (Not Verified)"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                <span>Expenses</span>
                                <span className="text-gray-900">
                                    {bill.tripId?.status === "VERIFIED" 
                                        ? `₹${(bill.tripId.expensesAmount || 0).toLocaleString('en-IN')}` 
                                        : "₹0 (Not Verified)"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-gray-200/60 text-xs font-black text-emerald-700 uppercase tracking-widest print:border-black">
                                <span>Total Received</span>
                                <span>
                                    {bill.tripId?.status === "VERIFIED" 
                                        ? `₹${(bill.tripId.receivedTotal || 0).toLocaleString('en-IN')}` 
                                        : "₹0 (Not Verified)"}
                                </span>
                            </div>
                            {/* Balance Amount — always shown in red */}
                            <div className={`flex justify-between items-center pt-3 border-t border-gray-200/60 text-xs font-black uppercase tracking-widest print:border-black ${
                                (bill.tripId?.balanceAmount || 0) > 0.01 ? 'text-rose-600' : 'text-emerald-700'
                            }`}>
                                <span>Balance Amount</span>
                                <span>
                                    {bill.tripId?.status === "VERIFIED"
                                        ? ((bill.tripId?.balanceAmount || 0) > 0.01
                                            ? `₹${(bill.tripId.balanceAmount).toLocaleString('en-IN')}`
                                            : '₹0 (Paid)')
                                        : '—'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Invoice Summary (Net Total) */}
                    <div className="space-y-6 md:pl-8 flex flex-col justify-between">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                <span>Gross Value (Excl. Disc)</span>
                                <span className="text-foreground">₹{(bill.totalAmount + (bill.items?.reduce((acc: number, item: any) => acc + (item.discount || 0), 0) || 0)).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black text-primary uppercase tracking-widest">
                                <span>Total Scheme Discount</span>
                                <span>- ₹{(bill.items?.reduce((acc: number, item: any) => acc + (item.discount || 0), 0) || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-6 border-t border-border mt-auto print:border-black">
                            <span className="text-lg font-black text-foreground uppercase tracking-tighter">Net Total Amount</span>
                            <span className="text-3xl font-black text-primary">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
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
