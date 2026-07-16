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

    const schemeDiscountTotal = bill.items?.reduce((acc: number, item: any) => acc + (item.discount || 0), 0) || 0;

    const receiptItems: { descriptionPack: string; descriptionDetail: string; qty: string; rate: number; amount: number }[] = [];

    if (bill.items && bill.items.length > 0) {
        bill.items.forEach((item: any) => {
            if (item.normalQty > 0) {
                receiptItems.push({
                    descriptionPack: item.pack,
                    descriptionDetail: item.flavour,
                    qty: formatPacksAndBottles(item.normalQty, item.bottlesPerPack, true),
                    rate: item.normalPrice,
                    amount: (item.normalQty / item.bottlesPerPack) * item.normalPrice
                });
            }
            
            const schemeSlabs = item.schemes && item.schemes.length > 0 ? item.schemes : [];
            schemeSlabs.forEach((slab: any) => {
                if (slab.qty > 0) {
                    receiptItems.push({
                        descriptionPack: item.pack,
                        descriptionDetail: `${item.flavour} (Scheme)`,
                        qty: formatPacksAndBottles(slab.qty, item.bottlesPerPack, true),
                        rate: slab.price,
                        amount: (slab.qty / item.bottlesPerPack) * slab.price
                    });
                }
            });
            
            const hasLegacyScheme = !item.schemes && item.schemeQty > 0;
            if (hasLegacyScheme) {
                receiptItems.push({
                    descriptionPack: item.pack,
                    descriptionDetail: `${item.flavour} (Scheme)`,
                    qty: formatPacksAndBottles(item.schemeQty, item.bottlesPerPack, true),
                    rate: item.schemePrice,
                    amount: (item.schemeQty / item.bottlesPerPack) * item.schemePrice
                });
            }
        });
    } else if (bill.tripId?.loadedItems) {
        bill.tripId.loadedItems.forEach((item: any) => {
            const sold = item.qtyLoaded - (item.qtyReturned || 0);
            if (sold > 0) {
                const price = item.productId?.price || item.productId?.salePrice || 0;
                const bpp = item.productId?.bottlesPerPack || parsePack(item.productId?.pack, item.productId?.name || "");
                receiptItems.push({
                    descriptionPack: item.productId?.pack || "Product Pack",
                    descriptionDetail: item.productId?.flavour || "Product Flavour",
                    qty: String(sold),
                    rate: price,
                    amount: (sold / bpp) * price
                });
            }
        });
    }

    const formatDateReceipt = (dateInput: any) => {
        try {
            const d = new Date(dateInput);
            const options: Intl.DateTimeFormatOptions = {
                timeZone: 'Asia/Kolkata',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };
            const formatter = new Intl.DateTimeFormat('en-GB', options);
            const parts = formatter.formatToParts(d);
            const day = parts.find(p => p.type === 'day')?.value;
            const month = parts.find(p => p.type === 'month')?.value;
            const year = parts.find(p => p.type === 'year')?.value;
            const hour = parts.find(p => p.type === 'hour')?.value;
            const minute = parts.find(p => p.type === 'minute')?.value;
            const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value?.toUpperCase() || 'PM';
            return `${day}/${month}/${year} ${hour}:${minute} ${dayPeriod}`;
        } catch {
            return "N/A";
        }
    };

    return (
        <div className="print-receipt-parent">
            <style>{`@media screen { #thermal-print-root { display: none !important; } }`}</style>


            {/* Screen layout */}
            <div className="screen-only-layout print:hidden">
                <div className="flex justify-between items-center mb-8">
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

                <div className="print-receipt-container bg-card p-8 md:p-12 rounded-2xl shadow-erp-card border border-border print:shadow-none print:border-none print:p-0">
                    <div className="print-receipt-header flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-border pb-10">
                        <div className="flex flex-col gap-1">
                            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-md w-fit text-xs font-bold tracking-widest mb-4 print:hidden">OFFICIAL INVOICE</div>
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

                    <div className="print-section-grid grid grid-cols-1 md:grid-cols-2 gap-12 mb-12 bg-muted/50 p-6 rounded-2xl border border-border">
                        <div>
                            <p className="text-[10px] uppercase font-black text-primary tracking-[0.2em] mb-3">Customer / Delivery Partner</p>
                            <h3 className="font-black text-foreground text-2xl mb-1">{bill.tripId?.vehicleId?.driverName || "N/A"}</h3>
                            <p className="text-muted-foreground font-bold flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-black ring-1 ring-primary/20">VEHICLE {bill.tripId?.vehicleId?.number || "N/A"}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full print:hidden"></span>
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

                    <div className="print-table-wrapper overflow-x-auto">
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

                    <div className="print-summary-grid grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-border pt-10 mt-12">
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
                            <div className="print-net-total flex justify-between items-center pt-6 border-t border-border mt-auto print:border-black">
                                <span className="text-lg font-black text-foreground uppercase tracking-tighter">Net Total Amount</span>
                                <span className="text-3xl font-black text-primary">₹{bill.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="print-stamp mt-20 flex flex-col items-center gap-4 text-center">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Signature / Stamp</p>
                        <div className="w-48 h-px bg-gray-200"></div>
                        <p className="text-[10px] text-gray-400 font-medium max-w-sm">
                            This is a computer generated invoice and does not require a physical signature.
                            Please contact us for any discrepancies within 24 hours.
                        </p>
                    </div>
                </div>
            </div>

            {/* Dedicated Print-Only POS Receipt Component */}
            <div id="thermal-print-root">
                {/* Header */}
                <div className="text-center flex flex-col items-center justify-center gap-0.5">
                    <div className="text-[14px] font-bold uppercase tracking-wider">{bill.warehouseId?.name || "ADITHYATECH WAREHOUSE ERP"}</div>
                    <div className="text-[11px] leading-tight text-center">{bill.warehouseId?.address || bill.warehouseId?.location || "Main Road, Rayachoty, Kadapa, Andhra Pradesh - 516269"}</div>
                    <div className="text-[11px]">GSTIN: {bill.warehouseId?.gstNo || "37ABCDE1234F1Z5"}</div>
                    <div className="text-[11px]">Ph: {bill.warehouseId?.phone || "+91 98765 43210"}</div>
                </div>

                <hr className="receipt-sep" />

                <div className="text-center font-bold text-sm tracking-widest my-1">INVOICE</div>

                {/* Invoice Details */}
                <div className="space-y-0.5 text-[11px] font-mono">
                    <div className="flex">
                        <span className="w-28 flex-shrink-0">Invoice No</span>
                        <span className="flex-grow">: INV/{bill._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex">
                        <span className="w-28 flex-shrink-0">Date & Time</span>
                        <span className="flex-grow">: {formatDateReceipt(bill.generatedAt)}</span>
                    </div>
                    <div className="flex">
                        <span className="w-28 flex-shrink-0">Customer</span>
                        <span className="flex-grow">: {bill.tripId?.vehicleId?.driverName || "godown sale"}</span>
                    </div>
                    <div className="flex">
                        <span className="w-28 flex-shrink-0">Vehicle No</span>
                        <span className="flex-grow">: {bill.tripId?.vehicleId?.number || "AP39 XX 1234"}</span>
                    </div>
                </div>

                <hr className="receipt-sep" />

                {/* Items Table */}
                <table className="w-full text-[11px] border-collapse font-mono" style={{ tableLayout: "fixed", width: "100%" }}>
                    <colgroup>
                        <col style={{ width: "52%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "17%" }} />
                        <col style={{ width: "17%" }} />
                    </colgroup>
                    <thead>
                        <tr className="border-b border-dashed border-black">
                            <th className="text-left py-1">ITEM</th>
                            <th className="text-center py-1">QTY</th>
                            <th className="text-right py-1">RATE</th>
                            <th className="text-right py-1">AMT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receiptItems.map((item, idx) => (
                            <tr key={`receipt-item-${idx}`}>
                                <td className="py-1 text-left align-top" style={{ wordBreak: "break-word", overflow: "hidden" }}>
                                    <div style={{ fontWeight: "bold" }}>{item.descriptionPack}</div>
                                    <div>{item.descriptionDetail}</div>
                                </td>
                                <td className="py-1 text-center align-top">{item.qty}</td>
                                <td className="py-1 text-right align-top">&#8377;{item.rate.toFixed(2)}</td>
                                <td className="py-1 text-right align-top" style={{ fontWeight: "bold" }}>&#8377;{item.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="space-y-1 text-[11px] font-mono mt-2">
                    <div className="flex justify-between">
                        <span>SUBTOTAL</span>
                        <span>₹{(bill.totalAmount + schemeDiscountTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SCHEME DISCOUNT</span>
                        <span>₹{schemeDiscountTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GROSS VALUE (EXCL. DISC.)</span>
                        <span>₹{bill.totalAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t border-dashed border-black my-1" />
                    
                    <div className="flex justify-between text-xs font-bold pt-0.5">
                        <span>TOTAL RECEIVED</span>
                        <span className="text-sm font-black">₹{bill.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>BALANCE AMOUNT</span>
                        <span>₹{(bill.tripId?.status === "VERIFIED" ? (bill.tripId.balanceAmount || 0) : 0).toFixed(2)}</span>
                    </div>
                </div>

                <hr className="receipt-sep" />

                {/* Payment Details */}
                <div className="space-y-0.5 text-[11px] font-mono">
                    <div className="font-bold pb-1 flex items-center gap-1">💳 PAYMENT DETAILS</div>
                    <div className="flex justify-between">
                        <span>UPI AMOUNT</span>
                        <span>₹{(bill.tripId?.status === "VERIFIED" ? (bill.tripId.upiAmount || 0) : 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>CASH AMOUNT</span>
                        <span>₹{(bill.tripId?.status === "VERIFIED" ? (bill.tripId.cashAmount || 0) : 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dotted border-gray-300 pt-0.5">
                        <span>TOTAL RECEIVED</span>
                        <span>₹{(bill.tripId?.status === "VERIFIED" ? (bill.tripId.receivedTotal || 0) : 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>BALANCE</span>
                        <span>₹{(bill.tripId?.status === "VERIFIED" ? (bill.tripId.balanceAmount || 0) : 0).toFixed(2)}</span>
                    </div>
                </div>

                <hr className="receipt-sep" />

                {/* Footer */}
                <div className="text-center space-y-1 font-mono">
                    <div style={{ fontFamily: "cursive", fontSize: "20px", fontWeight: "bold" }}>Thank You!</div>
                    <div className="text-[11px] font-bold">Visit Again</div>
                    <div className="text-[11px] tracking-[0.3em]">★★★</div>
                </div>
            </div>
        </div>
    );
}
